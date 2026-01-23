import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { SettingsProvider, useSettings } from "./context/SettingsContext";

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
  return (
    <SettingsProvider>
      <AppLayout />
    </SettingsProvider>
  );
}
