import { corsHeaders, jsonResponse, methodNotAllowed } from "../_shared/http.ts";
import {
  authenticatedUser,
  DONATION_CURRENCY,
  hmacHex,
  newReference,
  paystackRequest,
  requiredEnv,
  safeCallbackUrl,
  serviceClient,
  validAmountKes,
  validEmail,
} from "../_shared/donations.ts";

type PaystackInitializeResponse = {
  status?: boolean;
  data?: { authorization_url?: string; access_code?: string; reference?: string };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return methodNotAllowed();

  let reference: string | null = null;
  try {
    const contentLength = Number(req.headers.get("content-length") || 0);
    if (contentLength > 8_192) return jsonResponse({ error: "Request is too large." }, 413);
    const body = await req.json().catch(() => null) as { amountKes?: unknown; email?: unknown; appVersion?: unknown } | null;
    if (!body || !validAmountKes(body.amountKes)) return jsonResponse({ error: "Enter a whole amount from KES 3 to KES 10,000,000." }, 400);

    const user = await authenticatedUser(req);
    const requestedEmail = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const email = user?.email?.trim().toLowerCase() || requestedEmail;
    if (!validEmail(email)) return jsonResponse({ error: "Enter a valid email address for the Paystack receipt." }, 400);

    const secret = requiredEnv("PAYSTACK_SECRET_KEY");
    const rateIdentity = user?.id ? `user:${user.id}` : `email:${email}`;
    const rateKey = await hmacHex(secret, rateIdentity);
    const windowBucket = Math.floor(Date.now() / 600_000);
    const db = serviceClient();
    const { data: allowed, error: rateError } = await db.rpc("consume_donation_rate_limit", {
      p_rate_key: rateKey,
      p_window_bucket: windowBucket,
      p_limit: 10,
    });
    if (rateError) throw new Error("rate_limit_unavailable");
    if (!allowed) return jsonResponse({ error: "Too many payment attempts. Please wait a few minutes and try again." }, 429);

    reference = newReference();
    const callbackUrl = safeCallbackUrl();
    const appVersion = typeof body.appVersion === "string" ? body.appVersion.slice(0, 64) : "unknown";
    const metadata = {
      type: "voluntary_donation",
      source: "advent_pro",
      amount: body.amountKes,
      currency: DONATION_CURRENCY,
      userId: user?.id ?? null,
      anonymous: !user,
      appVersion,
    };

    const { error: insertError } = await db.from("donations").insert({
      user_id: user?.id ?? null,
      donor_email: email,
      paystack_reference: reference,
      amount: body.amountKes,
      currency: DONATION_CURRENCY,
      status: "pending",
      metadata,
    });
    if (insertError) throw new Error("donation_record_failed");

    const paystackResponse = await paystackRequest("/transaction/initialize", {
      method: "POST",
      body: JSON.stringify({
        email,
        amount: String(body.amountKes * 100),
        currency: DONATION_CURRENCY,
        reference,
        callback_url: callbackUrl,
        metadata: JSON.stringify(metadata),
      }),
    });
    const paystack = await paystackResponse.json().catch(() => null) as PaystackInitializeResponse | null;
    const authorizationUrl = paystack?.data?.authorization_url;
    const returnedReference = paystack?.data?.reference;
    let checkoutHost = "";
    try { checkoutHost = authorizationUrl ? new URL(authorizationUrl).hostname : ""; } catch { checkoutHost = ""; }
    if (!paystackResponse.ok || !paystack?.status || returnedReference !== reference || checkoutHost !== "checkout.paystack.com") {
      await db.from("donations").update({ status: "failed", updated_at: new Date().toISOString(), last_error_code: "initialize_failed" }).eq("paystack_reference", reference);
      return jsonResponse({ error: "Paystack could not start the payment. Please try again." }, 502);
    }

    return jsonResponse({ authorizationUrl, reference, callbackUrl });
  } catch (error) {
    console.error("Donation initialization failed", { reference, code: error instanceof Error ? error.message : "unknown" });
    return jsonResponse({ error: "Unable to start the secure payment. Please try again." }, 500);
  }
});
