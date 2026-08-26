import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useAppTheme } from "@/hooks/use-app-theme";
import { useAuth } from "@/src/auth/AuthContext";
import { useNotifications } from "@/src/context/NotificationsContext";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  safeGooglePlayUrl,
} from "@/src/features/notifications/notificationService";
import type { InboxNotification, NotificationKind } from "@/src/features/notifications/types";

const KIND_ICONS: Record<NotificationKind, keyof typeof Ionicons.glyphMap> = {
  daily_verse: "book-outline",
  new_content: "sparkles-outline",
  reply: "chatbubble-ellipses-outline",
  engagement_digest: "heart-outline",
  donation_receipt: "heart-circle-outline",
  app_update: "cloud-download-outline",
  system: "information-circle-outline",
};

function relativeTime(value: string) {
  const elapsed = Date.now() - new Date(value).getTime();
  const minutes = Math.max(0, Math.floor(elapsed / 60_000));
  if (minutes < 1) return "Now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(value));
}

export default function NotificationsScreen() {
  const { colors, fontFamily, size } = useAppTheme();
  const auth = useAuth();
  const { refreshUnreadCount } = useNotifications();
  const [items, setItems] = useState<InboxNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (!auth.user) { setItems([]); setLoading(false); return; }
    if (refresh) setRefreshing(true);
    try {
      setItems(await listNotifications());
      await refreshUnreadCount();
    } catch (error) {
      console.warn("Unable to load notifications", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [auth.user, refreshUnreadCount]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const open = async (item: InboxNotification) => {
    if (!item.read) {
      try { await markNotificationRead(item.id); }
      catch (error) { console.warn("Unable to mark notification read", error); }
      setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, read: true } : entry));
      await refreshUnreadCount();
    }
    const storeUrl = item.kind === "app_update" ? safeGooglePlayUrl(item.data.storeUrl) : null;
    if (storeUrl) {
      await Linking.openURL(storeUrl);
      return;
    }
    router.push(item.route as never);
  };

  const markAll = async () => {
    try {
      await markAllNotificationsRead();
      setItems((current) => current.map((item) => ({ ...item, read: true })));
      await refreshUnreadCount();
    } catch (error) {
      console.warn("Unable to mark all notifications read", error);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.text, fontFamily, fontSize: size(24) }]}>Notifications</Text>
          <Text style={[styles.subtitle, { color: colors.mutedText, fontFamily }]}>Your important Advent Pro updates in one place</Text>
        </View>
        {items.some((item) => !item.read) ? (
          <Pressable accessibilityRole="button" onPress={() => void markAll()} hitSlop={10}>
            <Text style={[styles.markAll, { color: colors.tint, fontFamily }]}>Mark all read</Text>
          </Pressable>
        ) : null}
      </View>

      {!auth.user ? (
        <View style={styles.centerState}>
          <View style={[styles.emptyIcon, { backgroundColor: `${colors.tint}14` }]}>
            <Ionicons name="notifications-outline" size={34} color={colors.tint} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text, fontFamily }]}>Keep notifications across devices</Text>
          <Text style={[styles.emptyBody, { color: colors.mutedText, fontFamily }]}>Sign in to receive replies, donation receipts, new-resource summaries, and a permanent notification history.</Text>
          <Pressable style={[styles.primaryButton, { backgroundColor: colors.tint }]} onPress={() => router.push("/account" as never)}>
            <Text style={[styles.primaryButtonText, { fontFamily }]}>Sign in</Text>
          </Pressable>
        </View>
      ) : loading ? (
        <View style={styles.centerState}><ActivityIndicator color={colors.tint} /></View>
      ) : (
        <ScrollView
          contentContainerStyle={items.length ? styles.list : styles.centerState}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.tint} />}
        >
          {items.length ? items.map((item) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={`${item.read ? "" : "Unread: "}${item.title}. ${item.body}`}
              onPress={() => void open(item)}
              style={({ pressed }) => [
                styles.item,
                { backgroundColor: item.read ? colors.card : `${colors.tint}0D`, borderColor: item.read ? colors.border : `${colors.tint}55` },
                pressed && styles.pressed,
              ]}
            >
              <View style={[styles.itemIcon, { backgroundColor: `${colors.tint}16` }]}>
                <Ionicons name={KIND_ICONS[item.kind]} size={22} color={colors.tint} />
              </View>
              <View style={styles.itemCopy}>
                <View style={styles.itemTitleRow}>
                  <Text numberOfLines={2} style={[styles.itemTitle, { color: colors.text, fontFamily }]}>{item.title}</Text>
                  <Text style={[styles.time, { color: colors.mutedText, fontFamily }]}>{relativeTime(item.createdAt)}</Text>
                </View>
                <Text style={[styles.itemBody, { color: colors.mutedText, fontFamily }]}>{item.body}</Text>
              </View>
              {!item.read ? <View accessibilityLabel="Unread" style={[styles.unreadDot, { backgroundColor: colors.tint }]} /> : null}
            </Pressable>
          )) : (
            <>
              <View style={[styles.emptyIcon, { backgroundColor: `${colors.tint}14` }]}>
                <Ionicons name="checkmark-circle-outline" size={36} color={colors.tint} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text, fontFamily }]}>You’re all caught up</Text>
              <Text style={[styles.emptyBody, { color: colors.mutedText, fontFamily }]}>Important updates will remain here even after you clear them from Android.</Text>
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 18, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 12 },
  title: { fontWeight: "900", letterSpacing: -0.5 },
  subtitle: { fontSize: 12, marginTop: 4, maxWidth: 270 },
  markAll: { fontSize: 12, fontWeight: "800", paddingVertical: 7 },
  list: { paddingHorizontal: 16, paddingBottom: 36, gap: 10 },
  item: { minHeight: 88, borderRadius: 18, borderWidth: 1, padding: 14, flexDirection: "row", alignItems: "flex-start", gap: 12 },
  itemIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  itemCopy: { flex: 1 },
  itemTitleRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  itemTitle: { flex: 1, fontSize: 15, lineHeight: 20, fontWeight: "800" },
  itemBody: { marginTop: 5, fontSize: 13, lineHeight: 19 },
  time: { fontSize: 10, fontWeight: "700" },
  unreadDot: { width: 7, height: 7, borderRadius: 4, marginTop: 6 },
  pressed: { opacity: 0.68 },
  centerState: { flexGrow: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 34, paddingBottom: 80 },
  emptyIcon: { width: 68, height: 68, borderRadius: 22, alignItems: "center", justifyContent: "center", marginBottom: 18 },
  emptyTitle: { fontSize: 19, fontWeight: "900", textAlign: "center" },
  emptyBody: { marginTop: 8, fontSize: 13, lineHeight: 20, textAlign: "center", maxWidth: 340 },
  primaryButton: { marginTop: 20, minWidth: 150, minHeight: 46, borderRadius: 14, alignItems: "center", justifyContent: "center", paddingHorizontal: 22 },
  primaryButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" },
});
