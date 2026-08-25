import { useAppTheme } from "@/hooks/use-app-theme";
import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

type Props = {
  visible: boolean;
  onProceed: () => void;
  onDismiss: () => void;
};

export function MonthlySupportPrompt({ visible, onProceed, onDismiss }: Props) {
  const { colors, fontFamily, size } = useAppTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Pressable accessibilityLabel="Close support invitation" onPress={onDismiss} style={styles.close}>
            <Ionicons name="close" size={24} color={colors.mutedText} />
          </Pressable>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={[styles.icon, { backgroundColor: colors.primary }]}>
              <Ionicons name="heart" size={28} color={colors.onPrimary} />
            </View>
            <Text style={[styles.title, { color: colors.text, fontFamily, fontSize: size(23) }]}>Support the Work</Text>
            <Text style={[styles.subtitle, { color: colors.tint, fontFamily, fontSize: size(14) }]}>Present Truth Mission Support</Text>
            <Text style={[styles.copy, { color: colors.text, fontFamily, fontSize: size(14) }]}>Advent Pro is freely available to everyone.</Text>
            <Text style={[styles.copy, { color: colors.text, fontFamily, fontSize: size(14) }]}>If this app has been a blessing to you, kindly consider supporting its continued development with whatever amount you are able to give.</Text>
            <Text style={[styles.copy, { color: colors.text, fontFamily, fontSize: size(14) }]}>Your voluntary support helps us meet server costs, maintain the app, preserve and make Present Truth resources accessible, and continue improving Advent Pro.</Text>
            <Text style={[styles.notice, { color: colors.mutedText, borderColor: colors.border, fontFamily, fontSize: size(13) }]}>You will receive this support invitation no more than once each month. Your support is completely voluntary. Giving or not giving does not affect your access to any feature or content.</Text>
            <Pressable onPress={onProceed} style={[styles.primaryButton, { backgroundColor: colors.primary }]}>
              <Text style={[styles.primaryText, { color: colors.onPrimary, fontFamily }]}>Proceed to Support</Text>
            </Pressable>
            <Pressable onPress={onDismiss} style={[styles.secondaryButton, { borderColor: colors.border }]}>
              <Text style={[styles.secondaryText, { color: colors.text, fontFamily }]}>Remind Me Later</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(2, 6, 23, 0.68)", padding: 20, justifyContent: "center" },
  card: { maxHeight: "90%", borderRadius: 24, borderWidth: 1, padding: 22 },
  close: { position: "absolute", zIndex: 2, right: 14, top: 14, padding: 6 },
  icon: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center", alignSelf: "center", marginBottom: 14 },
  title: { textAlign: "center", fontWeight: "800" },
  subtitle: { textAlign: "center", fontWeight: "700", marginTop: 4, marginBottom: 20 },
  copy: { lineHeight: 21, marginBottom: 12 },
  notice: { lineHeight: 19, borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: 12, marginVertical: 4 },
  primaryButton: { alignItems: "center", paddingVertical: 14, borderRadius: 14, marginTop: 20 },
  primaryText: { fontSize: 16, fontWeight: "800" },
  secondaryButton: { alignItems: "center", paddingVertical: 13, borderRadius: 14, borderWidth: 1, marginTop: 10 },
  secondaryText: { fontSize: 15, fontWeight: "700" },
});
