import Sidebar from "@/components/ui/Sidebar";
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { useEffect, useState } from "react";
import { AppState, Image, StyleSheet, View } from "react-native";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";

import { QuickFooterProvider } from "@/src/context/QuickFooterContext";
import { SettingsProvider, useSettings } from "@/src/context/SettingsContext";
import { initSchema, isFreshInstall, seedContent } from "@/src/db/initDb";
import { AuthProvider } from "@/src/auth/AuthContext";
import { syncSupabaseContent } from "@/src/content/supabase";

/* ================================
   Inner layout (can access context)
   ================================ */
function AppLayout() {
  const { darkMode } = useSettings();

  useEffect(() => {
    const sync = () => void syncSupabaseContent();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") sync();
    });
    const interval = setInterval(sync, 5 * 60 * 1000);
    return () => { subscription.remove(); clearInterval(interval); };
  }, []);

  return (
    <QuickFooterProvider>
      <ThemeProvider value={darkMode ? DarkTheme : DefaultTheme}>
        <View style={styles.appShell}>
          <Sidebar />
          <View style={styles.routeContent}>
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="modal"
                options={{ presentation: "modal", title: "Modal" }}
              />
            </Stack>
          </View>
        </View>
        <StatusBar style={darkMode ? "light" : "dark"} />
      </ThemeProvider>
    </QuickFooterProvider>
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
        // Schema is fast and deterministic — block only on this.
        await initSchema();

        if (await isFreshInstall()) {
          // First launch: seed the starter corpus before showing the UI.
          await seedContent();
          if (mounted) setDbReady(true);
        } else {
          // Warm start: show the UI immediately, refresh/sync in the background.
          if (mounted) setDbReady(true);
          void seedContent().catch((e) =>
            console.warn("Background content sync failed:", e)
          );
        }
      } catch (e) {
        console.error("Failed to initialize database", e);
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
        <Svg style={styles.splashGradient} width="100%" height="100%">
          <Defs>
            <RadialGradient id="splashBg" cx="50%" cy="50%" r="75%">
              <Stop offset="0%" stopColor="#001b4d" />
              <Stop offset="35%" stopColor="#000d2e" />
              <Stop offset="70%" stopColor="#00061c" />
              <Stop offset="100%" stopColor="#00030f" />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#splashBg)" />
        </Svg>
        <Image source={require("@/assets/images/icon.png")} style={styles.splashLogo} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <SettingsProvider>
          <AppLayout />
        </SettingsProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  appShell: { flex: 1 },
  routeContent: { flex: 1 },
  splash: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  splashGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  splashLogo: {
    width: 120,
    height: 120,
    borderRadius: 32,
  },
});
