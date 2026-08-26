import { authenticatedUser, serviceClient } from "../_shared/donations.ts";
import { jsonResponse, methodNotAllowed } from "../_shared/http.ts";
import {
  createAndDispatchNotification,
  dispatchExistingNotification,
  processPushReceipts,
  type NotificationInput,
  type ServerNotificationKind,
} from "../_shared/notifications.ts";

const KINDS = new Set<ServerNotificationKind>([
  "daily_verse", "new_content", "reply", "engagement_digest",
  "donation_receipt", "app_update", "system",
]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ROUTE = /^\/[A-Za-z0-9_./?=&%:-]{0,499}$/;

function cleanText(value: unknown, max: number) {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

async function authorizedPublisher(req: Request) {
  const user = await authenticatedUser(req);
  if (!user) return false;
  const db = serviceClient();
  const { data } = await db.from("app_user_roles")
    .select("role_name,app_roles(app_role_permissions(permission_name))")
    .eq("user_id", user.id);
  const permissions = (data ?? []).flatMap((row: any) =>
    row.app_roles?.app_role_permissions?.map((entry: any) => entry.permission_name) ?? []
  );
  return permissions.includes("content.publish") || permissions.includes("media.manage") || permissions.includes("users.manage");
}

function normalizePayload(value: unknown): NotificationInput {
  const input = (value ?? {}) as Record<string, unknown>;
  const kind = input.kind as ServerNotificationKind;
  const title = cleanText(input.title, 120);
  const body = cleanText(input.body, 500);
  const route = cleanText(input.route, 500) || "/notifications";
  const recipientUserId = input.recipientUserId == null ? null : String(input.recipientUserId);
  let dedupeKey = cleanText(input.dedupeKey, 200);
  if (!KINDS.has(kind) || !title || !body || !ROUTE.test(route)) throw new Error("invalid_notification");
  if (recipientUserId && !UUID.test(recipientUserId)) throw new Error("invalid_recipient");
  if (kind === "new_content") dedupeKey = `new-content:${new Date().toISOString().slice(0, 10)}`;
  if (kind === "engagement_digest" && recipientUserId) dedupeKey = `engagement:${recipientUserId}:${new Date().toISOString().slice(0, 10)}`;
  if (dedupeKey.length < 8) throw new Error("invalid_dedupe_key");
  const data = input.data && typeof input.data === "object" && !Array.isArray(input.data)
    ? input.data as Record<string, unknown>
    : {};
  return { recipientUserId, kind, title, body, route, data, dedupeKey };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return methodNotAllowed();
  try {
    const db = serviceClient();
    const suppliedCronSecret = req.headers.get("x-cron-secret");
    const configuredCronSecret = Deno.env.get("NOTIFICATION_CRON_SECRET")?.trim();
    const isCron = Boolean(suppliedCronSecret && configuredCronSecret && suppliedCronSecret === configuredCronSecret);
    if (isCron) {
      const { data, error } = await db.from("notifications")
        .select("id,recipient_user_id,kind,title,body,route,data")
        .is("push_dispatched_at", null).order("created_at").limit(25);
      if (error) throw error;
      let devices = 0;
      for (const notification of data ?? []) {
        devices += (await dispatchExistingNotification(db, notification as any)).devices;
      }
      const receipts = await processPushReceipts(db);
      return jsonResponse({ processed: data?.length ?? 0, devices, ...receipts });
    }
    if (!await authorizedPublisher(req)) return jsonResponse({ error: "Not authorized." }, 403);
    const payload = normalizePayload(await req.json());
    return jsonResponse(await createAndDispatchNotification(db, payload), 201);
  } catch (error) {
    const code = error instanceof Error ? error.message : "unknown";
    console.error("Notification dispatch failed", { code });
    return jsonResponse({ error: code.startsWith("invalid_") ? code : "Notification dispatch failed." }, code.startsWith("invalid_") ? 400 : 500);
  }
});
