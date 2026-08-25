# Voluntary donation Edge Functions

These functions keep all privileged Paystack operations outside the Expo app:

- `initialize-donation` validates the KES amount/email, applies an atomic rate limit, creates a unique pending record, and initializes Paystack.
- `verify-donation` fetches the stored expectation and compares Paystack's status, reference, currency, and amount before marking success.
- `paystack-webhook` verifies the raw-body HMAC-SHA512 signature and applies an idempotent `charge.success` update.

## Deployment

Apply migrations `013_voluntary_donations.sql` and `014_senior_admin_donation_reporting.sql`, then set server-side secrets and deploy:

```sh
supabase secrets set PAYSTACK_SECRET_KEY=... DONATION_CALLBACK_URL=https://adventnurutech.xyz/payments/paystack/callback
supabase functions deploy initialize-donation
supabase functions deploy verify-donation
supabase functions deploy paystack-webhook --no-verify-jwt
```

Configure the Paystack dashboard webhook URL as:

```text
https://<project-ref>.supabase.co/functions/v1/paystack-webhook
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are supplied to deployed functions by Supabase. Never prefix the Paystack secret with `EXPO_PUBLIC_`, `NEXT_PUBLIC_`, or otherwise include it in the app build.

The HTTPS callback only needs to be a stable return address: the in-app WebView intercepts it and calls `verify-donation` before rendering success. It can be overridden with `DONATION_CALLBACK_URL` without changing the mobile app.
