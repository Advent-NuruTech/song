import { LucideIcon } from "lucide-react-native";
import { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useAppTheme } from "@/hooks/use-app-theme";

export type ShareSheetOption = {
  key: string;
  label: string;
  hint?: string;
  icon: LucideIcon;
  onPress: () => void;
};

type ShareSheetProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  options: ShareSheetOption[];
};

/**
 * A themed bottom action sheet used for share / copy choices across songs,
 * studies and scripture. Keeps each screen's share button to a single tap that
 * opens a consistent menu.
 */
export function ShareSheet({
  visible,
  onClose,
  title,
  subtitle,
  options,
}: ShareSheetProps) {
  const { colors, size, fontFamily } = useAppTheme();
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(slide, {
      toValue: visible ? 1 : 0,
      duration: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [visible, slide]);

  const translateY = slide.interpolate({
    inputRange: [0, 1],
    outputRange: [400, 0],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              transform: [{ translateY }],
            },
          ]}
          // Stop taps inside the sheet from closing it.
          onStartShouldSetResponder={() => true}
        >
          <View style={[styles.grabber, { backgroundColor: colors.border }]} />

          <Text
            style={[styles.title, { color: colors.text, fontSize: size(17), fontFamily }]}
            numberOfLines={1}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text
              style={[
                styles.subtitle,
                { color: colors.mutedText, fontSize: size(13), fontFamily },
              ]}
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          ) : null}

          <ScrollView
            style={styles.optionsScroll}
            contentContainerStyle={styles.options}
            showsVerticalScrollIndicator={false}
          >
            {options.map((option) => {
              const Icon = option.icon;
              return (
                <Pressable
                  key={option.key}
                  onPress={() => {
                    onClose();
                    // Defer so the sheet closes before the action fires.
                    setTimeout(option.onPress, 10);
                  }}
                  android_ripple={{ color: `${colors.tint}22` }}
                  style={({ pressed }) => [
                    styles.option,
                    {
                      borderColor: colors.border,
                      backgroundColor: pressed ? `${colors.tint}10` : "transparent",
                    },
                  ]}
                >
                  <View
                    style={[styles.iconWrap, { backgroundColor: `${colors.tint}14` }]}
                  >
                    <Icon size={size(20)} color={colors.tint} />
                  </View>
                  <View style={styles.optionText}>
                    <Text
                      style={[
                        styles.optionLabel,
                        { color: colors.text, fontSize: size(16), fontFamily },
                      ]}
                    >
                      {option.label}
                    </Text>
                    {option.hint ? (
                      <Text
                        style={[
                          styles.optionHint,
                          { color: colors.mutedText, fontSize: size(12), fontFamily },
                        ]}
                      >
                        {option.hint}
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>

          <Pressable
            onPress={onClose}
            style={[styles.cancel, { borderColor: colors.border }]}
          >
            <Text
              style={[
                styles.cancelText,
                { color: colors.mutedText, fontSize: size(15), fontFamily },
              ]}
            >
              Cancel
            </Text>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 32,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  title: { fontWeight: "800", textAlign: "center" },
  subtitle: { textAlign: "center", marginTop: 2, fontWeight: "500" },
  optionsScroll: {
    marginTop: 18,
    maxHeight: Platform.OS === "ios" ? 380 : 360,
  },
  options: { gap: 10 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  optionText: { flex: 1 },
  optionLabel: { fontWeight: "700" },
  optionHint: { marginTop: 2, fontWeight: "500" },
  cancel: {
    marginTop: 16,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: "center",
  },
  cancelText: { fontWeight: "700" },
});
