import { StyleSheet, View } from "react-native";
import { useAppTheme } from "@/hooks/use-app-theme";

export function MediaSkeleton() {
  const { colors } = useAppTheme();
  return <View accessibilityLabel="Loading videos" style={styles.wrap}>{Array.from({ length: 6 }, (_, i) => (
    <View key={i} style={[styles.row, { borderColor: colors.border, backgroundColor: colors.card }]}>
      <View style={[styles.image, { backgroundColor: colors.border }]} />
      <View style={styles.copy}><View style={[styles.line, { backgroundColor: colors.border }]} /><View style={[styles.lineShort, { backgroundColor: colors.border }]} /></View>
    </View>
  ))}</View>;
}
const styles = StyleSheet.create({
  wrap: { paddingTop: 8 }, row: { height: 108, marginHorizontal: 16, marginVertical: 5, borderWidth: 1, borderRadius: 16, padding: 7, flexDirection: "row" },
  image: { width: "54%", borderRadius: 11 }, copy: { flex: 1, padding: 12 }, line: { height: 13, borderRadius: 6, marginBottom: 10 }, lineShort: { height: 10, width: "65%", borderRadius: 5 },
});
