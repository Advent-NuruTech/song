import { DonationAmountForm } from "@/components/support/DonationAmountForm";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useDonationReturnState } from "@/hooks/useDonationReturnState";
import { useAuth } from "@/src/auth/AuthContext";
import { initializeDonation } from "@/src/services/donations/donationService";
import { isTrustedPaystackCheckoutUrl, isValidDonationReference } from "@/src/services/donations/paystackService";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { Href, router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

export default function SupportScreen() {
  const { colors, fontFamily, size } = useAppTheme();
  const { user } = useAuth();
  const { returnToPreviousContent } = useDonationReturnState();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (amountKes: number, email: string) => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const initialized = await initializeDonation({
        amountKes,
        email,
        appVersion: Constants.expoConfig?.version ?? "unknown",
      });
      if (!isTrustedPaystackCheckoutUrl(initialized.authorizationUrl) || !isValidDonationReference(initialized.reference)) {
        throw new Error("The payment service returned an invalid secure checkout.");
      }
      router.push({
        pathname: "/support/checkout",
        params: {
          authorizationUrl: initialized.authorizationUrl,
          callbackUrl: initialized.callbackUrl,
          reference: initialized.reference,
        },
      } as Href);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to start the payment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={[styles.screen, { backgroundColor: colors.background }]} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable accessibilityLabel="Leave donation page" onPress={() => void returnToPreviousContent()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text, fontFamily }]}>Donate</Text>
        <View style={styles.headerButton} />
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.icon, { backgroundColor: colors.primary }]}><Ionicons name="heart" size={30} color={colors.onPrimary} /></View>
          <Text style={[styles.title, { color: colors.text, fontFamily, fontSize: size(24) }]}>Support the Work</Text>
          <Text style={[styles.subtitle, { color: colors.tint, fontFamily }]}>Present Truth Mission Support</Text>
          <Text style={[styles.intro, { color: colors.text, fontFamily }]}>Advent Pro remains freely available to everyone. If it has been a blessing to you, you may voluntarily help with server costs, app maintenance, content infrastructure, development, and future improvements.</Text>
          <View style={[styles.assurance, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
            <Ionicons name="shield-checkmark-outline" size={21} color={colors.tint} />
            <Text style={[styles.assuranceText, { color: colors.mutedText, fontFamily }]}>Secure checkout is handled by Paystack. You can give any whole amount from KES 3 and receive a receipt by email.</Text>
          </View>
          <DonationAmountForm
            initialEmail={user?.email ?? ""}
            emailLocked={Boolean(user?.email)}
            loading={loading}
            error={error}
            onSubmit={(amount, email) => void submit(amount, email)}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { height: 58, borderBottomWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12 },
  headerButton: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 17, fontWeight: "800" },
  content: { padding: 18, paddingBottom: 48 },
  card: { borderRadius: 22, borderWidth: 1, padding: 20 },
  icon: { width: 58, height: 58, borderRadius: 29, alignSelf: "center", alignItems: "center", justifyContent: "center" },
  title: { textAlign: "center", fontWeight: "800", marginTop: 14 },
  subtitle: { textAlign: "center", fontSize: 14, fontWeight: "700", marginTop: 4 },
  intro: { fontSize: 14, lineHeight: 21, textAlign: "center", marginTop: 22 },
  assurance: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 14, padding: 13, marginVertical: 20 },
  assuranceText: { flex: 1, fontSize: 12, lineHeight: 18 },
});
