/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = "#0a7ea4";
const tintColorDark = "#2563EB";

export const Colors = {
  light: {
    text: "#111827",
    background: "#F9FAFB",
    tint: tintColorLight,
    primary: "#0A7EA4",
    onPrimary: "#FFFFFF",
    icon: "#687076",
    tabIconDefault: "#6B7280",
    tabIconSelected: tintColorLight,
    card: "#FFFFFF",
    surface: "#FFFFFF",
    border: "#E5E7EB",
    mutedText: "#6B7280",
    subtleText: "#9CA3AF",
    inputBackground: "#FFFFFF",
    highlight: "#FDE047",
  },
  dark: {
    text: "#F9FAFB",
    background: "#0B1220",
    tint: tintColorDark,
    primary: "#2563EB",
    onPrimary: "#FFFFFF",
    icon: "#9BA1A6",
    tabIconDefault: "#9CA3AF",
    tabIconSelected: tintColorDark,
    card: "#111827",
    surface: "#111827",
    border: "#1F2937",
    mutedText: "#9CA3AF",
    subtleText: "#6B7280",
    inputBackground: "#0F172A",
    highlight: "#F59E0B",
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
