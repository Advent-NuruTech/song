import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Alert, Pressable, Share, StyleSheet, Text, View } from "react-native";

import { useAppTheme } from "@/hooks/use-app-theme";
import { useAuth } from "@/src/auth/AuthContext";
import { toggleMediaLike } from "../mediaService";
import type { MediaItem } from "../types";
import { formatMediaCount } from "../utils";

export function MediaActions({ item, likedInitially, onComments, onChange }: {
  item: MediaItem; likedInitially: boolean; onComments: () => void;
  onChange?: (patch: Partial<MediaItem>) => void;
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
    } catch (reason) {
      setLiked(previous.liked); setLikeCount(previous.likeCount); onChange?.({ likeCount: previous.likeCount });
      Alert.alert("Like failed", (reason as Error)?.message || "Please try again.");
    } finally { setBusy(false); }
  };

  const share = () => void Share.share({ title: item.title, message: `${item.title}\n${item.youtubeUrl}`, url: item.youtubeUrl });

  return <View style={styles.row}>
    <Action icon={liked ? "heart" : "heart-outline"} label={formatMediaCount(likeCount)} color={liked ? "#EF4444" : colors.text} fontFamily={fontFamily} onPress={() => void toggle()} />
    <Action icon="chatbubble-outline" label={formatMediaCount(item.commentCount)} color={colors.text} fontFamily={fontFamily} onPress={onComments} />
    <Action icon="share-social-outline" label="Share" color={colors.text} fontFamily={fontFamily} onPress={share} />
  </View>;
}

function Action({ icon, label, color, fontFamily, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; color: string; fontFamily: string | undefined; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.action}>
    <Ionicons name={icon} size={23} color={color} /><Text style={[styles.label, { color, fontFamily }]}>{label}</Text>
  </Pressable>;
}
const styles = StyleSheet.create({ row: { flexDirection: "row", alignItems: "center", gap: 12 }, action: { minWidth: 64, minHeight: 46, alignItems: "center", justifyContent: "center" }, label: { fontSize: 11, fontWeight: "700", marginTop: 3 } });
