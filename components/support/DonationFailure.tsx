import { useAppTheme } from "@/hooks/use-app-theme";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  message?: string;
  retryLabel?: string;
  onRetry: () => void;
  onContinue: () => void;
};

export function DonationFailure({
  message = "Payment was not completed. You can continue using Advent Pro normally.",
  retryLabel = "Retry",
  onRetry,
  onContinue,
}: Props) {
  const { colors, fontFamily, size } = useAppTheme();
  return (
    <View style={styles.container}>
      <Ionicons name="information-circle-outline" size={58} color={colors.tint} />
      <Text style={[styles.title, { color: colors.text, fontFamily, fontSize: size(22) }]}>Support Payment Not Completed</Text>
      <Text style={[styles.message, { color: colors.text, fontFamily }]}>{message}</Text>
      <Pressable onPress={onRetry} style={[styles.retry, { backgroundColor: colors.primary }]}>
        <Text style={[styles.retryText, { color: colors.onPrimary, fontFamily }]}>{retryLabel}</Text>
      </Pressable>
      <Pressable onPress={onContinue} style={[styles.continue, { borderColor: colors.border }]}>
        <Text style={[styles.continueText, { color: colors.text, fontFamily }]}>Continue</Text>
      </Pressable>
      <Text style={[styles.note, { color: colors.mutedText, fontFamily }]}>No Advent Pro feature or content is affected.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, alignItems: "center", justifyContent: "center" },
  title: { fontWeight: "800", textAlign: "center", marginTop: 14 },
  message: { fontSize: 15, lineHeight: 23, textAlign: "center", marginTop: 14, marginBottom: 12 },
  retry: { width: "100%", borderRadius: 14, paddingVertical: 15, alignItems: "center", marginTop: 16 },
  retryText: { fontSize: 16, fontWeight: "800" },
  continue: { width: "100%", borderRadius: 14, borderWidth: 1, paddingVertical: 14, alignItems: "center", marginTop: 10 },
  continueText: { fontSize: 15, fontWeight: "700" },
  note: { fontSize: 12, textAlign: "center", marginTop: 14 },
});
