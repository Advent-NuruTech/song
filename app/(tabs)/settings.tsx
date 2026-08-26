import { MaterialIcons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { router } from "expo-router";
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";

import { useAppTheme } from "@/hooks/use-app-theme";
import { useSettings } from "@/src/context/SettingsContext";
import { useNotifications } from "@/src/context/NotificationsContext";
import type { NotificationPreferenceKey } from "@/src/features/notifications/types";

export default function SettingsScreen() {
  const { darkMode, fontSize, setDarkMode, setFontSize, resetSettings } =
    useSettings();

  const { colors, size, fontFamily } = useAppTheme();
  const notificationSettings = useNotifications();

  const appVersion =
    Constants.expoConfig?.version || Constants.manifest?.version || "1.0.0";

  const handleReset = () => {
    Alert.alert("Reset Settings", "Restore default settings?", [
      { text: "Cancel", style: "cancel" },
      { text: "Reset", onPress: resetSettings },
    ]);
  };

  const toggleNotifications = async (enabled: boolean) => {
    if (!enabled) {
      await notificationSettings.disable();
      return;
    }
    try {
      const granted = await notificationSettings.enable();
      if (!granted) {
        Alert.alert(
          "Notifications are off",
          "Allow notifications in Android settings to receive the 6:00 AM verse and important updates.",
          [
            { text: "Not now", style: "cancel" },
            { text: "Open settings", onPress: () => void Linking.openSettings() },
          ]
        );
      }
    } catch (error) {
      console.warn("Unable to enable notifications", error);
      Alert.alert("Couldn’t enable notifications", "Please check your connection and try again.");
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: 40 }}
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

      {Platform.OS !== "web" ? (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.notificationHeader}>
            <View style={[styles.notificationIcon, { backgroundColor: `${colors.tint}15` }]}>
              <MaterialIcons name="notifications-active" size={24} color={colors.tint} />
            </View>
            <View style={styles.notificationHeaderCopy}>
              <Text style={[styles.sectionTitle, { fontSize: size(16), color: colors.text, fontFamily, marginBottom: 3 }]}>Notifications</Text>
              <Text style={[styles.helperText, { color: colors.mutedText, fontFamily }]}>Useful reminders only—never an alert for every action.</Text>
            </View>
            <Switch
              value={notificationSettings.preferences.masterEnabled && notificationSettings.permission === "granted"}
              onValueChange={(value) => void toggleNotifications(value)}
              disabled={!notificationSettings.ready}
            />
          </View>

          <View style={[styles.innerDivider, { backgroundColor: colors.border }]} />
          <NotificationToggle label="Daily Bible verse" detail="Every day at 6:00 AM" settingKey="dailyVerse" disabled={!notificationSettings.preferences.masterEnabled} />
          <NotificationToggle label="New studies & videos" detail="One thoughtfully bundled alert per day" settingKey="newContent" disabled={!notificationSettings.preferences.masterEnabled} />
          <NotificationToggle label="Replies" detail="Important replies can arrive immediately" settingKey="replies" disabled={!notificationSettings.preferences.masterEnabled} />
          <NotificationToggle label="Community activity" detail="Likes are grouped into a helpful summary" settingKey="engagementDigest" disabled={!notificationSettings.preferences.masterEnabled} />
          <NotificationToggle label="Donation receipts" detail="A private thank-you after confirmed support" settingKey="donations" disabled={!notificationSettings.preferences.masterEnabled} />
          <NotificationToggle label="App updates" detail="Know when a verified Play Store release is live" settingKey="appUpdates" disabled={!notificationSettings.preferences.masterEnabled} last />
        </View>
      ) : null}

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

function NotificationToggle({
  label,
  detail,
  settingKey,
  disabled,
  last = false,
}: {
  label: string;
  detail: string;
  settingKey: NotificationPreferenceKey;
  disabled: boolean;
  last?: boolean;
}) {
  const { colors, fontFamily } = useAppTheme();
  const notifications = useNotifications();
  return (
    <View style={[styles.preferenceRow, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }, disabled && styles.disabled]}>
      <View style={styles.preferenceCopy}>
        <Text style={[styles.preferenceLabel, { color: colors.text, fontFamily }]}>{label}</Text>
        <Text style={[styles.helperText, { color: colors.mutedText, fontFamily }]}>{detail}</Text>
      </View>
      <Switch
        value={notifications.preferences[settingKey]}
        onValueChange={(value) => void notifications.setPreference(settingKey, value)}
        disabled={disabled}
      />
    </View>
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
  notificationHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  notificationIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  notificationHeaderCopy: { flex: 1 },
  helperText: { fontSize: 11, lineHeight: 16 },
  innerDivider: { height: StyleSheet.hairlineWidth, marginTop: 15 },
  preferenceRow: { minHeight: 66, flexDirection: "row", alignItems: "center", gap: 12 },
  preferenceCopy: { flex: 1, paddingVertical: 10 },
  preferenceLabel: { fontSize: 14, fontWeight: "700", marginBottom: 2 },
  disabled: { opacity: 0.45 },
});
