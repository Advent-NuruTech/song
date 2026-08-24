import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { useAppTheme } from "@/hooks/use-app-theme";
import { CommentsSheet } from "@/src/features/media/components/CommentsSheet";
import { EmbeddedYouTubePlayer } from "@/src/features/media/components/EmbeddedYouTubePlayer";
import { MediaActions } from "@/src/features/media/components/MediaActions";
import { getMedia, getViewerState } from "@/src/features/media/mediaService";
import type { MediaItem } from "@/src/features/media/types";
import { formatMediaCount } from "@/src/features/media/utils";

export default function MediaDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, fontFamily, size } = useAppTheme();
  const { width } = useWindowDimensions();
  const [item, setItem] = useState<MediaItem | null>(null);
  const [liked, setLiked] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) { setError("Invalid media link."); return; }
    let active = true;
    Promise.all([getMedia(id), getViewerState(id)])
      .then(([media, viewer]) => { if (active) { setItem(media); setLiked(viewer.likedByMe); } })
      .catch((reason) => { if (active) setError((reason as Error)?.message || "This video is unavailable."); });
    return () => { active = false; };
  }, [id]);

  if (error) return <View style={[styles.center, { backgroundColor: colors.background }]}><Stack.Screen options={{ headerShown: false }} /><Ionicons name="alert-circle-outline" size={42} color={colors.mutedText} /><Text style={[styles.errorTitle, { color: colors.text, fontFamily }]}>Video unavailable</Text><Text style={[styles.errorBody, { color: colors.mutedText, fontFamily }]}>{error}</Text><Pressable onPress={() => router.back()} style={[styles.backButton, { backgroundColor: colors.tint }]}><Text style={styles.backText}>Go back</Text></Pressable></View>;
  if (!item) return <View style={[styles.center, { backgroundColor: colors.background }]}><Stack.Screen options={{ headerShown: false }} /><ActivityIndicator size="large" color={colors.tint} /></View>;

  return <View style={[styles.screen, { backgroundColor: colors.background }]}>
    <Stack.Screen options={{ headerShown: false }} />
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} stickyHeaderIndices={[0]}>
      <View style={styles.playerWrap}>
        {item.offlineCached ? <View style={[styles.offlinePlayer, { height: Math.round(width * 9 / 16) }]}><Image source={{ uri: item.thumbnailUrl, cache: "force-cache" }} style={StyleSheet.absoluteFill} resizeMode="cover" /><View style={styles.offlineShade}><Ionicons name="cloud-offline-outline" size={31} color="#fff" /><Text style={styles.offlineTitle}>You are offline</Text><Text style={styles.offlineBody}>Connect to the internet to watch videos.</Text></View></View> : <EmbeddedYouTubePlayer item={item} height={Math.round(width * 9 / 16)} onViewCount={(viewCount) => setItem((value) => value ? { ...value, viewCount } : value)} />}
        <Pressable accessibilityLabel="Go back" onPress={() => router.back()} style={styles.floatingBack}><Ionicons name="arrow-back" size={23} color="#fff" /></Pressable>
      </View>
      <View style={styles.copy}>
        <Text style={[styles.title, { color: colors.text, fontFamily, fontSize: size(22) }]}>{item.title}</Text>
        <Text style={[styles.meta, { color: colors.mutedText, fontFamily }]}>{formatMediaCount(item.viewCount)} views · {new Date(item.publishedAt).toLocaleDateString()}{item.category ? ` · ${item.category}` : ""}</Text>
        <View style={[styles.actions, { borderColor: colors.border }]}><MediaActions item={item} likedInitially={liked} onComments={() => setCommentsOpen(true)} onChange={(patch) => setItem((value) => value ? { ...value, ...patch } : value)} /></View>
        <View style={[styles.descriptionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text, fontFamily }]}>Description</Text>
          <Text numberOfLines={descriptionExpanded ? undefined : 4} style={[styles.description, { color: colors.text, fontFamily }]}>{item.description || "No description provided."}</Text>
          {item.description.length > 180 ? <Pressable accessibilityRole="button" onPress={() => setDescriptionExpanded((value) => !value)} hitSlop={8}><Text style={[styles.readMore, { color: colors.tint, fontFamily }]}>{descriptionExpanded ? "Show less" : "Read more"}</Text></Pressable> : null}
        </View>
        <Pressable onPress={() => setCommentsOpen(true)} style={[styles.commentsButton, { borderColor: colors.border }]}><View><Text style={[styles.sectionTitle, { color: colors.text, fontFamily }]}>Comments</Text><Text style={[styles.commentCount, { color: colors.mutedText, fontFamily }]}>{formatMediaCount(item.commentCount)} responses</Text></View><Ionicons name="chevron-forward" size={22} color={colors.mutedText} /></Pressable>
      </View>
    </ScrollView>
    <CommentsSheet visible={commentsOpen} item={item} onClose={() => setCommentsOpen(false)} onCountChange={(commentCount) => setItem((value) => value ? { ...value, commentCount } : value)} />
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, content: { paddingBottom: 100 }, playerWrap: { backgroundColor: "#000", zIndex: 10, elevation: 10 }, floatingBack: { position: "absolute", top: 12, left: 12, width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,.6)" }, copy: { padding: 18 }, title: { fontWeight: "900", lineHeight: 29 }, meta: { fontSize: 12, marginTop: 8 }, actions: { borderTopWidth: 1, borderBottomWidth: 1, marginTop: 17, paddingVertical: 5, alignItems: "flex-start" }, descriptionCard: { marginTop: 18, borderRadius: 16, borderWidth: 1, padding: 15 }, sectionTitle: { fontSize: 15, fontWeight: "900" }, description: { fontSize: 14, lineHeight: 22, marginTop: 8 }, readMore: { fontSize: 13, fontWeight: "900", marginTop: 8 }, commentsButton: { minHeight: 70, borderBottomWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 }, commentCount: { fontSize: 12, marginTop: 3 }, center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 30 }, errorTitle: { fontSize: 20, fontWeight: "900", marginTop: 12 }, errorBody: { fontSize: 13, textAlign: "center", marginTop: 5 }, backButton: { borderRadius: 12, marginTop: 18, paddingHorizontal: 20, paddingVertical: 12 }, backText: { color: "#fff", fontWeight: "800" },
  offlinePlayer: { width: "100%", backgroundColor: "#000" }, offlineShade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,.58)", alignItems: "center", justifyContent: "center", padding: 30 }, offlineTitle: { color: "#fff", fontSize: 18, fontWeight: "900", marginTop: 8 }, offlineBody: { color: "rgba(255,255,255,.8)", fontSize: 12, marginTop: 4 },
});
