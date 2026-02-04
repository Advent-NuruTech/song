import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { SettingsProvider, useSettings } from "@/src/context/SettingsContext";
import { initDb } from "@/src/db/initDb";

/* ================================
   Inner layout (can access context)
   ================================ */
function AppLayout() {
  const { darkMode } = useSettings();

  return (
    <ThemeProvider value={darkMode ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="modal"
          options={{ presentation: "modal", title: "Modal" }}
        />
      </Stack>

      <StatusBar style={darkMode ? "light" : "dark"} />
    </ThemeProvider>
  );
}

/* ================================
   Root layout (wrap provider ONCE)
   ================================ */
export default function RootLayout() {
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        await initDb();
      } catch (e) {
        console.error("Failed to initialize database", e);
      } finally {
        if (mounted) setDbReady(true);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  if (!dbReady) {
    return (
      <View style={styles.splash}>
        <StatusBar style="light" />
        <Text style={styles.splashTitle}>Advent Pro</Text>
        <Text style={styles.splashSubtitle}>Powered by Advent Nurutech</Text>
      </View>
    );
  }

  return (
    <SettingsProvider>
      <AppLayout />
    </SettingsProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: "#0B4AA6",
    alignItems: "center",
    justifyContent: "center",
  },
  splashTitle: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  splashSubtitle: {
    color: "rgba(219,234,254,0.95)",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 10,
    letterSpacing: 0.4,
  },
});
