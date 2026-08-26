import AsyncStorage from "@react-native-async-storage/async-storage";
import { isRunningInExpoGo } from "expo";
import * as Application from "expo-application";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { authConfigured, supabase } from "@/src/auth/supabaseClient";
import type {
  AppRelease,
  InboxNotification,
  NotificationPreferenceKey,
  NotificationPreferences,
} from "./types";

const PREFERENCES_KEY = "@notifications/preferences/v1";
const INSTALLATION_KEY = "@notifications/installation/v1";
const DAILY_NOTIFICATION_KEY = "advent-pro:daily-verse";
const LAST_UPDATE_PROMPT_KEY = "@notifications/last-update-prompt";

export function isRemotePushSupported() {
  return Platform.OS !== "web" && !isRunningInExpoGo();
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  masterEnabled: false,
  dailyVerse: true,
  newContent: true,
  replies: true,
  engagementDigest: true,
  donations: true,
  appUpdates: true,
};

const CLIENT_TO_DB: Record<NotificationPreferenceKey, string> = {
  dailyVerse: "daily_verse",
  newContent: "new_content",
  replies: "replies",
  engagementDigest: "engagement_digest",
  donations: "donations",
  appUpdates: "app_updates",
};

type PreferenceRow = {
  master_enabled: boolean;
  daily_verse: boolean;
  new_content: boolean;
  replies: boolean;
  engagement_digest: boolean;
  donations: boolean;
  app_updates: boolean;
};

type NotificationRow = {
  id: string;
  kind: InboxNotification["kind"];
  title: string;
  body: string;
  route: string;
  data: Record<string, unknown> | null;
  created_at: string;
};

export function configureNotificationPresentation() {
  if (Platform.OS === "web") return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: true,
    }),
  });
}

export async function configureAndroidNotificationChannels() {
  if (Platform.OS !== "android") return;
  await Promise.all([
    Notifications.setNotificationChannelAsync("daily-verse", {
      name: "Daily Bible verse",
      description: "A gentle Scripture reminder at 6:00 AM.",
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: "default",
      vibrationPattern: [0, 180, 120, 180],
      lightColor: "#0B4AA6",
    }),
    Notifications.setNotificationChannelAsync("replies", {
      name: "Replies",
      description: "Important replies to your contributions.",
      importance: Notifications.AndroidImportance.HIGH,
      sound: "default",
      vibrationPattern: [0, 220, 120, 220],
      lightColor: "#0B4AA6",
    }),
    Notifications.setNotificationChannelAsync("advent-pro-updates", {
      name: "Advent Pro updates",
      description: "New resources, receipts, and app updates.",
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: "#0B4AA6",
    }),
    Notifications.setNotificationChannelAsync("community", {
      name: "Community summaries",
      description: "Bundled engagement updates, never one alert per like.",
      importance: Notifications.AndroidImportance.LOW,
      lightColor: "#0B4AA6",
    }),
  ]);
}

export async function getNotificationPermission() {
  if (Platform.OS === "web") return "unsupported" as const;
  const result = await Notifications.getPermissionsAsync();
  return result.status;
}

export async function requestNotificationPermission() {
  if (Platform.OS === "web") return false;
  await configureAndroidNotificationChannels();
  const existing = await Notifications.getPermissionsAsync();
  const result = existing.status === "granted"
    ? existing
    : await Notifications.requestPermissionsAsync();
  return result.status === "granted";
}

export async function loadLocalNotificationPreferences(): Promise<NotificationPreferences> {
  try {
    const raw = await AsyncStorage.getItem(PREFERENCES_KEY);
    return raw
      ? { ...DEFAULT_NOTIFICATION_PREFERENCES, ...JSON.parse(raw) as Partial<NotificationPreferences> }
      : DEFAULT_NOTIFICATION_PREFERENCES;
  } catch {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }
}

export async function saveLocalNotificationPreferences(preferences: NotificationPreferences) {
  await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
}

export async function loadRemoteNotificationPreferences(userId: string) {
  if (!authConfigured) return null;
  const { data, error } = await supabase.from("notification_preferences")
    .select("master_enabled,daily_verse,new_content,replies,engagement_digest,donations,app_updates")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    // A missing migration must not stop the rest of the app from loading.
    if (error.code === "42P01") return null;
    throw error;
  }
  if (!data) return null;
  const row = data as PreferenceRow;
  return {
    masterEnabled: row.master_enabled,
    dailyVerse: row.daily_verse,
    newContent: row.new_content,
    replies: row.replies,
    engagementDigest: row.engagement_digest,
    donations: row.donations,
    appUpdates: row.app_updates,
  } satisfies NotificationPreferences;
}

export async function saveRemoteNotificationPreferences(
  userId: string,
  preferences: NotificationPreferences
) {
  if (!authConfigured) return;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const payload: Record<string, string | boolean> = {
    user_id: userId,
    master_enabled: preferences.masterEnabled,
    timezone,
    updated_at: new Date().toISOString(),
  };
  for (const [clientKey, dbKey] of Object.entries(CLIENT_TO_DB)) {
    payload[dbKey] = preferences[clientKey as NotificationPreferenceKey];
  }
  const { error } = await supabase.from("notification_preferences")
    .upsert(payload, { onConflict: "user_id" });
  if (error && error.code !== "42P01") throw error;
}

async function getInstallationId() {
  const stored = await AsyncStorage.getItem(INSTALLATION_KEY);
  if (stored) return stored;
  const created = `install-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
  await AsyncStorage.setItem(INSTALLATION_KEY, created);
  return created;
}

export async function registerPushDevice(devicePushToken?: Notifications.DevicePushToken) {
  if (!isRemotePushSupported() || !Device.isDevice || !authConfigured) return false;
  if (await getNotificationPermission() !== "granted") return false;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) throw new Error("EAS project ID is missing from app configuration.");
  const nativeToken = devicePushToken ?? await Notifications.getDevicePushTokenAsync();
  const [expoToken, installationId] = await Promise.all([
    Notifications.getExpoPushTokenAsync({ projectId, devicePushToken: nativeToken }),
    getInstallationId(),
  ]);
  const nativeValue = typeof nativeToken.data === "string"
    ? nativeToken.data
    : JSON.stringify(nativeToken.data);
  const { error } = await supabase.rpc("register_push_device", {
    p_installation_id: installationId,
    p_expo_push_token: expoToken.data,
    p_native_push_token: nativeValue,
    p_platform: Platform.OS,
    p_app_version: Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? "",
    p_locale: Intl.DateTimeFormat().resolvedOptions().locale || "",
  });
  if (error) throw error;
  return true;
}

export async function disableCurrentPushDevice() {
  if (!authConfigured || Platform.OS === "web") return;
  const installationId = await getInstallationId();
  const { error } = await supabase.rpc("disable_push_device", {
    p_installation_id: installationId,
  });
  if (error && error.code !== "42883") throw error;
}

export async function syncDailyVerseSchedule(enabled: boolean) {
  if (Platform.OS === "web") return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(scheduled
    .filter((item) => item.content.data?.notificationKey === DAILY_NOTIFICATION_KEY)
    .map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)));
  if (!enabled || await getNotificationPermission() !== "granted") return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Begin your day with Scripture",
      body: "Your daily Bible verse is ready in Advent Pro.",
      data: { route: "/", notificationKey: DAILY_NOTIFICATION_KEY },
      sound: "default",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 6,
      minute: 0,
      channelId: "daily-verse",
    },
  });
}

export function safeNotificationRoute(value: unknown): string {
  if (typeof value !== "string" || value.length > 500 || !value.startsWith("/")) {
    return "/notifications";
  }
  const allowed = [
    "/", "/notifications", "/studies", "/media", "/song/", "/bible",
    "/support", "/account", "/about", "/settings",
  ];
  return allowed.some((prefix) => value === prefix || value.startsWith(`${prefix}/`) || value.startsWith(`${prefix}?`))
    ? value
    : "/notifications";
}

export function safeGooglePlayUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 500) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:"
      && url.hostname === "play.google.com"
      && url.pathname === "/store/apps/details"
      && url.searchParams.get("id") === "com.adventpro"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

export function routeFromNotificationResponse(response: Notifications.NotificationResponse) {
  return safeNotificationRoute(response.notification.request.content.data?.route);
}

export async function listNotifications(limit = 60): Promise<InboxNotification[]> {
  const { data, error } = await supabase.from("notifications")
    .select("id,kind,title,body,route,data,created_at")
    .order("created_at", { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 100));
  if (error) {
    if (error.code === "42P01") return [];
    throw error;
  }
  const rows = (data ?? []) as NotificationRow[];
  if (!rows.length) return [];
  const { data: reads, error: readError } = await supabase.from("notification_reads")
    .select("notification_id")
    .in("notification_id", rows.map((row) => row.id));
  if (readError && readError.code !== "42P01") throw readError;
  const readIds = new Set((reads ?? []).map((row) => String(row.notification_id)));
  return rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    title: row.title,
    body: row.body,
    route: safeNotificationRoute(row.route),
    data: row.data ?? {},
    createdAt: row.created_at,
    read: readIds.has(row.id),
  }));
}

export async function getUnreadNotificationCount() {
  const { data, error } = await supabase.rpc("get_unread_notification_count");
  if (error) {
    if (error.code === "42883") return 0;
    throw error;
  }
  return Number(data ?? 0);
}

export async function markNotificationRead(notificationId: string) {
  const { error } = await supabase.rpc("mark_notification_read", {
    p_notification_id: notificationId,
  });
  if (error) throw error;
}

export async function markAllNotificationsRead() {
  const { error } = await supabase.rpc("mark_all_notifications_read");
  if (error) throw error;
}

export async function getAvailableAppRelease(): Promise<AppRelease | null> {
  if (!authConfigured || Platform.OS !== "android") return null;
  const currentCode = Number(Application.nativeBuildVersion ?? 0);
  const { data, error } = await supabase.from("app_releases")
    .select("version_code,version_name,store_url,release_notes,minimum_supported_code")
    .gt("version_code", currentCode)
    .order("version_code", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    if (error.code === "42P01") return null;
    throw error;
  }
  if (!data) return null;
  return {
    versionCode: Number(data.version_code),
    versionName: String(data.version_name),
    storeUrl: String(data.store_url),
    releaseNotes: String(data.release_notes ?? ""),
    minimumSupportedCode: Number(data.minimum_supported_code),
  };
}

export async function shouldPromptForRelease(release: AppRelease) {
  return await AsyncStorage.getItem(LAST_UPDATE_PROMPT_KEY) !== String(release.versionCode);
}

export async function rememberReleasePrompt(release: AppRelease) {
  await AsyncStorage.setItem(LAST_UPDATE_PROMPT_KEY, String(release.versionCode));
}
