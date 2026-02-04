import { Tabs } from "expo-router";
import React from "react";
import { Platform } from "react-native";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useSettings } from "@/src/context/SettingsContext";

export default function TabLayout() {
  const { darkMode } = useSettings();

  const theme = darkMode ? "dark" : "light";
  const tintColor = Colors[theme].tint;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarActiveTintColor: tintColor,
        tabBarInactiveTintColor: darkMode ? "#9CA3AF" : "#6B7280",
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
        },
        tabBarItemStyle: {
          paddingVertical: 6,
        },
        tabBarStyle: {
          backgroundColor: darkMode ? "#0B1220" : "#F1F7FF",
          borderTopColor: darkMode ? "#1F2937" : "#CFE0FF",
          borderTopWidth: 1,
          height: Platform.OS === "ios" ? 84 : 70,
          paddingBottom: Platform.OS === "ios" ? 22 : 12,
          paddingTop: 8,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: darkMode ? 0.2 : 0.08,
          shadowRadius: 12,
          elevation: 12,
        },
      }}
    >
      {/* Home */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="house.fill" color={color} />
          ),
        }}
      />

      {/* Search */}
      <Tabs.Screen
        name="search"
        options={{
          title: "Search",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="magnifyingglass" color={color} />
          ),
        }}
      />

      {/* Settings */}
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="gearshape.fill" color={color} />
          ),
        }}
      />

      {/* About */}
      <Tabs.Screen
        name="about"
        options={{
          title: "About",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="info.circle" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
 
