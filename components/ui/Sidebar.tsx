import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppTheme } from "@/hooks/use-app-theme";
import { useAuth } from "@/src/auth/AuthContext";
import { useNotifications } from "@/src/context/NotificationsContext";

const PANEL_WIDTH = 286;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type NavItem = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  path: string;
  match: (pathname: string) => boolean;
};

const NAV_ITEMS: NavItem[] = [
  {
    key: "home",
    label: "Home",
    icon: "home-outline",
    path: "/",
    match: (p) => p === "/",
  },
  {
    key: "songs",
    label: "Songs",
    icon: "musical-notes-outline",
    path: "/categories",
    match: (p) =>
      p.startsWith("/categories") ||
      p.startsWith("/songs") ||
      p.startsWith("/song/"),
  },
  {
    key: "studies",
    label: "Studies",
    icon: "library-outline",
    path: "/studies",
    match: (p) => p.startsWith("/studies"),
  },
  {
    key: "notes",
    label: "My Notes",
    icon: "document-text-outline",
    path: "/notes",
    match: (p) => p.startsWith("/notes"),
  },
  {
    key: "workshop",
    label: "Study Workshop",
    icon: "people-outline",
    path: "/collaboration",
    match: (p) => p.startsWith("/collaboration"),
  },
  {
    key: "playlists",
    label: "Song Playlists",
    icon: "list-circle-outline",
    path: "/playlists",
    match: (p) => p.startsWith("/playlists"),
  },
  {
    key: "bible",
    label: "Bible",
    icon: "book-outline",
    path: "/bible",
    match: (p) => p.startsWith("/bible"),
  },
  {
    key: "media",
    label: "Media",
    icon: "play-circle-outline",
    path: "/media",
    match: (p) => p.startsWith("/media"),
  },
  {
    key: "donate",
    label: "Donate",
    icon: "heart-outline",
    path: "/donate",
    match: (p) => p.startsWith("/donate") || p.startsWith("/support"),
  },
  {
    key: "notifications",
    label: "Notifications",
    icon: "notifications-outline",
    path: "/notifications",
    match: (p) => p.startsWith("/notifications"),
  },
  {
    key: "search",
    label: "Search",
    icon: "search-outline",
    path: "/search",
    match: (p) => p.startsWith("/search"),
  },
  {
    key: "settings",
    label: "Settings",
    icon: "settings-outline",
    path: "/settings",
    match: (p) => p.startsWith("/settings"),
  },
  {
    key: "about",
    label: "About",
    icon: "information-circle-outline",
    path: "/about",
    match: (p) => p.startsWith("/about"),
  },
];

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { colors, size, fontFamily, darkMode } = useAppTheme();
  const auth = useAuth();
  const { unreadCount } = useNotifications();

  const [open, setOpen] = useState(false);

  // 0 = closed, 1 = open
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(open ? 1 : 0, { duration: 220 });
  }, [open, progress]);

  // Close the drawer whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: progress.value * 0.5,
  }));

  const panelStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(progress.value, [0, 1], [-PANEL_WIDTH, 0]),
      },
    ],
  }));

  const go = (item: NavItem) => {
    setOpen(false);
    if (item.match(pathname)) return;
    router.replace(item.path as never);
  };

  return (
    <>
      {/* This header is in the root layout, so every route starts below it. */}
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
            onPress={() => router.replace("/search" as never)}
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
          <Pressable
            accessibilityLabel="Open navigation menu"
            onPress={() => setOpen(true)}
            android_ripple={{ color: "#d1d5db", borderless: true }}
            style={[
              styles.headerButton,
              {
                backgroundColor: darkMode ? "#111827" : "#FFFFFF",
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons name="menu" size={size(22)} color={colors.text} />
          </Pressable>
        </View>
      </View>

      {/* Drawer overlay (always mounted, inert when closed) */}
      <View
        style={[StyleSheet.absoluteFill, styles.drawerLayer]}
        pointerEvents={open ? "auto" : "none"}
      >
        <AnimatedPressable
          accessibilityLabel="Close menu"
          onPress={() => setOpen(false)}
          style={[styles.backdrop, backdropStyle]}
        />

        <Animated.View
          style={[
            styles.panel,
            {
              backgroundColor: darkMode ? "#0b1220" : "#ffffff",
              borderRightColor: colors.border,
              paddingTop: insets.top + 18,
              paddingBottom: insets.bottom + 18,
            },
            panelStyle,
          ]}
        >
          {/* Brand header */}
          <View style={styles.brand}>
            <Image
              source={require("@/assets/images/icon.png")}
              style={styles.brandLogo}
              resizeMode="contain"
            />
            <View style={styles.brandText}>
              <Text
                style={[styles.brandTitle, { color: colors.text, fontFamily, fontSize: size(17) }]}
              >
                Advent Pro
              </Text>
              <Text
                style={[styles.brandSub, { color: colors.mutedText, fontFamily, fontSize: size(11) }]}
              >
                Present Truth Resource Center
              </Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <ScrollView
            style={styles.navScroll}
            contentContainerStyle={styles.navContent}
            showsVerticalScrollIndicator={false}
          >
            {NAV_ITEMS.map((item) => {
              const active = item.match(pathname);
              return (
                <Pressable
                  key={item.key}
                  onPress={() => go(item)}
                  android_ripple={{ color: "#d1d5db" }}
                  style={[
                    styles.navItem,
                    active && {
                      backgroundColor: darkMode
                        ? "rgba(56,189,248,0.12)"
                        : "rgba(11,74,166,0.08)",
                    },
                  ]}
                >
                  <Ionicons
                    name={item.icon}
                    size={size(20)}
                    color={active ? colors.tint : colors.mutedText}
                  />
                  <Text
                    style={[
                      styles.navLabel,
                      {
                        color: active ? colors.tint : colors.text,
                        fontFamily,
                        fontSize: size(15),
                        fontWeight: active ? "700" : "500",
                      },
                    ]}
                  >
                    {item.label}
                  </Text>
                  {active && (
                    <View style={[styles.activeBar, { backgroundColor: colors.tint }]} />
                  )}
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={[styles.accountDivider, { backgroundColor: colors.border }]} />
          <Pressable
            accessibilityLabel={auth.user ? "Open your account" : "Login or create an account"}
            onPress={() => {
              setOpen(false);
              if (!pathname.startsWith("/account")) router.replace("/account" as never);
            }}
            android_ripple={{ color: "#d1d5db" }}
            style={[
              styles.navItem,
              styles.accountItem,
              pathname.startsWith("/account") && {
                backgroundColor: darkMode
                  ? "rgba(56,189,248,0.12)"
                  : "rgba(11,74,166,0.08)",
              },
            ]}
          >
            <Ionicons
              name={auth.user ? "person-circle" : "log-in-outline"}
              size={size(21)}
              color={pathname.startsWith("/account") ? colors.tint : colors.mutedText}
            />
            <Text
              style={[
                styles.navLabel,
                {
                  color: pathname.startsWith("/account") ? colors.tint : colors.text,
                  fontFamily,
                  fontSize: size(15),
                  fontWeight: pathname.startsWith("/account") ? "700" : "600",
                },
              ]}
            >
              {auth.user ? "Account" : "Login"}
            </Text>
            {pathname.startsWith("/account") && (
              <View style={[styles.activeBar, { backgroundColor: colors.tint }]} />
            )}
          </Pressable>
        </Animated.View>
      </View>
    </>
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
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  homeBrandCopy: { flex: 1 },
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
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
  },
  drawerLayer: { zIndex: 1000, elevation: 30 },
  panel: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: PANEL_WIDTH,
    borderRightWidth: 1,
    paddingHorizontal: 14,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 4, height: 0 },
        shadowOpacity: 0.18,
        shadowRadius: 16,
      },
      android: { elevation: 16 },
    }),
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 6,
  },
  brandLogo: {
    width: 44,
    height: 44,
    borderRadius: 12,
  },
  brandText: {
    flex: 1,
  },
  brandTitle: {
    fontWeight: "800",
  },
  brandSub: {
    marginTop: 2,
    fontWeight: "500",
  },
  divider: {
    height: 1,
    marginVertical: 14,
    opacity: 0.6,
  },
  navScroll: {
    flex: 1,
  },
  navContent: {
    gap: 4,
  },
  accountDivider: {
    height: 1,
    marginTop: 12,
    marginBottom: 12,
    opacity: 0.6,
  },
  accountItem: {
    flexShrink: 0,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 12,
    overflow: "hidden",
  },
  navLabel: {
    flex: 1,
  },
  activeBar: {
    width: 4,
    height: 22,
    borderRadius: 999,
  },
});
