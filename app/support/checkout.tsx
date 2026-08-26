import { DonationFailure } from "@/components/support/DonationFailure";
import { DonationSuccess } from "@/components/support/DonationSuccess";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useDonationReturnState } from "@/hooks/useDonationReturnState";
import { verifyDonation } from "@/src/services/donations/donationService";
import { isDonationCallbackUrl, isTrustedPaystackCheckoutUrl, isValidDonationReference } from "@/src/services/donations/paystackService";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";

type State = "checkout" | "verifying" | "success" | "failure";
type RetryMode = "payment" | "verification";
const VERIFICATION_RETRY_DELAYS_MS = [0, 1_500, 3_000, 5_000];

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export default function SupportCheckoutScreen() {
  const { colors, fontFamily } = useAppTheme();
  const { returnToPreviousContent } = useDonationReturnState();
  const params = useLocalSearchParams<{ authorizationUrl?: string; callbackUrl?: string; reference?: string }>();
  const authorizationUrl = typeof params.authorizationUrl === "string" ? params.authorizationUrl : "";
  const callbackUrl = typeof params.callbackUrl === "string" ? params.callbackUrl : "";
  const reference = typeof params.reference === "string" ? params.reference : "";
  const valid = isTrustedPaystackCheckoutUrl(authorizationUrl) && isValidDonationReference(reference) && Boolean(callbackUrl);
  const [state, setState] = useState<State>(valid ? "checkout" : "failure");
  const [message, setMessage] = useState(valid ? "" : "The secure checkout link is invalid. Please return and try again.");
  const [retryMode, setRetryMode] = useState<RetryMode>("payment");
  const verifying = useRef(false);

  const verify = useCallback(async () => {
    if (!valid || verifying.current) return;
    verifying.current = true;
    setState("verifying");
    try {
      for (const delay of VERIFICATION_RETRY_DELAYS_MS) {
        if (delay) await wait(delay);
        const result = await verifyDonation(reference);
        if (result.status === "successful") {
          setState("success");
          return;
        }
        if (result.status === "failed") {
          setRetryMode("payment");
          setMessage("Paystack reports that this payment was not completed. You can return and start a new payment.");
          setState("failure");
          return;
        }
      }

      setRetryMode("verification");
      setMessage("Your payment is still awaiting confirmation. If M-Pesa charged you, do not pay again. Retry verification in a moment.");
      setState("failure");
    } catch (cause) {
      setRetryMode("verification");
      console.warn("Donation verification is temporarily unavailable", cause instanceof Error ? cause.message : "unknown");
      setMessage("We could not confirm the payment with Paystack yet. If M-Pesa charged you, do not pay again. Retry verification in a moment.");
      setState("failure");
    } finally {
      verifying.current = false;
    }
  }, [reference, valid]);

  const inspectUrl = (url: string) => {
    if (callbackUrl && isDonationCallbackUrl(url, callbackUrl)) {
      void verify();
      return false;
    }
    return true;
  };

  if (state === "success") return <View style={[styles.result, { backgroundColor: colors.background }]}><DonationSuccess onContinue={() => void returnToPreviousContent()} /></View>;
  if (state === "failure") {
    return (
      <View style={[styles.result, { backgroundColor: colors.background }]}>
        <DonationFailure
          title={retryMode === "verification" ? "Payment Confirmation Pending" : undefined}
          message={message || undefined}
          retryLabel={retryMode === "verification" ? "Retry Verification" : valid ? "Retry Payment" : "Back to Amount"}
          onRetry={() => retryMode === "verification" ? void verify() : router.back()}
          onContinue={() => void returnToPreviousContent()}
        />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <Pressable accessibilityLabel="Cancel payment" onPress={() => { setRetryMode("payment"); setMessage("Payment was not completed. You can continue using Advent Pro normally."); setState("failure"); }} style={styles.headerButton}>
          <Ionicons name="close" size={24} color={colors.text} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.text, fontFamily }]}>Secure Paystack Checkout</Text>
          <Text style={[styles.reference, { color: colors.mutedText, fontFamily }]} numberOfLines={1}>Reference: {reference}</Text>
        </View>
        <View style={styles.headerButton} />
      </View>
      {state === "verifying" ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text, fontFamily }]}>Verifying your support securely…</Text>
        </View>
      ) : (
        <WebView
          source={{ uri: authorizationUrl }}
          originWhitelist={["https://*"]}
          javaScriptEnabled
          domStorageEnabled
          setSupportMultipleWindows={false}
          sharedCookiesEnabled={false}
          thirdPartyCookiesEnabled={false}
          onShouldStartLoadWithRequest={(request) => inspectUrl(request.url)}
          onNavigationStateChange={(navigation) => { if (callbackUrl && isDonationCallbackUrl(navigation.url, callbackUrl)) void verify(); }}
          onError={() => { setMessage("The payment page could not be loaded. You can retry or continue normally."); setState("failure"); }}
          startInLoadingState
          renderLoading={() => <View style={[styles.webLoading, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.primary} /></View>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  result: { flex: 1 },
  header: { minHeight: 64, borderBottomWidth: 1, flexDirection: "row", alignItems: "center", paddingHorizontal: 10 },
  headerButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  headerText: { flex: 1, alignItems: "center" },
  title: { fontSize: 16, fontWeight: "800" },
  reference: { fontSize: 10, marginTop: 3, maxWidth: "95%" },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  loadingText: { fontSize: 15, marginTop: 14, textAlign: "center" },
  webLoading: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
});
