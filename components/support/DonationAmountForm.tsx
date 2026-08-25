import { useAppTheme } from "@/hooks/use-app-theme";
import { parseDonationAmount } from "@/src/services/donations/validation";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

type Props = {
  initialEmail?: string;
  emailLocked?: boolean;
  loading?: boolean;
  error?: string | null;
  onSubmit: (amountKes: number, email: string) => void;
};

export function DonationAmountForm({ initialEmail = "", emailLocked, loading, error, onSubmit }: Props) {
  const { colors, fontFamily, size } = useAppTheme();
  const [amount, setAmount] = useState("");
  const [email, setEmail] = useState(initialEmail);
  const amountKes = useMemo(() => parseDonationAmount(amount), [amount]);
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const localError = amount.length > 0 && amountKes === null ? "Enter a whole amount from KES 20 to KES 10,000,000." : null;

  return (
    <View>
      <Text style={[styles.label, { color: colors.text, fontFamily, fontSize: size(15) }]}>Amount to support</Text>
      <View style={[styles.amountRow, { backgroundColor: colors.inputBackground, borderColor: localError ? "#DC2626" : colors.border }]}>
        <Text style={[styles.currency, { color: colors.text, fontFamily }]}>KES</Text>
        <TextInput
          accessibilityLabel="Amount to support in Kenyan shillings"
          value={amount}
          onChangeText={(value) => setAmount(value.replace(/[^0-9]/g, ""))}
          placeholder="Enter the amount you wish to give"
          placeholderTextColor={colors.subtleText}
          keyboardType="number-pad"
          inputMode="numeric"
          maxLength={8}
          style={[styles.input, { color: colors.text, fontFamily, fontSize: size(17) }]}
        />
      </View>
      <Text style={[styles.guidanceTitle, { color: colors.mutedText, fontFamily }]}>Suggested support (guidance only)</Text>
      <Text style={[styles.guidance, { color: colors.text, fontFamily }]}>20–200  |  300–600  |  700–2,000  |  2,000+</Text>
      {localError ? <Text style={styles.error}>{localError}</Text> : null}

      <Text style={[styles.label, styles.emailLabel, { color: colors.text, fontFamily, fontSize: size(15) }]}>Email for Paystack receipt</Text>
      <TextInput
        accessibilityLabel="Email for Paystack receipt"
        value={email}
        editable={!emailLocked && !loading}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        onChangeText={setEmail}
        placeholder="you@example.com"
        placeholderTextColor={colors.subtleText}
        maxLength={254}
        style={[styles.emailInput, { color: colors.text, backgroundColor: colors.inputBackground, borderColor: colors.border, fontFamily }]}
      />
      <Text style={[styles.summary, { color: colors.mutedText, fontFamily }]}>
        {amountKes ? `You are choosing to give KES ${amountKes.toLocaleString()}.` : "Minimum voluntary support: KES 20."}
      </Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable
        disabled={!amountKes || !emailValid || loading}
        onPress={() => amountKes && emailValid && onSubmit(amountKes, email.trim())}
        style={[styles.button, { backgroundColor: colors.primary }, (!amountKes || !emailValid || loading) && styles.disabled]}
      >
        {loading ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={[styles.buttonText, { color: colors.onPrimary, fontFamily }]}>Continue to Paystack</Text>}
      </Pressable>
      <Text style={[styles.voluntary, { color: colors.mutedText, fontFamily }]}>This is voluntary support and does not unlock or restrict any Advent Pro feature or content.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontWeight: "700", marginBottom: 8 },
  amountRow: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 14, minHeight: 54 },
  currency: { paddingLeft: 15, paddingRight: 10, fontWeight: "800" },
  input: { flex: 1, paddingVertical: 14, paddingRight: 12 },
  guidanceTitle: { fontSize: 12, marginTop: 12 },
  guidance: { fontSize: 13, fontWeight: "700", marginTop: 4 },
  emailLabel: { marginTop: 22 },
  emailInput: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 14, fontSize: 16 },
  summary: { marginTop: 12, fontSize: 13 },
  error: { color: "#DC2626", marginTop: 9, lineHeight: 18 },
  button: { minHeight: 52, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 20 },
  disabled: { opacity: 0.45 },
  buttonText: { fontSize: 16, fontWeight: "800" },
  voluntary: { fontSize: 12, lineHeight: 18, textAlign: "center", marginTop: 14 },
});
