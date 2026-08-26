export type NotificationKind =
  | "daily_verse"
  | "new_content"
  | "reply"
  | "engagement_digest"
  | "donation_receipt"
  | "app_update"
  | "system";

export type NotificationPreferenceKey =
  | "dailyVerse"
  | "newContent"
  | "replies"
  | "engagementDigest"
  | "donations"
  | "appUpdates";

export type NotificationPreferences = {
  masterEnabled: boolean;
  dailyVerse: boolean;
  newContent: boolean;
  replies: boolean;
  engagementDigest: boolean;
  donations: boolean;
  appUpdates: boolean;
};

export type InboxNotification = {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  route: string;
  data: Record<string, unknown>;
  createdAt: string;
  read: boolean;
};

export type AppRelease = {
  versionCode: number;
  versionName: string;
  storeUrl: string;
  releaseNotes: string;
  minimumSupportedCode: number;
};
