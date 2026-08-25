import { useAppTheme } from "@/hooks/use-app-theme";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

export function DonationSuccess({ onContinue }: { onContinue: () => void }) {
  const { colors, fontFamily, size } = useAppTheme();
  return (
    <View style={styles.container}>
      <View style={styles.icon}><Ionicons name="heart" size={34} color="#FFFFFF" /></View>
      <Text style={[styles.title, { color: colors.text, fontFamily, fontSize: size(23) }]}>Thank You for Supporting the Work</Text>
      <Text style={[styles.copy, { color: colors.text, fontFamily }]}>Thank you for your voluntary support of Advent Pro.</Text>
      <Text style={[styles.copy, { color: colors.text, fontFamily }]}>Your contribution helps us continue maintaining the app, meeting server costs, improving its features, and making Present Truth resources freely accessible to everyone.</Text>
      <Text style={[styles.copy, { color: colors.text, fontFamily }]}>May God bless you for helping this work move forward.</Text>
      <View style={[styles.verse, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.verseText, { color: colors.text, fontFamily }]}>“Every man according as he purposeth in his heart, so let him give; not grudgingly, or of necessity: for God loveth a cheerful giver.”</Text>
        <Text style={[styles.reference, { color: colors.tint, fontFamily }]}>2 Corinthians 9:7</Text>
      </View>
      <Pressable onPress={onContinue} style={[styles.button, { backgroundColor: colors.primary }]}>
        <Text style={[styles.buttonText, { color: colors.onPrimary, fontFamily }]}>Continue</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, alignItems: "center" },
  icon: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#B45309", alignItems: "center", justifyContent: "center", marginBottom: 18 },
  title: { fontWeight: "800", textAlign: "center", lineHeight: 30, marginBottom: 20 },
  copy: { fontSize: 15, lineHeight: 23, textAlign: "center", marginBottom: 12 },
  verse: { borderWidth: 1, borderRadius: 16, padding: 18, marginTop: 8, width: "100%" },
  verseText: { fontSize: 15, lineHeight: 23, fontStyle: "italic", textAlign: "center" },
  reference: { textAlign: "center", fontWeight: "800", marginTop: 10 },
  button: { width: "100%", borderRadius: 14, paddingVertical: 15, alignItems: "center", marginTop: 24 },
  buttonText: { fontSize: 16, fontWeight: "800" },
});
