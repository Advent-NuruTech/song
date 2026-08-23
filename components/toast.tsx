import { Check } from "@/components/icons";
import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text } from "react-native";

import { useAppTheme } from "@/hooks/use-app-theme";

type ToastProps = {
  message: string | null;
  onHide: () => void;
  duration?: number;
};

/**
 * Minimal auto-dismissing confirmation toast (e.g. "Copied to clipboard").
 * Render it once per screen and drive it with a message string.
 */
export function Toast({ message, onHide, duration = 1600 }: ToastProps) {
  const { size, fontFamily } = useAppTheme();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!message) return;

    Animated.timing(anim, {
      toValue: 1,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => {
      Animated.timing(anim, {
        toValue: 0,
        duration: 180,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) onHide();
      });
    }, duration);

    return () => clearTimeout(timer);
  }, [message, duration, anim, onHide]);

  if (!message) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.toast,
        {
          opacity: anim,
          transform: [
            {
              translateY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              }),
            },
          ],
        },
      ]}
    >
      <Check size={size(16)} color="#fff" />
      <Text style={[styles.text, { fontSize: size(14), fontFamily }]}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    bottom: 90,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(17,24,39,0.95)",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    zIndex: 999,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  text: { color: "#fff", fontWeight: "700" },
});
