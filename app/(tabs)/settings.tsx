import { MaterialIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { useSettings } from "../context/SettingsContext";

export default function SettingsScreen() {
  const { darkMode, fontSize, setDarkMode, setFontSize } = useSettings();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: darkMode ? "#111827" : "#F9FAFB" },
      ]}
    >
      <Text
        style={[
          styles.title,
          { fontSize: fontSize + 6, color: darkMode ? "#fff" : "#111" },
        ]}
      >
        Settings
      </Text>

      <View style={styles.card}>
        <View style={styles.row}>
          <MaterialIcons name="dark-mode" size={24} color="#6366F1" />
          <Text style={[styles.label, { fontSize }]}>Dark Mode</Text>
          <Switch value={darkMode} onValueChange={setDarkMode} />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={[styles.sectionTitle, { fontSize }]}>Font Size</Text>

        <View style={styles.fontRow}>
          <Pressable onPress={() => setFontSize(Math.max(12, fontSize - 2))}>
            <Text style={styles.btn}>A−</Text>
          </Pressable>

          <Text style={{ fontSize }}>{fontSize}px</Text>

          <Pressable onPress={() => setFontSize(Math.min(26, fontSize + 2))}>
            <Text style={styles.btn}>A+</Text>
          </Pressable>
        </View>
      </View>
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
    letterSpacing: 0.3,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,

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
    color: "#111827",
  },

  sectionTitle: {
    fontWeight: "600",
    color: "#374151",
    marginBottom: 12,
  },

  fontRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },

  btn: {
    fontSize: 20,
    fontWeight: "700",
    color: "#6366F1",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#EEF2FF",
  },
});
