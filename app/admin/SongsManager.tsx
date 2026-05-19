import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAppTheme } from "@/hooks/use-app-theme";
import { useAdminMode } from "@/src/admin/adminAccess";
import { useQuickFooter } from "@/src/context/QuickFooterContext";
import {
  ADMIN_PAGE_SIZE,
  SongAdminRow,
  deleteSong,
  getSongLanguages,
  listSongsPaged,
} from "@/src/services/adminService";

export default function SongsManager() {
  const { colors, size, fontFamily, darkMode } = useAppTheme();
  const { reportScroll } = useQuickFooter();
  const { enabled, loading, refresh } = useAdminMode();

  const [songs, setSongs] = useState<SongAdminRow[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [languages, setLanguages] = useState<string[]>([]);
  const [languageFilter, setLanguageFilter] = useState<string>("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [loadingList, setLoadingList] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 250);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const canLoadMore = songs.length < total;

  const loadLanguages = useCallback(async () => {
    try {
      const next = await getSongLanguages();
      setLanguages(next);
    } catch (error) {
      console.error("Failed to load song languages:", error);
    }
  }, []);

  const loadSongs = useCallback(
    async (reset: boolean, targetOffset: number) => {
      const nextOffset = reset ? 0 : targetOffset;
      if (reset) {
        setLoadingList(true);
      } else {
        setLoadingMore(true);
      }

      try {
        const result = await listSongsPaged({
          search,
          language: languageFilter || undefined,
          limit: ADMIN_PAGE_SIZE,
          offset: nextOffset,
        });

        setTotal(result.total);

        if (reset) {
          setSongs(result.items);
        } else {
          setSongs((current) => [...current, ...result.items]);
        }

        setOffset(nextOffset + result.items.length);
      } catch (error) {
        console.error("Failed to load songs:", error);
        if (reset) {
          setSongs([]);
        }
      } finally {
        setLoadingList(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [search, languageFilter]
  );

  useFocusEffect(
    useCallback(() => {
      void refresh();
      void loadLanguages();
      setOffset(0);
      setReloadToken((value) => value + 1);
    }, [refresh, loadLanguages])
  );

  useEffect(() => {
    setOffset(0);
    setReloadToken((value) => value + 1);
  }, [search, languageFilter]);

  useEffect(() => {
    void loadSongs(true, 0);
  }, [reloadToken, loadSongs]);

  const onRefresh = () => {
    setRefreshing(true);
    setOffset(0);
    void Promise.all([loadLanguages(), loadSongs(true, 0)]);
  };

  const onLoadMore = () => {
    if (!canLoadMore || loadingList || loadingMore) return;
    void loadSongs(false, offset);
  };

  const confirmDelete = (item: SongAdminRow) => {
    Alert.alert(
      "Delete song",
      `Delete "${item.title}" (${item.language})? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void (async () => {
              try {
                await deleteSong(item.id);
                setOffset(0);
                await loadSongs(true, 0);
              } catch (error) {
                Alert.alert(
                  "Delete failed",
                  (error as Error)?.message || "Unable to delete song."
                );
              }
            })();
          },
        },
      ]
    );
  };

  const languageChips = useMemo(() => ["", ...languages], [languages]);

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  if (!enabled) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.locked, { color: colors.text, fontSize: size(16), fontFamily }]}>
          Admin mode is disabled.
        </Text>
        <Pressable
          onPress={() => router.replace("/(tabs)/about")}
          style={[styles.simpleButton, { backgroundColor: colors.tint }]}
        >
          <Text
            style={[
              styles.simpleButtonText,
              { color: "#FFFFFF", fontSize: size(14), fontFamily },
            ]}
          >
            Go to About
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={darkMode ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />

      <View
        style={[
          styles.header,
          { borderBottomColor: colors.border, backgroundColor: colors.card },
        ]}
      >
        <Pressable onPress={() => router.back()} style={styles.headerIcon}>
          <Ionicons name="arrow-back" size={size(22)} color={colors.text} />
        </Pressable>
        <View style={styles.headerContent}>
          <Text
            style={[
              styles.headerTitle,
              { color: colors.text, fontSize: size(20), fontFamily },
            ]}
          >
            Manage Songs
          </Text>
          <Text
            style={[
              styles.headerSubtitle,
              { color: colors.mutedText, fontSize: size(12), fontFamily },
            ]}
          >
            {total} total songs
          </Text>
        </View>
        <Pressable
          onPress={() => router.push("/admin/EditSong?mode=create")}
          style={[styles.addButton, { backgroundColor: colors.tint }]}
        >
          <Ionicons name="add" size={size(18)} color="#FFFFFF" />
          <Text
            style={[
              styles.addButtonText,
              { color: "#FFFFFF", fontSize: size(13), fontFamily },
            ]}
          >
            Add
          </Text>
        </Pressable>
      </View>

      <View style={styles.controls}>
        <View
          style={[
            styles.searchBox,
            { borderColor: colors.border, backgroundColor: colors.card },
          ]}
        >
          <Ionicons name="search" size={size(18)} color={colors.mutedText} />
          <TextInput
            value={searchInput}
            onChangeText={setSearchInput}
            placeholder="Search by title or language..."
            placeholderTextColor={colors.subtleText}
            style={[
              styles.searchInput,
              { color: colors.text, fontSize: size(15), fontFamily },
            ]}
          />
          {!!searchInput && (
            <Pressable onPress={() => setSearchInput("")} style={styles.clearSearchButton}>
              <Ionicons name="close-circle" size={size(18)} color={colors.mutedText} />
            </Pressable>
          )}
        </View>

        <FlatList
          horizontal
          data={languageChips}
          keyExtractor={(item) => item || "all"}
          contentContainerStyle={styles.filterList}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => {
            const selected = languageFilter === item;
            const label = item || "All Languages";

            return (
              <Pressable
                onPress={() => setLanguageFilter(item)}
                style={[
                  styles.filterChip,
                  {
                    borderColor: selected ? colors.tint : colors.border,
                    backgroundColor: selected ? colors.tint : colors.card,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    {
                      color: selected ? "#FFFFFF" : colors.text,
                      fontSize: size(13),
                      fontFamily,
                    },
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>

      {loadingList ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.tint} />
          <Text
            style={[
              styles.loadingText,
              { color: colors.mutedText, fontSize: size(14), fontFamily },
            ]}
          >
            Loading songs...
          </Text>
        </View>
      ) : (
        <FlatList
          data={songs}
          keyExtractor={(item) => item.id}
          onScroll={(event) => reportScroll(event.nativeEvent.contentOffset.y)}
          scrollEventThrottle={16}
          contentContainerStyle={styles.listContent}
          onRefresh={onRefresh}
          refreshing={refreshing}
          onEndReachedThreshold={0.5}
          onEndReached={onLoadMore}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View
              style={[
                styles.songCard,
                { borderColor: colors.border, backgroundColor: colors.card },
              ]}
            >
              <View style={styles.songMain}>
                <View style={[styles.numberBadge, { backgroundColor: `${colors.tint}20` }]}>
                  <Text
                    style={[
                      styles.numberText,
                      { color: colors.tint, fontSize: size(15), fontFamily },
                    ]}
                  >
                    {item.hymnNumber}
                  </Text>
                </View>
                <View style={styles.songTextBlock}>
                  <Text
                    style={[
                      styles.songTitle,
                      { color: colors.text, fontSize: size(16), fontFamily },
                    ]}
                    numberOfLines={2}
                  >
                    {item.title}
                  </Text>
                  <Text
                    style={[
                      styles.songMeta,
                      { color: colors.mutedText, fontSize: size(12), fontFamily },
                    ]}
                    numberOfLines={1}
                  >
                    {item.language}
                    {item.author ? ` • ${item.author}` : ""}
                  </Text>
                </View>
              </View>

              <View style={styles.actions}>
                <Pressable
                  onPress={() => router.push(`/admin/EditSong?id=${encodeURIComponent(item.id)}`)}
                  style={[styles.rowButton, { borderColor: colors.border }]}
                >
                  <Ionicons name="create-outline" size={size(16)} color={colors.text} />
                  <Text
                    style={[
                      styles.rowButtonText,
                      { color: colors.text, fontSize: size(13), fontFamily },
                    ]}
                  >
                    Edit
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => confirmDelete(item)}
                  style={[styles.rowButton, { borderColor: "#EF4444" }]}
                >
                  <Ionicons name="trash-outline" size={size(16)} color="#EF4444" />
                  <Text
                    style={[
                      styles.rowButtonText,
                      { color: "#EF4444", fontSize: size(13), fontFamily },
                    ]}
                  >
                    Delete
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={colors.tint} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text
                style={[
                  styles.emptyTitle,
                  { color: colors.text, fontSize: size(16), fontFamily },
                ]}
              >
                No songs found
              </Text>
              <Text
                style={[
                  styles.emptySubtitle,
                  { color: colors.mutedText, fontSize: size(13), fontFamily },
                ]}
              >
                Try a different search or language filter.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  locked: {
    fontWeight: "600",
    marginBottom: 12,
  },
  simpleButton: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  simpleButtonText: {
    fontWeight: "600",
  },
  header: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  headerIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  headerContent: {
    flex: 1,
    marginLeft: 8,
  },
  headerTitle: {
    fontWeight: "700",
  },
  headerSubtitle: {
    marginTop: 2,
    fontWeight: "500",
  },
  addButton: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  addButtonText: {
    fontWeight: "700",
  },
  controls: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 10,
  },
  searchBox: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    padding: 0,
    fontWeight: "500",
  },
  clearSearchButton: {
    padding: 2,
  },
  filterList: {
    gap: 8,
  },
  filterChip: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterChipText: {
    fontWeight: "600",
  },
  loadingText: {
    marginTop: 8,
    fontWeight: "500",
  },
  listContent: {
    paddingHorizontal: 14,
    paddingBottom: 28,
    paddingTop: 4,
    gap: 10,
  },
  songCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },
  songMain: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  numberBadge: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  numberText: {
    fontWeight: "800",
  },
  songTextBlock: {
    flex: 1,
  },
  songTitle: {
    fontWeight: "700",
  },
  songMeta: {
    marginTop: 4,
    fontWeight: "500",
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  rowButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 5,
  },
  rowButtonText: {
    fontWeight: "600",
  },
  footerLoader: {
    paddingVertical: 10,
  },
  emptyState: {
    paddingVertical: 30,
    alignItems: "center",
    gap: 6,
  },
  emptyTitle: {
    fontWeight: "700",
  },
  emptySubtitle: {
    textAlign: "center",
    lineHeight: 20,
  },
});
