import { useSettings } from "@/src/context/SettingsContext";

export function useColorScheme() {
  const { darkMode } = useSettings();
  return darkMode ? "dark" : "light";
}
