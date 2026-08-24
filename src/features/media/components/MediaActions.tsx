import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { useAppTheme } from "@/hooks/use-app-theme";
import { useAuth } from "@/src/auth/AuthContext";
import { shareMediaLink } from "@/src/services/shareService";
import { recordMediaPreference } from "../recommendations";
import { toggleMediaLike } from "../mediaService";
import type { MediaItem } from "../types";
import { formatMediaCount } from "../utils";

export function MediaActions({ item, likedInitially, onComments, onChange, variant = "default" }: {
  item: MediaItem; likedInitially: boolean; onComments: () => void;
  onChange?: (patch: Partial<MediaItem>) => void;
  variant?: "default" | "short";
}) {
  const { colors, fontFamily } = useAppTheme();
  const auth = useAuth();
  const [liked, setLiked] = useState(likedInitially);
  const [likeCount, setLikeCount] = useState(item.likeCount);
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    if (!auth.user) { Alert.alert("Sign in required", "Sign in to like Advent Pro media."); return; }
    if (busy) return;
    const previous = { liked, likeCount };
    const nextLiked = !liked;
    const nextCount = Math.max(0, likeCount + (nextLiked ? 1 : -1));
    setLiked(nextLiked); setLikeCount(nextCount); onChange?.({ likeCount: nextCount }); setBusy(true);
    try {
      const result = await toggleMediaLike(item.id);
      setLiked(result.liked); setLikeCount(result.likeCount); onChange?.({ likeCount: result.likeCount });
      if (result.liked) void recordMediaPreference(item, "like");
    } catch (reason) {
      setLiked(previous.liked); setLikeCount(previous.likeCount); onChange?.({ likeCount: previous.likeCount });
      Alert.alert("Like failed", (reason as Error)?.message || "Please try again.");
    } finally { setBusy(false); }
  };

  const share = () => void shareMediaLink(item);

  const actionColor = variant === "short" ? "#FFFFFF" : colors.text;
  return <View style={variant === "short" ? styles.shortColumn : styles.row}>
    <Action short={variant === "short"} icon={liked ? "heart" : "heart-outline"} label={formatMediaCount(likeCount)} color={liked ? "#FF2D55" : actionColor} fontFamily={fontFamily} onPress={() => void toggle()} />
    <Action short={variant === "short"} icon="chatbubble" label={formatMediaCount(item.commentCount)} color={actionColor} fontFamily={fontFamily} onPress={onComments} />
    <Action short={variant === "short"} icon="arrow-redo" label="Share" color={actionColor} fontFamily={fontFamily} onPress={share} />
  </View>;
}

function Action({ icon, label, color, fontFamily, onPress, short = false }: { icon: keyof typeof Ionicons.glyphMap; label: string; color: string; fontFamily: string | undefined; onPress: () => void; short?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={[styles.action, short && styles.shortAction]}>
    <View style={short ? styles.shortIcon : undefined}><Ionicons name={icon} size={short ? 29 : 23} color={color} /></View><Text style={[styles.label, short && styles.shortLabel, { color, fontFamily }]}>{label}</Text>
  </Pressable>;
}
const styles = StyleSheet.create({ row: { flexDirection: "row", alignItems: "center", gap: 12 }, shortColumn: { alignItems: "center", gap: 13 }, action: { minWidth: 64, minHeight: 46, alignItems: "center", justifyContent: "center" }, shortAction: { minWidth: 58, minHeight: 62 }, shortIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(0,0,0,.52)", alignItems: "center", justifyContent: "center" }, label: { fontSize: 11, fontWeight: "700", marginTop: 3 }, shortLabel: { color: "#fff", fontSize: 11, fontWeight: "900", textShadowColor: "rgba(0,0,0,.8)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 } });
