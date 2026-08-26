import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const migration = read("supabase/migrations/017_production_notifications.sql");
const client = read("src/features/notifications/notificationService.ts");
const context = read("src/context/NotificationsContext.tsx");
const sender = read("supabase/functions/_shared/notifications.ts");
const webhook = read("supabase/functions/paystack-webhook/index.ts");
const verification = read("supabase/functions/verify-donation/index.ts");

test("Firebase client config matches the Android application ID", () => {
  const app = JSON.parse(read("app.json"));
  const google = JSON.parse(read("google-services.json"));
  const packages = google.client.map((entry) => entry.client_info.android_client_info.package_name);
  assert.ok(packages.includes(app.expo.android.package));
  assert.equal(app.expo.android.googleServicesFile, "./google-services.json");
  assert.ok(app.expo.plugins.some((entry) => entry === "./plugins/with-google-services-version"));
  assert.doesNotMatch(read("google-services.json"), /private_key|service_account/i);
});

test("push tokens and inbox data are protected by RLS", () => {
  for (const table of ["notification_preferences", "push_devices", "notifications", "notification_reads", "notification_delivery_attempts"]) {
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`, "i"));
  }
  assert.doesNotMatch(migration, /grant\s+insert\s+on\s+public\.notifications\s+to\s+(anon|authenticated)/i);
  assert.match(migration, /push_devices_owner_all[\s\S]*user_id = auth\.uid\(\)/i);
});

test("daily verse uses one repeating local-time schedule at 6 AM", () => {
  assert.match(client, /getAllScheduledNotificationsAsync/);
  assert.match(client, /SchedulableTriggerInputTypes\.DAILY/);
  assert.match(client, /hour:\s*6/);
  assert.match(client, /minute:\s*0/);
  assert.match(client, /notificationKey:\s*DAILY_NOTIFICATION_KEY/);
});

test("new content and engagement are idempotently limited to one event per day", () => {
  assert.match(migration, /'new-content:'\s*\|\|\s*to_char/g);
  assert.match(read("supabase/functions/dispatch-notifications/index.ts"), /new-content:\$\{new Date\(\)\.toISOString\(\)\.slice\(0, 10\)\}/);
  assert.match(read("supabase/functions/dispatch-notifications/index.ts"), /engagement:\$\{recipientUserId\}:\$\{new Date\(\)\.toISOString\(\)\.slice\(0, 10\)\}/);
  assert.match(migration, /dedupe_key text not null unique/);
});

test("push sending requires enhanced security and cleans invalid tokens", () => {
  assert.match(sender, /requiredEnv\("EXPO_ACCESS_TOKEN"\)/);
  assert.match(sender, /DeviceNotRegistered/);
  assert.match(sender, /notification_delivery_attempts/);
  assert.match(sender, /getReceipts/);
});

test("notification navigation only accepts internal routes and the official Play listing", () => {
  assert.match(client, /safeNotificationRoute/);
  assert.match(client, /url\.hostname === "play\.google\.com"/);
  assert.match(client, /url\.searchParams\.get\("id"\) === "com\.adventpro"/);
  assert.match(context, /markNotificationRead\(notificationId\)/);
});

test("both Paystack success paths create one private, idempotent receipt", () => {
  for (const source of [webhook, verification]) {
    assert.match(source, /kind:\s*"donation_receipt"/);
    assert.match(source, /recipientUserId:\s*donation\.user_id/);
    assert.match(source, /dedupeKey:\s*`donation-receipt:\$\{donation\.id\}`/);
    assert.doesNotMatch(source, /body:\s*[^\n]*donation\.amount/);
  }
});
