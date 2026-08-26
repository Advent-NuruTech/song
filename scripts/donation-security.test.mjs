import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { parseDonationAmount } from "../src/services/donations/validation.ts";
import { isSupportPromptContentRoute, supportMonthKey } from "../src/services/donations/supportPromptPolicy.ts";
import { isDonationCallbackUrl, isTrustedPaystackCheckoutUrl, isValidDonationReference } from "../src/services/donations/paystackService.ts";

test("donation amount accepts whole KES values within policy", () => {
  assert.equal(parseDonationAmount("1"), null);
  assert.equal(parseDonationAmount("3"), 3);
  assert.equal(parseDonationAmount("10"), 10);
  assert.equal(parseDonationAmount("20"), 20);
  assert.equal(parseDonationAmount("2000"), 2000);
  assert.equal(parseDonationAmount("0"), null);
  assert.equal(parseDonationAmount("-20"), null);
  assert.equal(parseDonationAmount("20.5"), null);
  assert.equal(parseDonationAmount("abc"), null);
  assert.equal(parseDonationAmount("10000001"), null);
});

test("mobile, Edge Function, and database use Paystack's KES 3 minimum", () => {
  const sharedFunction = readFileSync(new URL("../supabase/functions/_shared/donations.ts", import.meta.url), "utf8");
  const minimumMigration = readFileSync(new URL("../supabase/migrations/016_donation_minimum_three_kes.sql", import.meta.url), "utf8");
  assert.match(sharedFunction, /MIN_DONATION_KES\s*=\s*3/);
  assert.match(minimumMigration, /amount between 3 and 10000000/i);
});

test("monthly prompt policy is calendar based and content-only", () => {
  assert.equal(supportMonthKey(new Date(2026, 7, 25)), "2026-08");
  assert.equal(isSupportPromptContentRoute("/bible/read"), true);
  assert.equal(isSupportPromptContentRoute("/media/video-id"), true);
  assert.equal(isSupportPromptContentRoute("/support"), false);
  assert.equal(isSupportPromptContentRoute("/account"), false);
});

test("checkout and callback URL validation rejects lookalike origins", () => {
  assert.equal(isTrustedPaystackCheckoutUrl("https://checkout.paystack.com/abc"), true);
  assert.equal(isTrustedPaystackCheckoutUrl("https://checkout.paystack.com.evil.test/abc"), false);
  assert.equal(isTrustedPaystackCheckoutUrl("http://checkout.paystack.com/abc"), false);
  assert.equal(isDonationCallbackUrl("https://adventnurutech.xyz/payments/paystack/callback?reference=x", "https://adventnurutech.xyz/payments/paystack/callback"), true);
  assert.equal(isDonationCallbackUrl("https://adventnurutech.xyz/payments/paystack/callback/", "https://adventnurutech.xyz/payments/paystack/callback"), true);
  assert.equal(isDonationCallbackUrl("https://evil.test/payments/paystack/callback", "https://adventnurutech.xyz/payments/paystack/callback"), false);
});

test("references are tightly scoped", () => {
  assert.equal(isValidDonationReference("APSUP-1787600000000-0123456789abcdef0123456789abcdef0123"), true);
  assert.equal(isValidDonationReference("other-reference"), false);
});

test("Paystack secret is never referenced from shipped application code", () => {
  const shippedFiles = [
    "app/_layout.tsx",
    "app/support/index.tsx",
    "app/support/checkout.tsx",
    "src/services/donations/donationService.ts",
    "src/services/donations/paystackService.ts",
  ];
  for (const file of shippedFiles) {
    assert.equal(readFileSync(new URL(`../${file}`, import.meta.url), "utf8").includes("PAYSTACK_SECRET_KEY"), false, file);
  }
});

test("the permanent donation page and navigation destination stay wired", () => {
  const donationRoute = readFileSync(new URL("../app/donate.tsx", import.meta.url), "utf8");
  const navigation = readFileSync(new URL("../components/ui/QuickFooter.tsx", import.meta.url), "utf8");
  const service = readFileSync(new URL("../src/services/donations/donationService.ts", import.meta.url), "utf8");
  assert.match(donationRoute, /support\/index/);
  assert.match(donationRoute, /export default DonationScreen/);
  assert.match(navigation, /label:\s*"Donate"/);
  assert.match(navigation, /path:\s*"\/donate"/);
  assert.match(service, /Donations are not configured on the server yet/);
});

test("donation reporting is database-gated to the senior administrator permission", () => {
  const baseMigration = readFileSync(new URL("../supabase/migrations/013_voluntary_donations.sql", import.meta.url), "utf8");
  const reportMigration = readFileSync(new URL("../supabase/migrations/014_senior_admin_donation_reporting.sql", import.meta.url), "utf8");
  assert.match(baseMigration, /revoke all on table public\.donations from anon, authenticated/i);
  assert.match(reportMigration, /values \('super_admin', 'donations\.read'\)/i);
  assert.match(reportMigration, /if not has_permission\('donations\.read'\)/gi);
  assert.doesNotMatch(reportMigration, /\('(reader|contributor|editor|publisher|moderator|media_manager|user_manager)', 'donations\.read'\)/i);
  assert.match(reportMigration, /only a super admin may grant or remove the super admin role/i);
});

test("verification supports secure server reconciliation and warns charged donors not to repay", () => {
  const sharedFunction = readFileSync(new URL("../supabase/functions/_shared/donations.ts", import.meta.url), "utf8");
  const verifier = readFileSync(new URL("../supabase/functions/verify-donation/index.ts", import.meta.url), "utf8");
  const config = readFileSync(new URL("../supabase/config.toml", import.meta.url), "utf8");
  const checkout = readFileSync(new URL("../app/support/checkout.tsx", import.meta.url), "utf8");
  assert.match(sharedFunction, /isServiceRoleRequest/);
  assert.match(sharedFunction, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(verifier, /trustedServer/);
  assert.match(verifier, /paystack_verify_http_/);
  assert.match(config, /\[functions\.verify-donation\][\s\S]*verify_jwt\s*=\s*true/);
  assert.match(checkout, /Payment Confirmation Pending/);
  assert.match(checkout, /do not pay again/i);
});

test("donation aggregate decrements update existing totals before inserting", () => {
  const migration = readFileSync(new URL("../supabase/migrations/018_fix_donation_daily_totals_decrement.sql", import.meta.url), "utf8");
  const negativeBranch = migration.match(/if p_count_delta < 0[\s\S]*?else/i)?.[0] || "";
  assert.match(negativeBranch, /update public\.donation_daily_totals/i);
  assert.doesNotMatch(negativeBranch, /insert into public\.donation_daily_totals/i);
  assert.match(migration, /record_count \+ p_count_delta >= 0/i);
  assert.match(migration, /amount_total \+ p_amount_delta >= 0/i);
});
