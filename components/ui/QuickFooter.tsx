import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import { useEffect } from "react";

import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppTheme } from "@/hooks/use-app-theme";
import { useQuickFooter } from "@/src/context/QuickFooterContext";

type FooterTab = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  path: string;
  match: (pathname: string) => boolean;
};

const FOOTER_TABS: FooterTab[] = [
  {
    key: "home",
    label: "Home",
    icon: "home-outline",
    path: "/",
    match: (pathname) => pathname === "/",
  },
  {
    key: "songs",
    label: "Songs",
    icon: "musical-notes-outline",
    path: "/categories",
    match: (pathname) =>
      pathname.startsWith("/categories") ||
      pathname.startsWith("/songs") ||
      pathname.startsWith("/song/"),
  },
  {
    key: "studies",
    label: "Studies",
    icon: "library-outline",
    path: "/studies",
    match: (pathname) =>
      pathname.startsWith("/studies"),
  },
  {
    key: "search",
    label: "Search",
    icon: "search-outline",
    path: "/search",
    match: (pathname) =>
      pathname.startsWith("/search"),
  },
  {
    key: "settings",
    label: "Settings",
    icon: "settings-outline",
    path: "/settings",
    match: (pathname) =>
      pathname.startsWith("/settings"),
  },
];

export default function QuickFooter() {
  const router = useRouter();

  const pathname = usePathname();

  const insets = useSafeAreaInsets();

  const {
    colors,
    size,
    fontFamily,
    darkMode,
  } = useAppTheme();

  const { visible, reset } = useQuickFooter();

  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withTiming(
      visible ? 0 : 90,
      {
        duration: 180,
      }
    );
  }, [translateY, visible]);

  useEffect(() => {
    reset();
  }, [pathname, reset]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: translateY.value,
      },
    ],
  }));

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.container,
        {
          bottom:
            Platform.OS === "ios"
              ? insets.bottom + 8
              : 10,
        },
        animatedStyle,
      ]}
    >
      <View
        style={[
          styles.footerCard,
          {
            backgroundColor: darkMode
              ? "#111827"
              : "#ffffff",

            borderColor: colors.border,

            shadowColor: "#000",
          },
        ]}
      >
        {FOOTER_TABS.map((tab) => {
          const active = tab.match(pathname);

          return (
            <Pressable
              key={tab.key}
              onPress={() => {
                if (tab.key === "songs") {
                  router.replace("/categories" as never);
                  return;
                }
                if (tab.match(pathname)) return;
                router.replace(tab.path as never);
              }}
              style={styles.tabButton}
            >
              <Ionicons
                name={tab.icon}
                size={size(19)}
                color={
                  active
                    ? colors.tint
                    : colors.mutedText
                }
              />

              <Text
                numberOfLines={1}
                style={[
                  styles.tabLabel,
                  {
                    color: active
                      ? colors.tint
                      : colors.mutedText,

                    fontSize: size(10),

                    fontFamily,
                  },
                ]}
              >
                {tab.label}
              </Text>

              {active && (
                <View
                  style={[
                    styles.activeLine,
                    {
                      backgroundColor:
                        colors.tint,
                    },
                  ]}
                />
              )}
            </Pressable>
          );
        })}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",

    left: 12,
    right: 12,

    zIndex: 999,
  },

  footerCard: {
    minHeight: 58,

    borderRadius: 18,

    borderWidth: 1,

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "space-between",

    paddingHorizontal: 4,

    ...Platform.select({
      ios: {
        shadowOffset: {
          width: 0,
          height: 6,
        },

        shadowOpacity: 0.08,

        shadowRadius: 12,
      },

      android: {
        elevation: 5,
      },
    }),
  },

  tabButton: {
    flex: 1,

    alignItems: "center",

    justifyContent: "center",

    paddingVertical: 8,
  },

  tabLabel: {
    marginTop: 2,

    fontWeight: "600",
  },

  activeLine: {
    width: 14,
    height: 3,

    borderRadius: 999,

    marginTop: 4,
  },
});
