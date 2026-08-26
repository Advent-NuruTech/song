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
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAppTheme } from "@/hooks/use-app-theme";
import { useAdminMode } from "@/src/admin/adminAccess";
import {
  ADMIN_PAGE_SIZE,
  StudyAdminRow,
  deleteStudy,
  getCategoryNames,
  getStudiesCategories,
  listStudiesPaged,
} from "@/src/services/adminService";

export default function StudiesManager() {
  const { colors, size, fontFamily, darkMode } = useAppTheme();
  const { enabled, loading, refresh } = useAdminMode();

  const [studies, setStudies] = useState<StudyAdminRow[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [categories, setCategories] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 250);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const canLoadMore = studies.length < total;

  const loadCategories = useCallback(async () => {
    try {
      const [fromCategoriesTable, fromStudies] = await Promise.all([
        getCategoryNames(),
        getStudiesCategories(),
      ]);

      const merged = Array.from(new Set([...fromCategoriesTable, ...fromStudies])).sort(
        (a, b) => a.localeCompare(b)
      );

      setCategories(merged);
    } catch (error) {
      console.error("Failed to load categories:", error);
    }
  }, []);

  const loadStudies = useCallback(
    async (reset: boolean, targetOffset: number) => {
      const nextOffset = reset ? 0 : targetOffset;
      if (reset) {
        setLoadingList(true);
      } else {
        setLoadingMore(true);
      }

      try {
        const result = await listStudiesPaged({
          search,
          category: categoryFilter || undefined,
          featured: featuredOnly ? true : undefined,
          limit: ADMIN_PAGE_SIZE,
          offset: nextOffset,
        });

        setTotal(result.total);

        if (reset) {
          setStudies(result.items);
        } else {
          setStudies((current) => [...current, ...result.items]);
        }

        setOffset(nextOffset + result.items.length);
      } catch (error) {
        console.error("Failed to load studies:", error);
        if (reset) setStudies([]);
      } finally {
        setLoadingList(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [search, categoryFilter, featuredOnly]
  );

  useFocusEffect(
    useCallback(() => {
      void refresh();
      void loadCategories();
      setOffset(0);
      setReloadToken((value) => value + 1);
    }, [refresh, loadCategories])
  );

  useEffect(() => {
    setOffset(0);
    setReloadToken((value) => value + 1);
  }, [search, categoryFilter, featuredOnly]);

  useEffect(() => {
    void loadStudies(true, 0);
  }, [reloadToken, loadStudies]);

  const onRefresh = () => {
    setRefreshing(true);
    setOffset(0);
    void Promise.all([loadCategories(), loadStudies(true, 0)]);
  };

  const onLoadMore = () => {
    if (!canLoadMore || loadingList || loadingMore) return;
    void loadStudies(false, offset);
  };

  const confirmDelete = (item: StudyAdminRow) => {
    Alert.alert("Delete study", `Delete "${item.title}"? This cannot be undone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void (async () => {
            try {
                await deleteStudy(item.id);
                setOffset(0);
                await loadStudies(true, 0);
              } catch (error) {
              Alert.alert(
                "Delete failed",
                (error as Error)?.message || "Unable to delete study."
              );
            }
          })();
        },
      },
    ]);
  };

  const chips = useMemo(() => ["", ...categories], [categories]);

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
            Manage Studies
          </Text>
          <Text
            style={[
              styles.headerSubtitle,
              { color: colors.mutedText, fontSize: size(12), fontFamily },
            ]}
          >
            {studies.length} shown
          </Text>
        </View>
        <Pressable
          onPress={() => router.push("/admin/EditStudy?mode=create")}
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
            placeholder="Search by title or content..."
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
          data={chips}
          keyExtractor={(item) => item || "all"}
          contentContainerStyle={styles.filterList}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => {
            const selected = categoryFilter === item;
            const label = item || "All Categories";

            return (
              <Pressable
                onPress={() => setCategoryFilter(item)}
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

        <View style={styles.featuredRow}>
          <Text
            style={[
              styles.featuredLabel,
              { color: colors.mutedText, fontSize: size(13), fontFamily },
            ]}
          >
            Featured only
          </Text>
          <Switch value={featuredOnly} onValueChange={setFeaturedOnly} />
        </View>
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
            Loading studies...
          </Text>
        </View>
      ) : (
        <FlatList
          data={studies}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          onRefresh={onRefresh}
          refreshing={refreshing}
          onEndReachedThreshold={0.5}
          onEndReached={onLoadMore}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View
              style={[
                styles.studyCard,
                { borderColor: colors.border, backgroundColor: colors.card },
              ]}
            >
              <View style={styles.studyHeader}>
                <View
                  style={[styles.categoryBadge, { backgroundColor: `${colors.tint}20` }]}
                >
                  <Text
                    style={[
                      styles.categoryBadgeText,
                      { color: colors.tint, fontSize: size(11), fontFamily },
                    ]}
                  >
                    {item.category}
                  </Text>
                </View>
                {item.isFeatured === 1 && (
                  <View style={styles.featuredBadge}>
                    <Ionicons name="star" size={size(12)} color="#F59E0B" />
                    <Text
                      style={[
                        styles.featuredBadgeText,
                        { color: "#F59E0B", fontSize: size(11), fontFamily },
                      ]}
                    >
                      Featured
                    </Text>
                  </View>
                )}
              </View>

              <Text
                style={[
                  styles.studyTitle,
                  { color: colors.text, fontSize: size(16), fontFamily },
                ]}
                numberOfLines={2}
              >
                {item.title}
              </Text>

              {!!item.subtitle && (
                <Text
                  style={[
                    styles.studySubtitle,
                    { color: colors.mutedText, fontSize: size(13), fontFamily },
                  ]}
                  numberOfLines={1}
                >
                  {item.subtitle}
                </Text>
              )}

              <Text
                style={[
                  styles.studyExcerpt,
                  { color: colors.mutedText, fontSize: size(13), fontFamily },
                ]}
                numberOfLines={3}
              >
                {item.content}
              </Text>

              <Text
                style={[
                  styles.studyMeta,
                  { color: colors.subtleText, fontSize: size(12), fontFamily },
                ]}
              >
                {item.wordCount} words
                {item.author ? ` • ${item.author}` : ""}
              </Text>

              <View style={styles.actions}>
                <Pressable
                  onPress={() =>
                    router.push(`/admin/EditStudy?id=${encodeURIComponent(item.id)}`)
                  }
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
                No studies found
              </Text>
              <Text
                style={[
                  styles.emptySubtitle,
                  { color: colors.mutedText, fontSize: size(13), fontFamily },
                ]}
              >
                Try different filters or add a new study.
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
  featuredRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  featuredLabel: {
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
  studyCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  studyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  categoryBadge: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  categoryBadgeText: {
    fontWeight: "700",
    textTransform: "uppercase",
  },
  featuredBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  featuredBadgeText: {
    fontWeight: "700",
  },
  studyTitle: {
    fontWeight: "700",
  },
  studySubtitle: {
    fontWeight: "600",
  },
  studyExcerpt: {
    lineHeight: 20,
  },
  studyMeta: {
    fontWeight: "500",
  },
  actions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
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
