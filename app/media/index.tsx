import AsyncStorage from "@react-native-async-storage/async-storage";
import { FlashList, type ViewToken } from "@shopify/flash-list";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Image, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from "react-native";

import { useAppTheme } from "@/hooks/use-app-theme";
import { CommentsSheet } from "@/src/features/media/components/CommentsSheet";
import { EmbeddedYouTubePlayer } from "@/src/features/media/components/EmbeddedYouTubePlayer";
import { MediaActions } from "@/src/features/media/components/MediaActions";
import { MediaCard } from "@/src/features/media/components/MediaCard";
import { MediaSkeleton } from "@/src/features/media/components/MediaSkeleton";
import type { MediaFeedType, MediaItem } from "@/src/features/media/types";
import { useMediaFeed } from "@/src/features/media/useMediaFeed";
import { formatMediaCount, getMediaLayout, mediaDescriptionToPlainText } from "@/src/features/media/utils";

const TAB_KEY = "advent-pro:media-tab:v1";

export default function MediaScreen() {
  const { colors, fontFamily } = useAppTheme();
  const [tab, setTab] = useState<MediaFeedType>("video");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => { void AsyncStorage.getItem(TAB_KEY).then((value) => { if (value === "short" || value === "song") setTab(value); }); }, []);
  useEffect(() => { const timer = setTimeout(() => setSearchQuery(searchInput.trim()), 300); return () => clearTimeout(timer); }, [searchInput]);
  const choose = (value: MediaFeedType) => { setTab(value); void AsyncStorage.setItem(TAB_KEY, value); };

  return <View style={[styles.screen, { backgroundColor: colors.background }]}>
    <Stack.Screen options={{ headerShown: false }} />
    <View accessibilityRole="tablist" style={[styles.tabs, { borderBottomColor: colors.border }]}>
      <Tab label="Videos" active={tab === "video"} color={colors.tint} textColor={colors.text} fontFamily={fontFamily} onPress={() => choose("video")} />
      <Tab label="Shorts" active={tab === "short"} color={colors.tint} textColor={colors.text} fontFamily={fontFamily} onPress={() => choose("short")} />
      <Tab label="Songs" active={tab === "song"} color={colors.tint} textColor={colors.text} fontFamily={fontFamily} onPress={() => choose("song")} />
    </View>
    <View style={[styles.searchWrap, { backgroundColor: colors.background }]}>
      <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Ionicons name="search" size={20} color={colors.mutedText} />
        <TextInput
          value={searchInput}
          onChangeText={setSearchInput}
          placeholder={`Search ${tab === "video" ? "videos" : tab === "short" ? "Shorts" : "songs"}`}
          placeholderTextColor={colors.mutedText}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
          style={[styles.searchInput, { color: colors.text, fontFamily }]}
          accessibilityLabel="Search media"
        />
        {!!searchInput && <Pressable accessibilityLabel="Clear search" hitSlop={8} onPress={() => setSearchInput("")}><Ionicons name="close-circle" size={20} color={colors.mutedText} /></Pressable>}
      </View>
    </View>
    {tab === "short" ? <ShortsFeed searchQuery={searchQuery} /> : <VideosFeed type={tab} searchQuery={searchQuery} />}
  </View>;
}

function Tab({ label, active, color, textColor, fontFamily, onPress }: { label: string; active: boolean; color: string; textColor: string; fontFamily: string | undefined; onPress: () => void }) {
  return <Pressable accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={onPress} style={styles.tab}>
    <Text style={[styles.tabText, { color: active ? color : textColor, fontFamily }]}>{label}</Text>
    {active && <View style={[styles.tabLine, { backgroundColor: color }]} />}
  </Pressable>;
}

function VideosFeed({ type, searchQuery }: { type: "video" | "song"; searchQuery: string }) {
  const { colors, fontFamily } = useAppTheme();
  const router = useRouter();
  const feed = useMediaFeed(type, searchQuery);
  if (feed.loading) return <MediaSkeleton />;
  return <View style={styles.flex}>
    {(feed.error || feed.offlineCache) && <StatusBanner cached={feed.offlineCache} onRetry={() => void feed.refresh()} />}
    <FlashList
      data={feed.items}
      keyExtractor={(item) => item.id}
      getItemType={(_, index) => getMediaLayout(index)}
      drawDistance={600}
      contentContainerStyle={styles.videoList}
      refreshControl={<RefreshControl refreshing={feed.refreshing} onRefresh={() => void feed.refresh()} tintColor={colors.tint} />}
      onEndReached={() => void feed.loadMore()}
      onEndReachedThreshold={0.5}
      renderItem={({ item, index }) => <MediaCard item={item} layout={getMediaLayout(index)} onPress={() => router.push({ pathname: "/media/[id]", params: { id: item.id } })} />}
      ListEmptyComponent={<EmptyState icon={searchQuery ? "search-outline" : "videocam-off-outline"} title={searchQuery ? `No matching ${type === "song" ? "songs" : "videos"}` : `No ${type === "song" ? "song videos" : "videos"} available yet`} body={searchQuery ? "Try another title, category, or word." : "Check back soon."} />}
      ListFooterComponent={feed.loadingMore ? <ActivityIndicator color={colors.tint} style={styles.footerLoader} /> : <Text style={[styles.bottomSpace, { color: colors.mutedText, fontFamily }]}>{feed.items.length ? "You're all caught up" : ""}</Text>}
    />
  </View>;
}

function ShortsFeed({ searchQuery }: { searchQuery: string }) {
  const { colors } = useAppTheme();
  const feed = useMediaFeed("short", searchQuery);
  const [height, setHeight] = useState(500);
  const [activeIndex, setActiveIndex] = useState(0);
  const [commentItem, setCommentItem] = useState<MediaItem | null>(null);
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 80, minimumViewTime: 150 }).current;
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken<MediaItem>[] }) => {
    const visible = viewableItems.find((token) => token.isViewable && token.index != null);
    if (visible?.index != null) setActiveIndex(visible.index);
  }).current;

  if (feed.loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.tint} /><Text style={{ color: colors.mutedText, marginTop: 10 }}>Loading Shorts…</Text></View>;
  return <View style={[styles.flex, { backgroundColor: "#000" }]} onLayout={(event) => setHeight(event.nativeEvent.layout.height)}>
    {feed.error && !feed.items.length ? <StatusBanner cached={false} onRetry={() => void feed.refresh()} /> : null}
    <FlashList
      data={feed.items} keyExtractor={(item) => item.id} pagingEnabled snapToAlignment="start" decelerationRate="fast"
      showsVerticalScrollIndicator={false} drawDistance={height} onEndReached={() => void feed.loadMore()} onEndReachedThreshold={0.5}
      onViewableItemsChanged={onViewableItemsChanged} viewabilityConfig={viewabilityConfig}
      overrideItemLayout={(layout) => { (layout as { size?: number }).size = height; }}
      renderItem={({ item, index }) => <ShortItem item={item} active={index === activeIndex} height={height} onComments={() => setCommentItem(item)} onPatch={(patch) => feed.patchItem(item.id, patch)} />}
      ListEmptyComponent={<EmptyState icon={searchQuery ? "search-outline" : "phone-portrait-outline"} title={searchQuery ? "No matching Shorts" : "No Shorts available yet"} body={searchQuery ? "Try another title, category, or word." : "Check back soon."} />}
    />
    {feed.loadingMore && <ActivityIndicator color="#fff" style={styles.shortLoader} />}
    {commentItem && <CommentsSheet visible item={commentItem} onClose={() => setCommentItem(null)} onCountChange={(commentCount) => feed.patchItem(commentItem.id, { commentCount })} />}
  </View>;
}

function ShortItem({ item, active, height, onComments, onPatch }: { item: MediaItem; active: boolean; height: number; onComments: () => void; onPatch: (patch: Partial<MediaItem>) => void }) {
  const description = mediaDescriptionToPlainText(item.description);
  return <View style={[styles.short, { height }]}>
    {active ? <EmbeddedYouTubePlayer item={item} active height={height} onViewCount={(viewCount) => onPatch({ viewCount })} /> : <Image source={{ uri: item.thumbnailUrl, cache: "force-cache" }} style={StyleSheet.absoluteFill} resizeMode="cover" />}
    <View pointerEvents="box-none" style={styles.shortOverlay}>
      <View pointerEvents="none" style={styles.shortTop}>
        <View style={styles.shortBrandMark}><Image source={require("@/assets/images/icon.png")} style={styles.shortBrandImage} /></View>
        <View style={styles.shortBrandCopy}><Text numberOfLines={1} style={styles.shortBrandTitle}>{item.title}</Text><Text style={styles.shortBrandName}>Advent Pro</Text></View>
      </View>
      <View style={styles.shortCopy}>
        <Text numberOfLines={2} style={styles.shortTitle}>{item.title}</Text>
        {!!description && <Text numberOfLines={2} style={styles.shortDescription}>{description}</Text>}
        <View style={styles.shortViews}><Ionicons name="play-circle-outline" size={15} color="#fff" /><Text style={styles.shortViewsText}>{formatMediaCount(item.viewCount)} views</Text></View>
      </View>
      <View style={styles.shortActions}><MediaActions item={item} likedInitially={false} onComments={onComments} onChange={onPatch} variant="short" /></View>
    </View>
  </View>;
}

function StatusBanner({ cached, onRetry }: { cached: boolean; onRetry: () => void }) {
  const { colors, fontFamily } = useAppTheme();
  return <View style={[styles.banner, { backgroundColor: colors.card, borderColor: colors.border }]}><Ionicons name="cloud-offline-outline" size={19} color={colors.mutedText} /><Text style={[styles.bannerText, { color: colors.text, fontFamily }]}>{cached ? "Offline: showing saved details. Connect to watch." : "Media couldn't load. Check your connection."}</Text><Pressable onPress={onRetry}><Text style={[styles.retry, { color: colors.tint, fontFamily }]}>Retry</Text></Pressable></View>;
}

function EmptyState({ icon, title, body }: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string }) {
  const { colors, fontFamily } = useAppTheme();
  return <View style={styles.empty}><Ionicons name={icon} size={42} color={colors.mutedText} /><Text style={[styles.emptyTitle, { color: colors.text, fontFamily }]}>{title}</Text><Text style={[styles.emptyBody, { color: colors.mutedText, fontFamily }]}>{body}</Text></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, flex: { flex: 1 },
  tabs: { flexDirection: "row", borderBottomWidth: 1, paddingHorizontal: 16 }, tab: { flex: 1, height: 46, alignItems: "center", justifyContent: "center" }, tabText: { fontSize: 15, fontWeight: "800" }, tabLine: { position: "absolute", bottom: -1, height: 3, width: 52, borderRadius: 2 },
  searchWrap: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4 }, searchBox: { minHeight: 44, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 8 }, searchInput: { flex: 1, minHeight: 42, paddingVertical: 8, fontSize: 14 },
  videoList: { paddingTop: 7, paddingBottom: 100 }, banner: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 12, marginHorizontal: 16, marginTop: 8, padding: 10, gap: 8 }, bannerText: { flex: 1, fontSize: 12 }, retry: { fontSize: 12, fontWeight: "900" },
  footerLoader: { margin: 24 }, bottomSpace: { textAlign: "center", paddingTop: 20, paddingBottom: 90, fontSize: 11 }, empty: { minHeight: 300, alignItems: "center", justifyContent: "center", padding: 30 }, emptyTitle: { fontSize: 18, fontWeight: "900", marginTop: 12 }, emptyBody: { fontSize: 13, marginTop: 4 }, center: { flex: 1, alignItems: "center", justifyContent: "center" },
  short: { width: "100%", backgroundColor: "#000", overflow: "hidden" }, shortOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,.05)" },
  shortTop: { position: "absolute", top: 18, left: 16, right: 76, flexDirection: "row", alignItems: "center" }, shortBrandMark: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(0,0,0,.55)", overflow: "hidden" }, shortBrandImage: { width: 38, height: 38 }, shortBrandCopy: { flex: 1, marginLeft: 10 }, shortBrandTitle: { color: "#fff", fontSize: 14, fontWeight: "900", textShadowColor: "#000", textShadowRadius: 4 }, shortBrandName: { color: "rgba(255,255,255,.82)", fontSize: 11, fontWeight: "700", marginTop: 2 },
  shortCopy: { paddingHorizontal: 16, paddingBottom: 24, paddingRight: 82, backgroundColor: "rgba(0,0,0,.30)" }, shortTitle: { color: "#fff", fontSize: 17, lineHeight: 23, fontWeight: "900" }, shortDescription: { color: "rgba(255,255,255,.88)", fontSize: 13, lineHeight: 18, marginTop: 5 }, shortViews: { flexDirection: "row", gap: 5, alignItems: "center", marginTop: 8 }, shortViewsText: { color: "#fff", fontSize: 11, fontWeight: "700" }, shortActions: { position: "absolute", right: 7, bottom: 18 }, shortLoader: { position: "absolute", bottom: 80, alignSelf: "center" },
});
