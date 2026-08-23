import { Share2 } from "@/components/icons";
import { Pressable, StyleSheet, ViewStyle } from "react-native";

type ShareIconButtonProps = {
  color: string;
  borderColor: string;
  backgroundColor: string;
  onPress: () => void;
  style?: ViewStyle;
  size?: number;
  iconSize?: number;
};

export function ShareIconButton({
  color,
  borderColor,
  backgroundColor,
  onPress,
  style,
  size = 34,
  iconSize = 16,
}: ShareIconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Share"
      hitSlop={10}
      onPress={onPress}
      style={[
        styles.button,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor,
          backgroundColor,
        },
        style,
      ]}
    >
      <Share2 size={iconSize} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderWidth: 1,
    justifyContent: "center",
  },
});
