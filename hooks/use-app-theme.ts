import { Colors, Fonts } from "@/constants/theme";
import { useSettings } from "@/src/context/SettingsContext";

export function useAppTheme() {
  const { darkMode, fontSize } = useSettings();
  const theme = darkMode ? "dark" : "light";
  const colors = Colors[theme];
  const baseFontSize = Math.max(12, fontSize);
  const scale = baseFontSize / 16;

  const size = (value: number) => Math.round(value * scale);

  return {
    darkMode,
    theme,
    colors,
    fontFamily: Fonts.sans,
    baseFontSize,
    size,
  };
}
