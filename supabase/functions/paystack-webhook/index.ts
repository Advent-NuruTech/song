import { jsonResponse, methodNotAllowed } from "../_shared/http.ts";
import { DonationRow, requiredEnv, serviceClient, validReference } from "../_shared/donations.ts";

type PaystackEvent = {
  event?: string;
  data?: {
    id?: number | string;
    status?: string;
    reference?: string;
    amount?: number;
    currency?: string;
    channel?: string;
  };
};

function hexToBytes(hex: string) {
  if (!/^[a-fA-F0-9]{128}$/.test(hex)) return null;
  return new Uint8Array(hex.match(/.{2}/g)!.map((byte) => Number.parseInt(byte, 16)));
}

async function validSignature(rawBody: string, signature: string | null) {
  const bytes = signature ? hexToBytes(signature) : null;
  if (!bytes) return false;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(requiredEnv("PAYSTACK_SECRET_KEY")), { name: "HMAC", hash: "SHA-512" }, false, ["verify"]);
  return crypto.subtle.verify("HMAC", key, bytes, encoder.encode(rawBody));
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return methodNotAllowed();
  try {
    const rawBody = await req.text();
    if (rawBody.length > 1_000_000) return jsonResponse({ error: "Payload too large." }, 413);
    if (!await validSignature(rawBody, req.headers.get("x-paystack-signature"))) return jsonResponse({ error: "Invalid signature." }, 401);

    const payload = JSON.parse(rawBody) as PaystackEvent;
    if (payload.event !== "charge.success") return jsonResponse({ received: true });
    const transaction = payload.data;
    if (!transaction || transaction.status !== "success" || !validReference(transaction.reference)) return jsonResponse({ received: true });

    const db = serviceClient();
    const { data, error } = await db.from("donations")
      .select("id,user_id,paystack_reference,amount,currency,status")
      .eq("paystack_reference", transaction.reference)
      .maybeSingle();
    if (error) throw new Error("donation_lookup_failed");
    if (!data) return jsonResponse({ received: true });
    const donation = data as DonationRow;
    if (donation.status === "successful") return jsonResponse({ received: true });

    const exactMatch = transaction.reference === donation.paystack_reference
      && transaction.currency === donation.currency
      && transaction.amount === donation.amount * 100;
    if (!exactMatch) {
      console.warn("Signed webhook did not match donation", { reference: donation.paystack_reference });
      return jsonResponse({ received: true });
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
    return jsonResponse({ received: true });
  } catch (error) {
    console.error("Paystack webhook processing failed", { code: error instanceof Error ? error.message : "unknown" });
    return jsonResponse({ error: "Webhook processing failed." }, 500);
  }
});
