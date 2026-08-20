import { MaterialIcons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { router } from "expo-router";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";

import { useAppTheme } from "@/hooks/use-app-theme";
import { useQuickFooter } from "@/src/context/QuickFooterContext";
import { useSettings } from "@/src/context/SettingsContext";

export default function SettingsScreen() {
  const { reportScroll } = useQuickFooter();
  const { darkMode, fontSize, setDarkMode, setFontSize, resetSettings } =
    useSettings();

  const { colors, size, fontFamily } = useAppTheme();

  const appVersion =
    Constants.expoConfig?.version || Constants.manifest?.version || "1.0.0";

  const handleReset = () => {
    Alert.alert("Reset Settings", "Restore default settings?", [
      { text: "Cancel", style: "cancel" },
      { text: "Reset", onPress: resetSettings },
    ]);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: 40 }}
      onScroll={(event) => reportScroll(event.nativeEvent.contentOffset.y)}
      scrollEventThrottle={16}
    >
      <Text
        style={[
          styles.title,
          { fontSize: size(22), color: colors.text, fontFamily },
        ]}
      >
        Settings
      </Text>

      {/* Dark Mode */}
      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <View style={styles.row}>
          <MaterialIcons name="dark-mode" size={24} color={colors.tint} />

          <Text
            style={[
              styles.label,
              { fontSize: size(16), color: colors.text, fontFamily },
            ]}
          >
            Dark Mode
          </Text>

          <Switch value={darkMode} onValueChange={setDarkMode} />
        </View>
      </View>

      {/* Font Size */}
      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Text
          style={[
            styles.sectionTitle,
            { fontSize: size(16), color: colors.text, fontFamily },
          ]}
        >
          Font Size
        </Text>

        <View style={styles.fontRow}>
          <Pressable onPress={() => setFontSize(Math.max(12, fontSize - 2))}>
            <Text
              style={[
                styles.btn,
                { color: colors.tint, fontFamily, backgroundColor: colors.surface },
              ]}
            >
              A-
            </Text>
          </Pressable>

          <Text style={{ fontSize: size(16), color: colors.text, fontFamily }}>
            {fontSize}px
          </Text>

          <Pressable onPress={() => setFontSize(Math.min(30, fontSize + 2))}>
            <Text
              style={[
                styles.btn,
                { color: colors.tint, fontFamily, backgroundColor: colors.surface },
              ]}
            >
              A+
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Reset Settings */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Pressable style={styles.row} onPress={() => router.push("/account")}>
          <MaterialIcons name="account-circle" size={24} color={colors.tint} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { fontSize: size(16), color: colors.text, fontFamily }]}>Account &amp; access</Text>
            <Text style={{ color: colors.mutedText, fontSize: size(12), fontFamily }}>Sign in, sign up, and view your roles</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={colors.text} />
        </Pressable>
      </View>

      {/* Reset Settings */}
      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Pressable style={styles.row} onPress={handleReset}>
          <MaterialIcons name="restore" size={24} color={colors.tint} />
          <Text
            style={[
              styles.label,
              { fontSize: size(16), color: colors.text, fontFamily },
            ]}
          >
            Reset Settings
          </Text>
        </Pressable>
      </View>
{/* About App */}
<View
  style={[
    styles.card,
    {
      backgroundColor: colors.card,
      borderColor: colors.border,
    },
  ]}
>
  <Pressable
  style={styles.row}
  onPress={() => router.push("/about")}
>
    <MaterialIcons
      name="info-outline"
      size={24}
      color={colors.tint}
    />

    <View style={{ flex: 1 }}>
      <Text
        style={[
          styles.label,
          {
            fontSize: size(16),
            color: colors.text,
            fontFamily,
            marginBottom: 2,
          },
        ]}
      >
        About This App
      </Text>

      <Text
        style={{
          color: colors.text,
          opacity: 0.6,
          fontSize: size(12),
          fontFamily,
        }}
      >
        Learn more about Advent Pro
      </Text>
    </View>

    <MaterialIcons
      name="chevron-right"
      size={24}
      color={colors.text}
    />
  </Pressable>
</View>

      {/* App Version */}
      <View style={styles.footer}>
        <Text style={{ color: colors.text, opacity: 0.6, fontFamily }}>
          App Version {appVersion}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 48,
  },
  title: {
    fontWeight: "700",
    marginBottom: 24,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  label: {
    flex: 1,
    fontWeight: "500",
  },
  sectionTitle: {
    fontWeight: "600",
    marginBottom: 12,
  },
  fontRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  btn: {
    fontSize: 20,
    fontWeight: "700",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  footer: {
    marginTop: 20,
    alignItems: "center",
  },
});
