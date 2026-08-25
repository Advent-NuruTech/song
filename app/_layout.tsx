import Sidebar from "@/components/ui/Sidebar";
import QuickFooter from "@/components/ui/QuickFooter";
import { MonthlySupportPrompt } from "@/components/support/MonthlySupportPrompt";
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";

import { useEffect, useState } from "react";
import { AppState, Image, StyleSheet, View } from "react-native";

import { QuickFooterProvider } from "@/src/context/QuickFooterContext";
import { SettingsProvider, useSettings } from "@/src/context/SettingsContext";
import { Colors } from "@/constants/theme";
import { initSchema, isFreshInstall, seedContent } from "@/src/db/initDb";
import { AuthProvider, useAuth } from "@/src/auth/AuthContext";
import { syncSupabaseContent } from "@/src/content/supabase";
import { syncPersonalContent } from "@/src/features/personal/personalService";
import { useMonthlySupportPrompt } from "@/hooks/useMonthlySupportPrompt";
import { useDonationReturnState } from "@/hooks/useDonationReturnState";

/* ================================
   Inner layout (can access context)
   ================================ */
function AppLayout() {
  const { darkMode } = useSettings();
  const insets = useSafeAreaInsets();
  const backgroundColor = Colors[darkMode ? "dark" : "light"].background;
  const auth = useAuth();
  const pathname = usePathname();
  const supportPrompt = useMonthlySupportPrompt(pathname);
  const { openSupport } = useDonationReturnState();

  useEffect(() => {
    const sync = () => {
      void syncSupabaseContent();
      if (auth.user?.id) void syncPersonalContent(auth.user.id);
    };
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") sync();
    });
    const interval = setInterval(sync, 5 * 60 * 1000);
    return () => { subscription.remove(); clearInterval(interval); };
  }, [auth.user?.id]);

  return (
    <QuickFooterProvider>
      <ThemeProvider value={darkMode ? DarkTheme : DefaultTheme}>
        <View style={[styles.appShell, { backgroundColor }]}>
          <Sidebar />
          <View style={[styles.routeContent, { paddingBottom: insets.bottom + 72, backgroundColor }]}>
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="account" options={{ headerShown: false }} />
              <Stack.Screen name="support/index" options={{ headerShown: false }} />
              <Stack.Screen name="support/checkout" options={{ headerShown: false, gestureEnabled: false }} />
              <Stack.Screen
                name="modal"
                options={{ presentation: "modal", title: "Modal" }}
              />
            </Stack>
          </View>
          <QuickFooter />
        </View>
        <MonthlySupportPrompt
          visible={supportPrompt.visible}
          onDismiss={supportPrompt.dismiss}
          onProceed={() => {
            supportPrompt.dismiss();
            void openSupport();
          }}
        />
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
        <StatusBar style="dark" />
        <Image
          source={require("@/assets/images/splash-logo-transparent.png")}
          style={styles.splashLogo}
          resizeMode="contain"
        />
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
    backgroundColor: "#FFFFFF",
  },
  splashLogo: {
    width: 220,
    height: 220,
  },
});
