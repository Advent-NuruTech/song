import type { SupabaseClient } from "npm:@supabase/supabase-js@2.45.4";

export type ServerNotificationKind =
  | "daily_verse" | "new_content" | "reply" | "engagement_digest"
  | "donation_receipt" | "app_update" | "system";

export type NotificationInput = {
  recipientUserId?: string | null;
  kind: ServerNotificationKind;
  title: string;
  body: string;
  route: string;
  data?: Record<string, unknown>;
  dedupeKey: string;
  expiresAt?: string | null;
};

type NotificationRow = {
  id: string;
  recipient_user_id: string | null;
  kind: ServerNotificationKind;
  title: string;
  body: string;
  route: string;
  data: Record<string, unknown>;
};

type PushDevice = { id: string; user_id: string; expo_push_token: string };
type ExpoTicket = { status: "ok" | "error"; id?: string; message?: string; details?: { error?: string } };

const PREFERENCE_COLUMN: Record<ServerNotificationKind, string | null> = {
  daily_verse: "daily_verse",
  new_content: "new_content",
  reply: "replies",
  engagement_digest: "engagement_digest",
  donation_receipt: "donations",
  app_update: "app_updates",
  system: null,
};

const CHANNEL: Record<ServerNotificationKind, string> = {
  daily_verse: "daily-verse",
  new_content: "advent-pro-updates",
  reply: "replies",
  engagement_digest: "community",
  donation_receipt: "advent-pro-updates",
  app_update: "advent-pro-updates",
  system: "advent-pro-updates",
};

function requiredEnv(name: string) {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`Missing required server configuration: ${name}`);
  return value;
}

function chunks<T>(items: T[], size: number) {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size));
  return result;
}

async function eligibleDevices(db: SupabaseClient, notification: NotificationRow) {
  const devices: PushDevice[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    let query = db.from("push_devices").select("id,user_id,expo_push_token")
      .eq("enabled", true).range(from, from + pageSize - 1);
    if (notification.recipient_user_id) query = query.eq("user_id", notification.recipient_user_id);
    const { data, error } = await query;
    if (error) throw new Error(`push_devices_lookup_failed:${error.code}`);
    const page = (data ?? []) as PushDevice[];
    devices.push(...page);
    if (page.length < pageSize || notification.recipient_user_id) break;
  }
  if (!devices.length) return [];

  const preferenceColumn = PREFERENCE_COLUMN[notification.kind];
  const userIds = [...new Set(devices.map((device) => device.user_id))];
  const allowed = new Set<string>();
  for (const userPage of chunks(userIds, 500)) {
    const fields = preferenceColumn ? `user_id,master_enabled,${preferenceColumn}` : "user_id,master_enabled";
    const { data, error } = await db.from("notification_preferences").select(fields).in("user_id", userPage);
    if (error) throw new Error(`notification_preferences_lookup_failed:${error.code}`);
    for (const row of data ?? []) {
      const values = row as unknown as Record<string, unknown>;
      if (values.master_enabled && (!preferenceColumn || values[preferenceColumn])) allowed.add(String(values.user_id));
    }
  }
  return devices.filter((device) => allowed.has(device.user_id));
}

export async function dispatchExistingNotification(db: SupabaseClient, notification: NotificationRow) {
  const devices = await eligibleDevices(db, notification);
  if (!devices.length) {
    const { error } = await db.from("notifications")
      .update({ push_dispatched_at: new Date().toISOString() }).eq("id", notification.id);
    if (error) throw new Error(`notification_dispatch_mark_failed:${error.code}`);
    return { devices: 0 };
  }
  const accessToken = requiredEnv("EXPO_ACCESS_TOKEN");
  for (const devicePage of chunks(devices, 100)) {
    const messages = devicePage.map((device) => ({
      to: device.expo_push_token,
      title: notification.title,
      body: notification.body,
      data: { ...notification.data, route: notification.route, notificationId: notification.id },
      channelId: CHANNEL[notification.kind],
      priority: notification.kind === "reply" ? "high" : "default",
      sound: notification.kind === "reply" || notification.kind === "donation_receipt" ? "default" : undefined,
    }));
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify(messages),
    });
    if (!response.ok) throw new Error(`expo_push_failed:${response.status}`);
    const payload = await response.json() as { data?: ExpoTicket[] };
    const tickets = payload.data ?? [];
    const attempts = devicePage.map((device, index) => {
      const ticket = tickets[index];
      return {
        notification_id: notification.id,
        push_device_id: device.id,
        expo_ticket_id: ticket?.id ?? null,
        status: ticket?.status === "ok" ? "accepted" : "error",
        error_code: ticket?.details?.error ?? ticket?.message?.slice(0, 100) ?? "unknown",
      };
    });
    if (attempts.length) {
      const { error } = await db.from("notification_delivery_attempts")
        .upsert(attempts, { onConflict: "notification_id,push_device_id" });
      if (error) throw new Error(`notification_delivery_log_failed:${error.code}`);
    }
  }
  const { error } = await db.from("notifications")
    .update({ push_dispatched_at: new Date().toISOString() }).eq("id", notification.id);
  if (error) throw new Error(`notification_dispatch_mark_failed:${error.code}`);
  return { devices: devices.length };
}

export async function processPushReceipts(db: SupabaseClient) {
  const cutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const { data, error } = await db.from("notification_delivery_attempts")
    .select("id,push_device_id,expo_ticket_id")
    .eq("status", "accepted").is("checked_at", null).not("expo_ticket_id", "is", null)
    .lte("attempted_at", cutoff).limit(1000);
  if (error) throw new Error(`notification_receipts_lookup_failed:${error.code}`);
  const attempts = (data ?? []) as { id: number; push_device_id: string; expo_ticket_id: string }[];
  if (!attempts.length) return { receipts: 0 };
  const accessToken = requiredEnv("EXPO_ACCESS_TOKEN");
  let processed = 0;
  for (const attemptPage of chunks(attempts, 1000)) {
    const response = await fetch("https://exp.host/--/api/v2/push/getReceipts", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${accessToken}` },
      body: JSON.stringify({ ids: attemptPage.map((attempt) => attempt.expo_ticket_id) }),
    });
    if (!response.ok) throw new Error(`expo_receipts_failed:${response.status}`);
    const payload = await response.json() as { data?: Record<string, ExpoTicket> };
    for (const attempt of attemptPage) {
      const receipt = payload.data?.[attempt.expo_ticket_id];
      if (!receipt) continue;
      const now = new Date().toISOString();
      const failed = receipt.status === "error";
      await db.from("notification_delivery_attempts").update({
        status: failed ? "failed" : "delivered",
        error_code: failed ? receipt.details?.error ?? receipt.message?.slice(0, 100) ?? "unknown" : null,
        checked_at: now,
      }).eq("id", attempt.id);
      if (receipt.details?.error === "DeviceNotRegistered") {
        await db.from("push_devices").update({ enabled: false, last_seen_at: now }).eq("id", attempt.push_device_id);
      }
      processed += 1;
    }
  }
  return { receipts: processed };
}

export async function createAndDispatchNotification(db: SupabaseClient, input: NotificationInput) {
  const { data, error } = await db.from("notifications").insert({
    recipient_user_id: input.recipientUserId ?? null,
    kind: input.kind,
    title: input.title,
    body: input.body,
    route: input.route,
    data: input.data ?? {},
    dedupe_key: input.dedupeKey,
    expires_at: input.expiresAt ?? null,
  }).select("id,recipient_user_id,kind,title,body,route,data").single();
  if (error) {
    if (error.code !== "23505") throw new Error(`notification_create_failed:${error.code}`);
    const existing = await db.from("notifications")
      .select("id,recipient_user_id,kind,title,body,route,data,push_dispatched_at")
      .eq("dedupe_key", input.dedupeKey).single();
    if (existing.error) throw new Error(`notification_dedupe_lookup_failed:${existing.error.code}`);
    if (existing.data.push_dispatched_at) return { notificationId: existing.data.id, duplicate: true, devices: 0 };
    const result = await dispatchExistingNotification(db, existing.data as NotificationRow);
    return { notificationId: existing.data.id, duplicate: true, ...result };
  }
  const result = await dispatchExistingNotification(db, data as NotificationRow);
  return { notificationId: data.id, duplicate: false, ...result };
}
