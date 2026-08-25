import { createClient } from "npm:@supabase/supabase-js@2.45.4";

export const PAYSTACK_API = "https://api.paystack.co";
export const DONATION_CURRENCY = "KES";
export const MIN_DONATION_KES = 20;
export const MAX_DONATION_KES = 10_000_000;

export type DonationRow = {
  id: string;
  user_id: string | null;
  paystack_reference: string;
  amount: number;
  currency: "KES";
  status: "pending" | "successful" | "failed" | "cancelled";
};

export function requiredEnv(name: string) {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`Missing required server configuration: ${name}`);
  return value;
}

export function serviceClient() {
  return createClient(requiredEnv("SUPABASE_URL"), requiredEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function authenticatedUser(req: Request) {
  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  const token = authorization.slice(7);
  const client = createClient(requiredEnv("SUPABASE_URL"), requiredEnv("SUPABASE_ANON_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authorization } },
  });
  const { data, error } = await client.auth.getUser(token);
  return error ? null : data.user;
}

export function validEmail(value: unknown): value is string {
  return typeof value === "string" && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function validAmountKes(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= MIN_DONATION_KES && Number(value) <= MAX_DONATION_KES;
}

export function validReference(value: unknown): value is string {
  return typeof value === "string" && /^APSUP-[A-Za-z0-9.-]{20,100}$/.test(value);
}

export function newReference() {
  const random = crypto.getRandomValues(new Uint8Array(18));
  const suffix = Array.from(random, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `APSUP-${Date.now()}-${suffix}`;
}

export async function hmacHex(secret: string, value: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function paystackRequest(path: string, init: RequestInit = {}) {
  const secret = requiredEnv("PAYSTACK_SECRET_KEY");
  return fetch(`${PAYSTACK_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}

export function safeCallbackUrl() {
  const configured = Deno.env.get("DONATION_CALLBACK_URL")?.trim() || "https://adventnurutech.xyz/payments/paystack/callback";
  const url = new URL(configured);
  if (url.protocol !== "https:") throw new Error("DONATION_CALLBACK_URL must use HTTPS.");
  return url.toString();
}
