# Voluntary donation Edge Functions

These functions keep all privileged Paystack operations outside the Expo app:

- `initialize-donation` validates the KES amount/email, applies an atomic rate limit, creates a unique pending record, and initializes Paystack.
- `verify-donation` fetches the stored expectation and compares Paystack's status, reference, currency, and amount before marking success.
- `paystack-webhook` verifies the raw-body HMAC-SHA512 signature and applies an idempotent `charge.success` update.

## Deployment

Apply migrations `013_voluntary_donations.sql` and `014_senior_admin_donation_reporting.sql`, then set server-side secrets and deploy:

```sh
supabase secrets set PAYSTACK_SECRET_KEY=... DONATION_CALLBACK_URL=https://song-pied-eight.vercel.app/payments/paystack/callback
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

## Production notifications

Apply `017_production_notifications.sql` before deploying the notification-aware donation functions. The migration creates:

- private device-token and preference tables protected by row-level security;
- a durable notification inbox with per-user read state;
- idempotent delivery and receipt ledgers;
- one-per-day new-study/video aggregation;
- immediate reply events;
- Google Play release announcements that are created only after `is_live_in_store` is explicitly set;
- server-only donation receipt notifications.

Set high-entropy server secrets. `EXPO_ACCESS_TOKEN` is the enhanced-push-security token from the EAS dashboard; it is not a Firebase key. Keep both values out of mobile/web environment variables:

```sh
supabase secrets set EXPO_ACCESS_TOKEN=... NOTIFICATION_CRON_SECRET=...
supabase functions deploy dispatch-notifications --no-verify-jwt
supabase functions deploy verify-donation
supabase functions deploy paystack-webhook --no-verify-jwt
```

Schedule an authenticated POST to `dispatch-notifications` every minute from Supabase Cron, passing the secret only as the `x-cron-secret` header. That worker dispatches new database events, retries interrupted sends, checks Expo delivery receipts after 15 minutes, and disables tokens reported as `DeviceNotRegistered`.

The publisher API also accepts an authenticated admin request. It requires `content.publish`, `media.manage`, or `users.manage`; every request must provide an idempotency key. For `new_content` and per-user `engagement_digest`, the function replaces the caller's key with a server-generated daily key so repeated calls cannot notify more than once per day.

To announce a Play Store release, insert it only after the production listing is live:

```sql
insert into public.app_releases(
  version_code, version_name, release_notes, minimum_supported_code,
  is_live_in_store, published_at
) values (
  2, '1.3.0', 'Faster reading and a new notification inbox.', 1,
  true, now()
);
```

Android remote pushes also require an FCM v1 service-account credential in EAS Credentials. `google-services.json` configures the Android client but is not a server credential. Test remote notifications with an EAS development/release build; Android Expo Go does not provide remote push support.
