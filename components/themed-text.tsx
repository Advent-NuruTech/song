import { Text, type TextProps } from "react-native";

import { useAppTheme } from "@/hooks/use-app-theme";
import { useThemeColor } from "@/hooks/use-theme-color";

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');
  const { size, fontFamily, colors } = useAppTheme();

  const typeStyles = {
    default: {
      fontSize: size(16),
      lineHeight: size(24),
      fontFamily,
    },
    defaultSemiBold: {
      fontSize: size(16),
      lineHeight: size(24),
      fontWeight: "600" as const,
      fontFamily,
    },
    title: {
      fontSize: size(32),
      fontWeight: "bold" as const,
      lineHeight: size(36),
      fontFamily,
    },
    subtitle: {
      fontSize: size(20),
      fontWeight: "bold" as const,
      lineHeight: size(26),
      fontFamily,
    },
    link: {
      lineHeight: size(30),
      fontSize: size(16),
      color: colors.tint,
      fontFamily,
    },
  } as const;

  return (
    <Text
      style={[
        { color },
        typeStyles[type],
        style,
      ]}
      {...rest}
    />
  );
}
