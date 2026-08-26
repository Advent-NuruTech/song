import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import { Image, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppTheme } from "@/hooks/use-app-theme";
import { useNotifications } from "@/src/context/NotificationsContext";

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { colors, size, fontFamily, darkMode } = useAppTheme();
  const { unreadCount } = useNotifications();

  return (
    <View
      style={[
        styles.topNav,
        {
          height: insets.top + 68,
          paddingTop: insets.top,
          backgroundColor: darkMode ? "#0B1220" : "#FFFFFF",
          borderBottomColor: colors.border,
        },
      ]}
    >
      <View style={styles.homeBrand}>
        <Image
          source={require("@/assets/images/icon.png")}
          style={styles.homeLogo}
          resizeMode="contain"
        />
        <View style={styles.homeBrandCopy}>
          <Text
            numberOfLines={1}
            style={[
              styles.homeTitle,
              { color: colors.text, fontFamily, fontSize: size(17) },
            ]}
          >
            Advent Pro
          </Text>
          <Text
            numberOfLines={1}
            style={[
              styles.homeSubtitle,
              { color: colors.mutedText, fontFamily, fontSize: size(10) },
            ]}
          >
            Present Truth Resource Center
          </Text>
        </View>
      </View>

      <View style={styles.headerActions}>
        <Pressable
          accessibilityLabel={unreadCount ? `Notifications, ${unreadCount} unread` : "Notifications"}
          onPress={() => router.push("/notifications" as never)}
          android_ripple={{ color: "#d1d5db", borderless: true }}
          style={[
            styles.headerButton,
            {
              backgroundColor: pathname.startsWith("/notifications")
                ? `${colors.tint}14`
                : darkMode ? "#111827" : "#FFFFFF",
              borderColor: pathname.startsWith("/notifications") ? colors.tint : colors.border,
            },
          ]}
        >
          <Ionicons
            name={pathname.startsWith("/notifications") ? "notifications" : "notifications-outline"}
            size={size(20)}
            color={pathname.startsWith("/notifications") ? colors.tint : colors.text}
          />
          {unreadCount > 0 ? (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>{unreadCount > 99 ? "99+" : unreadCount}</Text>
            </View>
          ) : null}
        </Pressable>
        <Pressable
          accessibilityLabel="Global search for songs, Bible verses, and studies"
          onPress={() => router.push("/search" as never)}
          android_ripple={{ color: "#d1d5db", borderless: true }}
          style={[
            styles.headerButton,
            {
              backgroundColor: pathname.startsWith("/search")
                ? `${colors.tint}14`
                : darkMode
                  ? "#111827"
                  : "#FFFFFF",
              borderColor: pathname.startsWith("/search") ? colors.tint : colors.border,
            },
          ]}
        >
          <Ionicons
            name="search"
            size={size(20)}
            color={pathname.startsWith("/search") ? colors.tint : colors.text}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topNav: {
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  homeBrand: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  homeBrandCopy: { flex: 1, minWidth: 0 },
  homeLogo: { width: 42, height: 42, borderRadius: 11 },
  homeTitle: { fontWeight: "900", letterSpacing: 0.1 },
  homeSubtitle: { marginTop: 1, fontWeight: "600" },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8, marginLeft: 10 },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
      },
      android: { elevation: 5 },
    }),
  },
  notificationBadge: {
    position: "absolute", top: -5, right: -5, minWidth: 19, height: 19,
    paddingHorizontal: 4, borderRadius: 10, backgroundColor: "#DC2626",
    alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#FFFFFF",
  },
  notificationBadgeText: { color: "#FFFFFF", fontSize: 9, lineHeight: 11, fontWeight: "900" },
});
