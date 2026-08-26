import { corsHeaders, jsonResponse, methodNotAllowed } from "../_shared/http.ts";
import { authenticatedUser, DonationRow, paystackRequest, serviceClient, validReference } from "../_shared/donations.ts";
import { createAndDispatchNotification } from "../_shared/notifications.ts";

type PaystackVerification = {
  status?: boolean;
  data?: {
    id?: number | string;
    status?: string;
    reference?: string;
    amount?: number;
    currency?: string;
    channel?: string;
  };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return methodNotAllowed();

  try {
    const body = await req.json().catch(() => null) as { reference?: unknown } | null;
    if (!body || !validReference(body.reference)) return jsonResponse({ error: "Invalid donation reference." }, 400);
    const reference = body.reference;
    const db = serviceClient();
    const { data, error } = await db.from("donations")
      .select("id,user_id,paystack_reference,amount,currency,status")
      .eq("paystack_reference", reference)
      .maybeSingle();
    if (error || !data) return jsonResponse({ error: "Donation reference was not found." }, 404);
    const donation = data as DonationRow;
    const user = await authenticatedUser(req);
    if (donation.user_id && donation.user_id !== user?.id) return jsonResponse({ error: "Donation reference was not found." }, 404);
    if (donation.status === "successful") return jsonResponse({ status: "successful", reference });

    const response = await paystackRequest(`/transaction/verify/${encodeURIComponent(reference)}`);
    const result = await response.json().catch(() => null) as PaystackVerification | null;
    if (!response.ok || !result?.status || !result.data) return jsonResponse({ error: "We could not verify the payment yet. Please try again." }, 502);

    const transaction = result.data;
    const exactMatch = transaction.reference === reference
      && transaction.currency === donation.currency
      && transaction.amount === donation.amount * 100;
    if (!exactMatch) {
      await db.from("donations").update({ status: "failed", updated_at: new Date().toISOString(), last_error_code: "verification_mismatch" }).eq("id", donation.id).neq("status", "successful");
      console.warn("Donation verification mismatch", { reference });
      return jsonResponse({ error: "The payment details could not be verified." }, 409);
    }

    if (transaction.status !== "success") {
      const terminal = ["failed", "abandoned", "reversed"].includes(transaction.status ?? "");
      if (terminal) {
        await db.from("donations").update({ status: "failed", updated_at: new Date().toISOString(), last_error_code: `paystack_${transaction.status}` }).eq("id", donation.id).neq("status", "successful");
      }
      return jsonResponse({ status: terminal ? "failed" : "pending", reference });
    }

    const now = new Date().toISOString();
    const { error: updateError } = await db.from("donations").update({
      status: "successful",
      payment_channel: typeof transaction.channel === "string" ? transaction.channel.slice(0, 50) : null,
      paystack_transaction_id: transaction.id == null ? null : String(transaction.id),
      verified_at: now,
      updated_at: now,
      last_error_code: null,
    }).eq("id", donation.id).neq("status", "successful");
    if (updateError) throw new Error("donation_update_failed");
    if (donation.user_id) {
      try {
        await createAndDispatchNotification(db, {
          recipientUserId: donation.user_id,
          kind: "donation_receipt",
          title: "Thank you for supporting Advent Pro ❤️",
          body: "Your contribution has been received. May God bless you for helping make these resources available.",
          route: "/support",
          data: { donationId: donation.id },
          dedupeKey: `donation-receipt:${donation.id}`,
        });
      } catch (notificationError) {
        console.error("Donation notification dispatch failed", {
          code: notificationError instanceof Error ? notificationError.message : "unknown",
          donationId: donation.id,
        });
      }
    }
    return jsonResponse({ status: "successful", reference });
  } catch (error) {
    console.error("Donation verification failed", { code: error instanceof Error ? error.message : "unknown" });
    return jsonResponse({ error: "We could not verify the payment yet. Please try again." }, 500);
  }
});
