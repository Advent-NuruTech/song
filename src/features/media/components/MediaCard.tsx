import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { useAppTheme } from "@/hooks/use-app-theme";
import type { MediaItem, MediaLayout } from "../types";
import { formatDuration, formatMediaCount, mediaDescriptionToPlainText } from "../utils";

export function MediaCard({ item, layout, onPress }: { item: MediaItem; layout: MediaLayout; onPress: () => void }) {
  const { colors, fontFamily, size, darkMode } = useAppTheme();
  const duration = formatDuration(item.durationSeconds);
  const description = mediaDescriptionToPlainText(item.description);
  const image = (
    <View style={layout === "compact" ? styles.compactImageWrap : styles.fullImageWrap}>
      <Image
        source={{ uri: item.thumbnailUrl, cache: "force-cache" }}
        style={styles.image}
        resizeMode="cover"
        accessibilityLabel={`${item.title} thumbnail`}
      />
      <View style={styles.playBadge}><Ionicons name="play" color="#fff" size={layout === "compact" ? 16 : 22} /></View>
      {duration ? <Text style={[styles.duration, { fontFamily }]}>{duration}</Text> : null}
    </View>
  );

  if (layout === "compact") {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Play ${item.title}`}
        onPress={onPress}
        style={({ pressed }) => [styles.compact, { borderColor: colors.border, backgroundColor: colors.card }, pressed && styles.pressed]}
      >
        {image}
        <View style={styles.compactCopy}>
          <Text numberOfLines={3} style={[styles.compactTitle, { color: colors.text, fontFamily, fontSize: size(14) }]}>{item.title}</Text>
          {!!item.category && <Text numberOfLines={1} style={[styles.category, { color: colors.tint, fontFamily }]}>{item.category}</Text>}
          <View style={styles.metaRow}>
            <Ionicons name="play-circle-outline" size={14} color={colors.mutedText} />
            <Text style={[styles.meta, { color: colors.mutedText, fontFamily }]}>{formatMediaCount(item.viewCount)} views</Text>
          </View>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Play ${item.title}`}
      onPress={onPress}
      style={({ pressed }) => [styles.full, { borderColor: colors.border, backgroundColor: colors.card, shadowColor: darkMode ? "#000" : "#0f172a" }, pressed && styles.pressed]}
    >
      {image}
      <View style={styles.fullCopy}>
        <Text numberOfLines={2} style={[styles.fullTitle, { color: colors.text, fontFamily, fontSize: size(17) }]}>{item.title}</Text>
        {!!description && <Text numberOfLines={2} style={[styles.description, { color: colors.mutedText, fontFamily }]}>{description}</Text>}
        <View style={styles.fullMeta}>
          <Meta icon="play-circle-outline" value={`${formatMediaCount(item.viewCount)} views`} color={colors.mutedText} fontFamily={fontFamily} />
          <Meta icon="heart-outline" value={formatMediaCount(item.likeCount)} color={colors.mutedText} fontFamily={fontFamily} />
          <Meta icon="chatbubble-outline" value={formatMediaCount(item.commentCount)} color={colors.mutedText} fontFamily={fontFamily} />
        </View>
      </View>
    </Pressable>
  );
}

function Meta({ icon, value, color, fontFamily }: { icon: keyof typeof Ionicons.glyphMap; value: string; color: string; fontFamily: string | undefined }) {
  return <View style={styles.metaRow}><Ionicons name={icon} size={15} color={color} /><Text style={[styles.meta, { color, fontFamily }]}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  compact: { minHeight: 112, marginHorizontal: 16, marginVertical: 5, borderWidth: 1, borderRadius: 16, padding: 7, flexDirection: "row", overflow: "hidden" },
  compactImageWrap: { width: "54%", aspectRatio: 16 / 9, borderRadius: 11, overflow: "hidden", backgroundColor: "#111827" },
  compactCopy: { flex: 1, paddingHorizontal: 11, paddingVertical: 3 },
  compactTitle: { fontWeight: "800", lineHeight: 19 },
  category: { marginTop: 6, fontSize: 11, fontWeight: "800", textTransform: "uppercase" },
  full: { marginHorizontal: 16, marginVertical: 10, borderWidth: 1, borderRadius: 20, overflow: "hidden", elevation: 2 },
  fullImageWrap: { width: "100%", aspectRatio: 16 / 9, backgroundColor: "#111827" },
  fullCopy: { padding: 15 },
  fullTitle: { fontWeight: "900", lineHeight: 23 },
  description: { fontSize: 13, lineHeight: 19, marginTop: 6 },
  fullMeta: { flexDirection: "row", alignItems: "center", gap: 18, marginTop: 12 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 7 },
  meta: { fontSize: 11, fontWeight: "600" },
  image: { width: "100%", height: "100%" },
  duration: { position: "absolute", right: 6, bottom: 6, color: "#fff", fontSize: 10, fontWeight: "800", backgroundColor: "rgba(0,0,0,.8)", borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2 },
  playBadge: { position: "absolute", alignSelf: "center", top: "40%", backgroundColor: "rgba(11,74,166,.88)", width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", paddingLeft: 2 },
  pressed: { opacity: 0.78 },
});
