import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { useAppTheme } from "@/hooks/use-app-theme";
import { useAdminMode } from "@/src/admin/adminAccess";
import {
  exportDatabaseBackup,
  getAdminDashboardSummary,
  restoreDatabaseBackup,
} from "@/src/services/adminService";

type DashboardSummary = {
  songs: number;
  studies: number;
  categories: number;
};

const INITIAL_SUMMARY: DashboardSummary = {
  songs: 0,
  studies: 0,
  categories: 0,
};

function isCancelError(error: unknown) {
  const message = String((error as Error)?.message ?? error).toLowerCase();
  return message.includes("cancel");
}

export default function AdminDashboard() {
  const { colors, size, fontFamily, darkMode } = useAppTheme();
  const { enabled, loading, refresh, setEnabled } = useAdminMode();

  const [summary, setSummary] = useState<DashboardSummary>(INITIAL_SUMMARY);
  const [busyAction, setBusyAction] = useState<"backup" | "restore" | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadSummary = useCallback(async () => {
    setRefreshing(true);
    try {
      const next = await getAdminDashboardSummary();
      setSummary(next);
    } catch (error) {
      console.error("Failed to load admin summary:", error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
      void loadSummary();
    }, [refresh, loadSummary])
  );

  const handleBackup = async () => {
    setBusyAction("backup");
    try {
      const result = await exportDatabaseBackup();
      Alert.alert("Backup completed", `Database exported to:\n${result.uri}`);
    } catch (error) {
      if (!isCancelError(error)) {
        Alert.alert(
          "Backup failed",
          (error as Error)?.message || "Could not export database."
        );
      }
    } finally {
      setBusyAction(null);
    }
  };

  const handleRestore = async () => {
    setBusyAction("restore");
    try {
      const result = await restoreDatabaseBackup();
      await loadSummary();
      Alert.alert(
        "Restore completed",
        `Database restored from:\n${result.uri}\n\nReload open screens to see latest data.`
      );
    } catch (error) {
      if (!isCancelError(error)) {
        Alert.alert(
          "Restore failed",
          (error as Error)?.message || "Could not restore database."
        );
      }
    } finally {
      setBusyAction(null);
    }
  };

  const confirmRestore = () => {
    Alert.alert(
      "Restore database",
      "This will replace current SQLite data. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Restore",
          style: "destructive",
          onPress: () => {
            void handleRestore();
          },
        },
      ]
    );
  };

  const confirmDisableAdmin = () => {
    Alert.alert("Disable Admin Mode", "Disable admin access now?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Disable",
        style: "destructive",
        onPress: () => {
          void (async () => {
            await setEnabled(false);
            router.replace("/(tabs)/about");
          })();
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text
          style={[
            styles.loadingText,
            { color: colors.mutedText, fontSize: size(15), fontFamily },
          ]}
        >
          Checking admin access...
        </Text>
      </View>
    );
  }

  if (!enabled) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <StatusBar
          barStyle={darkMode ? "light-content" : "dark-content"}
          backgroundColor={colors.background}
        />
        <Ionicons name="lock-closed-outline" size={size(34)} color={colors.mutedText} />
        <Text
          style={[
            styles.lockedTitle,
            { color: colors.text, fontSize: size(20), fontFamily },
          ]}
        >
          Admin Mode Locked
        </Text>
        <Text
          style={[
            styles.lockedMessage,
            { color: colors.mutedText, fontSize: size(14), fontFamily },
          ]}
        >
          Go to About screen and tap app version 5 times.
        </Text>
        <Pressable
          onPress={() => router.replace("/(tabs)/about")}
          style={[styles.backButton, { backgroundColor: colors.tint }]}
        >
          <Text
            style={[
              styles.backButtonText,
              { color: "#FFFFFF", fontSize: size(14), fontFamily },
            ]}
          >
            Back to About
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={darkMode ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          entering={FadeInDown.springify().damping(16)}
          style={[
            styles.headerCard,
            {
              borderColor: colors.border,
              backgroundColor: colors.card,
              shadowColor: darkMode ? "#000" : "#0f172a",
            },
          ]}
        >
          <View style={styles.headerRow}>
            <View>
              <Text
                style={[
                  styles.headerTitle,
                  { color: colors.text, fontSize: size(22), fontFamily },
                ]}
              >
                Admin Dashboard
              </Text>
              <Text
                style={[
                  styles.headerSubtitle,
                  { color: colors.mutedText, fontSize: size(14), fontFamily },
                ]}
              >
                Offline content management
              </Text>
            </View>
            <Pressable onPress={() => void loadSummary()} disabled={refreshing}>
              {refreshing ? (
                <ActivityIndicator size="small" color={colors.tint} />
              ) : (
                <Ionicons name="refresh-outline" size={size(24)} color={colors.tint} />
              )}
            </Pressable>
          </View>

          <View style={styles.summaryGrid}>
            <View style={[styles.summaryCard, { borderColor: colors.border }]}>
              <Text
                style={[
                  styles.summaryValue,
                  { color: colors.text, fontSize: size(22), fontFamily },
                ]}
              >
                {summary.songs}
              </Text>
              <Text
                style={[
                  styles.summaryLabel,
                  { color: colors.mutedText, fontSize: size(12), fontFamily },
                ]}
              >
                Songs
              </Text>
            </View>

            <View style={[styles.summaryCard, { borderColor: colors.border }]}>
              <Text
                style={[
                  styles.summaryValue,
                  { color: colors.text, fontSize: size(22), fontFamily },
                ]}
              >
                {summary.studies}
              </Text>
              <Text
                style={[
                  styles.summaryLabel,
                  { color: colors.mutedText, fontSize: size(12), fontFamily },
                ]}
              >
                Studies
              </Text>
            </View>

            <View style={[styles.summaryCard, { borderColor: colors.border }]}>
              <Text
                style={[
                  styles.summaryValue,
                  { color: colors.text, fontSize: size(22), fontFamily },
                ]}
              >
                {summary.categories}
              </Text>
              <Text
                style={[
                  styles.summaryLabel,
                  { color: colors.mutedText, fontSize: size(12), fontFamily },
                ]}
              >
                Categories
              </Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80).springify().damping(16)}>
          <DashboardItem
            title="Manage Songs"
            subtitle="Search, filter, add, edit, and delete songs."
            icon="musical-notes-outline"
            tint={colors.tint}
            colors={colors}
            size={size}
            fontFamily={fontFamily}
            onPress={() => router.push("/admin/SongsManager")}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(130).springify().damping(16)}>
          <DashboardItem
            title="Manage Studies"
            subtitle="Update studies, mark featured, and control content."
            icon="library-outline"
            tint={colors.tint}
            colors={colors}
            size={size}
            fontFamily={fontFamily}
            onPress={() => router.push("/admin/StudiesManager")}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(180).springify().damping(16)}>
          <DashboardItem
            title="Manage Categories"
            subtitle="Add/edit/delete study categories with color and icon."
            icon="pricetags-outline"
            tint={colors.tint}
            colors={colors}
            size={size}
            fontFamily={fontFamily}
            onPress={() => router.push("/admin/CategoriesManager")}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(210).springify().damping(16)}>
          <DashboardItem
            title="Manage About Page"
            subtitle="Edit Byron’s story and its offline photo gallery."
            icon="information-circle-outline"
            tint={colors.tint}
            colors={colors}
            size={size}
            fontFamily={fontFamily}
            onPress={() => router.push("/admin/AboutManager" as never)}
          />
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(250).springify().damping(16)}
          style={[
            styles.backupCard,
            {
              borderColor: colors.border,
              backgroundColor: colors.card,
              shadowColor: darkMode ? "#000" : "#0f172a",
            },
          ]}
        >
          <Text
            style={[
              styles.backupTitle,
              { color: colors.text, fontSize: size(18), fontFamily },
            ]}
          >
            Backup / Restore Database
          </Text>

          <View style={styles.backupActions}>
            <Pressable
              onPress={() => void handleBackup()}
              disabled={busyAction !== null}
              style={[
                styles.actionButton,
                {
                  backgroundColor: colors.tint,
                  opacity: busyAction && busyAction !== "backup" ? 0.6 : 1,
                },
              ]}
            >
              {busyAction === "backup" ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={size(18)} color="#FFFFFF" />
                  <Text
                    style={[
                      styles.actionButtonText,
                      { color: "#FFFFFF", fontSize: size(14), fontFamily },
                    ]}
                  >
                    Export Backup
                  </Text>
                </>
              )}
            </Pressable>

            <Pressable
              onPress={confirmRestore}
              disabled={busyAction !== null}
              style={[
                styles.actionButton,
                {
                  backgroundColor: "#DC2626",
                  opacity: busyAction && busyAction !== "restore" ? 0.6 : 1,
                },
              ]}
            >
              {busyAction === "restore" ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="cloud-download-outline" size={size(18)} color="#FFFFFF" />
                  <Text
                    style={[
                      styles.actionButtonText,
                      { color: "#FFFFFF", fontSize: size(14), fontFamily },
                    ]}
                  >
                    Restore Backup
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </Animated.View>

        <Pressable
          onPress={confirmDisableAdmin}
          style={[
            styles.disableButton,
            { borderColor: colors.border, backgroundColor: colors.card },
          ]}
        >
          <Ionicons name="lock-closed-outline" size={size(16)} color={colors.mutedText} />
          <Text
            style={[
              styles.disableButtonText,
              { color: colors.mutedText, fontSize: size(13), fontFamily },
            ]}
          >
            Disable Admin Mode
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function DashboardItem({
  title,
  subtitle,
  icon,
  tint,
  colors,
  size,
  fontFamily,
  onPress,
}: {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  colors: {
    card: string;
    border: string;
    text: string;
    mutedText: string;
  };
  size: (value: number) => number;
  fontFamily: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.menuCard,
        {
          borderColor: colors.border,
          backgroundColor: colors.card,
        },
      ]}
    >
      <View style={[styles.menuIconWrap, { backgroundColor: `${tint}20` }]}>
        <Ionicons name={icon} size={size(22)} color={tint} />
      </View>
      <View style={styles.menuContent}>
        <Text
          style={[
            styles.menuTitle,
            { color: colors.text, fontSize: size(16), fontFamily },
          ]}
        >
          {title}
        </Text>
        <Text
          style={[
            styles.menuSubtitle,
            { color: colors.mutedText, fontSize: size(13), fontFamily },
          ]}
        >
          {subtitle}
        </Text>
      </View>
      <Ionicons name="chevron-forward-outline" size={size(20)} color={colors.mutedText} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: Platform.OS === "ios" ? 56 : 26,
    gap: 12,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
  },
  loadingText: {
    marginTop: 12,
    fontWeight: "500",
  },
  lockedTitle: {
    marginTop: 12,
    fontWeight: "700",
  },
  lockedMessage: {
    marginTop: 8,
    textAlign: "center",
    lineHeight: 20,
  },
  backButton: {
    marginTop: 18,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backButtonText: {
    fontWeight: "600",
  },
  headerCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 3,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontWeight: "700",
  },
  headerSubtitle: {
    marginTop: 4,
    fontWeight: "500",
  },
  summaryGrid: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
  },
  summaryCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  summaryValue: {
    fontWeight: "800",
  },
  summaryLabel: {
    marginTop: 2,
    fontWeight: "500",
    textTransform: "uppercase",
  },
  menuCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  menuIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontWeight: "700",
  },
  menuSubtitle: {
    marginTop: 4,
    lineHeight: 18,
    fontWeight: "500",
  },
  backupCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 3,
  },
  backupTitle: {
    fontWeight: "700",
  },
  backupActions: {
    marginTop: 12,
    gap: 10,
  },
  actionButton: {
    borderRadius: 12,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
  },
  actionButtonText: {
    fontWeight: "600",
  },
  disableButton: {
    marginTop: 6,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  disableButtonText: {
    fontWeight: "600",
  },
});
