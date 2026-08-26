import * as Application from "expo-application";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Alert, AppState, Linking, Platform } from "react-native";

import { useAuth } from "@/src/auth/AuthContext";
import {
  configureAndroidNotificationChannels,
  configureNotificationPresentation,
  DEFAULT_NOTIFICATION_PREFERENCES,
  disableCurrentPushDevice,
  getAvailableAppRelease,
  getNotificationPermission,
  getUnreadNotificationCount,
  isRemotePushSupported,
  loadLocalNotificationPreferences,
  loadRemoteNotificationPreferences,
  markNotificationRead,
  registerPushDevice,
  rememberReleasePrompt,
  requestNotificationPermission,
  routeFromNotificationResponse,
  safeGooglePlayUrl,
  saveLocalNotificationPreferences,
  saveRemoteNotificationPreferences,
  shouldPromptForRelease,
  syncDailyVerseSchedule,
} from "@/src/features/notifications/notificationService";
import type { NotificationPreferenceKey, NotificationPreferences } from "@/src/features/notifications/types";

type NotificationsContextValue = {
  ready: boolean;
  permission: string;
  preferences: NotificationPreferences;
  unreadCount: number;
  enable(): Promise<boolean>;
  disable(): Promise<void>;
  setPreference(key: NotificationPreferenceKey, value: boolean): Promise<void>;
  refreshUnreadCount(): Promise<void>;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

configureNotificationPresentation();

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const userId = auth.user?.id;
  const [ready, setReady] = useState(false);
  const [permission, setPermission] = useState("undetermined");
  const [preferences, setPreferences] = useState(DEFAULT_NOTIFICATION_PREFERENCES);
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnreadCount = useCallback(async () => {
    if (!userId) { setUnreadCount(0); return; }
    try { setUnreadCount(await getUnreadNotificationCount()); }
    catch (error) { console.warn("Unable to refresh notification count", error); }
  }, [userId]);

  const persist = useCallback(async (next: NotificationPreferences) => {
    setPreferences(next);
    await saveLocalNotificationPreferences(next);
    if (userId) await saveRemoteNotificationPreferences(userId, next);
  }, [userId]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        await configureAndroidNotificationChannels();
        const [local, currentPermission] = await Promise.all([
          loadLocalNotificationPreferences(),
          getNotificationPermission(),
        ]);
        const remote = userId ? await loadRemoteNotificationPreferences(userId) : null;
        const next = remote ?? local;
        if (!active) return;
        setPermission(currentPermission);
        setPreferences(next);
        if (currentPermission === "granted" && next.masterEnabled) {
          await syncDailyVerseSchedule(next.dailyVerse);
          if (userId) await registerPushDevice();
        }
        await refreshUnreadCount();
      } catch (error) {
        console.warn("Notification initialization failed", error);
      } finally {
        if (active) setReady(true);
      }
    })();
    return () => { active = false; };
  }, [userId, refreshUnreadCount]);

  useEffect(() => {
    if (Platform.OS === "web") return;
    const openResponse = async (response: Notifications.NotificationResponse) => {
      const notificationId = response.notification.request.content.data?.notificationId;
      if (userId && typeof notificationId === "string") {
        try { await markNotificationRead(notificationId); }
        catch (error) { console.warn("Unable to mark opened notification read", error); }
      }
      const storeUrl = safeGooglePlayUrl(response.notification.request.content.data?.storeUrl);
      if (storeUrl) {
        await Linking.openURL(storeUrl);
        await refreshUnreadCount();
        return;
      }
      router.push(routeFromNotificationResponse(response) as never);
      await refreshUnreadCount();
    };
    const opened = Notifications.addNotificationResponseReceivedListener((response) => {
      void openResponse(response);
    });
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        void openResponse(response);
        Notifications.clearLastNotificationResponse();
      }
    });
    const received = Notifications.addNotificationReceivedListener(() => void refreshUnreadCount());
    const tokenChanged = isRemotePushSupported()
      ? Notifications.addPushTokenListener((devicePushToken) => {
        if (userId && preferences.masterEnabled) {
          void registerPushDevice(devicePushToken).catch((error) => {
            console.warn("Unable to refresh push registration", error);
          });
        }
      })
      : null;
    return () => { opened.remove(); received.remove(); tokenChanged?.remove(); };
  }, [userId, preferences.masterEnabled, refreshUnreadCount]);

  useEffect(() => {
    const checkRelease = async () => {
      if (!preferences.appUpdates) return;
      try {
        const release = await getAvailableAppRelease();
        if (!release) return;
        const currentCode = Number(Application.nativeBuildVersion ?? 0);
        const required = currentCode < release.minimumSupportedCode;
        if (!required && !await shouldPromptForRelease(release)) return;
        // Optional releases are prompted once per version. Required releases
        // continue to prompt on later launches until the installed build changes.
        if (!required) await rememberReleasePrompt(release);
        Alert.alert(
          required ? "Update required" : "Advent Pro update available",
          `Version ${release.versionName} is now live on Google Play.${release.releaseNotes ? `\n\n${release.releaseNotes}` : ""}`,
          [
            ...(!required ? [{ text: "Later", style: "cancel" as const }] : []),
            { text: "Update", onPress: () => void Linking.openURL(release.storeUrl) },
          ],
          { cancelable: !required }
        );
      } catch (error) {
        console.warn("App update check failed", error);
      }
    };
    void checkRelease();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") { void checkRelease(); void refreshUnreadCount(); }
    });
    return () => subscription.remove();
  }, [preferences.appUpdates, refreshUnreadCount]);

  const value = useMemo<NotificationsContextValue>(() => ({
    ready,
    permission,
    preferences,
    unreadCount,
    async enable() {
      const granted = await requestNotificationPermission();
      setPermission(granted ? "granted" : "denied");
      if (!granted) return false;
      const next = { ...preferences, masterEnabled: true };
      await persist(next);
      await syncDailyVerseSchedule(next.dailyVerse);
      if (userId) await registerPushDevice();
      return true;
    },
    async disable() {
      const next = { ...preferences, masterEnabled: false };
      await persist(next);
      await syncDailyVerseSchedule(false);
      if (userId) await disableCurrentPushDevice();
    },
    async setPreference(key, enabled) {
      const next = { ...preferences, [key]: enabled };
      await persist(next);
      if (key === "dailyVerse") {
        await syncDailyVerseSchedule(next.masterEnabled && enabled);
      }
    },
    refreshUnreadCount,
  }), [permission, persist, preferences, ready, refreshUnreadCount, unreadCount, userId]);

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const value = useContext(NotificationsContext);
  if (!value) throw new Error("useNotifications must be used inside NotificationsProvider");
  return value;
}
