import { Ionicons } from "@expo/vector-icons";
import { Link, Stack } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { ShareIconButton } from "@/components/share-icon-button";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useQuickFooter } from "@/src/context/QuickFooterContext";
import { shareStudyLink, stripStudyMarkup } from "@/src/services/shareService";
import { getStudyDiscovery } from "@/src/services/studyDiscoveryService";
import { getCategoriesWithCounts, getCategoryColor, getStudySummaries, searchStudies, type StudySummary } from "@/src/services/studiesService";

export default function StudiesScreen() {
  const { colors, size, fontFamily, darkMode } = useAppTheme();
  const { reportScroll } = useQuickFooter();
  const [allStudies, setAllStudies] = useState<StudySummary[]>([]);
  const [forYou, setForYou] = useState<StudySummary[]>([]);
  const [popular, setPopular] = useState<StudySummary[]>([]);
  const [categories, setCategories] = useState<{ category: string; count: number }[]>([]);
  const [category, setCategory] = useState<string | null>(null);
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [categoryQuery, setCategoryQuery] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [studies, categoryList, tailored, trending] = await Promise.all([
        getStudySummaries({ limit: 200 }), getCategoriesWithCounts(), getStudyDiscovery("for_you", 8), getStudyDiscovery("popular", 8),
      ]);
      setAllStudies(studies); setCategories(categoryList); setForYou(tailored); setPopular(trending);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const clean = query.trim();
    if (!clean) {
      void getStudySummaries({ limit: 200 }).then(setAllStudies);
      return;
    }
    const timer = setTimeout(() => {
      setSearching(true);
      void searchStudies(clean).then((results) => setAllStudies(results.map((item) => ({ ...item, wordCount: 0, isFeatured: false })))).finally(() => setSearching(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  const visible = useMemo(() => category ? allStudies.filter((study) => study.category === category) : allStudies, [allStudies, category]);
  const filteredCategories = useMemo(() => {
    const clean = categoryQuery.trim().toLocaleLowerCase();
    return clean ? categories.filter((item) => item.category.toLocaleLowerCase().includes(clean)) : categories;
  }, [categories, categoryQuery]);
  const totalStudyCount = useMemo(() => categories.reduce((total, item) => total + item.count, 0), [categories]);
  const clearSearch = () => { setQuery(""); setCategory(null); void getStudySummaries({ limit: 200 }).then(setAllStudies); };
  const chooseCategory = (nextCategory: string | null) => {
    setCategory(nextCategory);
    setCategoryPickerOpen(false);
    setCategoryQuery("");
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.fixedHeader, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={[styles.search, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="search" size={19} color={colors.mutedText} />
          <TextInput value={query} onChangeText={setQuery} placeholder="Search studies" placeholderTextColor={colors.mutedText} returnKeyType="search" style={[styles.searchInput, { color: colors.text, fontFamily }]} />
          {searching ? <ActivityIndicator size="small" color={colors.tint} /> : query ? <Pressable onPress={clearSearch} hitSlop={8}><Ionicons name="close-circle" size={20} color={colors.mutedText} /></Pressable> : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Study category: ${category ?? "All categories"}`}
          onPress={() => setCategoryPickerOpen(true)}
          style={({ pressed }) => [styles.categorySelect, { backgroundColor: colors.card, borderColor: colors.border }, pressed && { opacity: .72 }]}
        >
          <View style={[styles.categorySelectIcon, { backgroundColor: `${colors.tint}14` }]}><Ionicons name="list" size={18} color={colors.tint} /></View>
          <Text numberOfLines={1} style={[styles.categorySelectText, { color: colors.text, fontFamily }]}>{category ?? "All categories"}</Text>
          <Ionicons name="chevron-down" size={19} color={colors.mutedText} />
        </Pressable>
      </View>

      <Modal visible={categoryPickerOpen} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setCategoryPickerOpen(false)}>
        <View style={styles.pickerOverlay}>
          <Pressable accessibilityLabel="Close category list" style={StyleSheet.absoluteFill} onPress={() => setCategoryPickerOpen(false)} />
          <View style={[styles.pickerSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.pickerHeading}>
              <View><Text style={[styles.pickerTitle, { color: colors.text, fontFamily }]}>Choose a category</Text><Text style={[styles.pickerSubtitle, { color: colors.mutedText, fontFamily }]}>Search or scroll to navigate studies</Text></View>
              <Pressable accessibilityRole="button" accessibilityLabel="Close" hitSlop={8} onPress={() => setCategoryPickerOpen(false)}><Ionicons name="close" size={24} color={colors.mutedText} /></Pressable>
            </View>
            <View style={[styles.categorySearch, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Ionicons name="search" size={18} color={colors.mutedText} />
              <TextInput value={categoryQuery} onChangeText={setCategoryQuery} placeholder="Search categories" placeholderTextColor={colors.mutedText} returnKeyType="search" style={[styles.categorySearchInput, { color: colors.text, fontFamily }]} />
              {categoryQuery ? <Pressable onPress={() => setCategoryQuery("")} hitSlop={8}><Ionicons name="close-circle" size={19} color={colors.mutedText} /></Pressable> : null}
            </View>
            <FlatList
              data={filteredCategories}
              keyExtractor={(item) => item.category}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
              contentContainerStyle={styles.categoryList}
              ListHeaderComponent={!categoryQuery.trim() ? <CategoryOption label="All categories" count={totalStudyCount} active={!category} onPress={() => chooseCategory(null)} /> : null}
              renderItem={({ item }) => <CategoryOption label={item.category} count={item.count} active={category === item.category} onPress={() => chooseCategory(item.category)} />}
              ListEmptyComponent={<View style={styles.noCategories}><Ionicons name="search-outline" size={28} color={colors.mutedText} /><Text style={[styles.noCategoriesText, { color: colors.mutedText, fontFamily }]}>No matching categories</Text></View>}
            />
          </View>
        </View>
      </Modal>

      {loading ? <View style={styles.loading}><ActivityIndicator size="large" color={colors.tint} /><Text style={[styles.loadingCopy, { color: colors.mutedText, fontFamily }]}>Loading studies…</Text></View> : (
        <FlatList
          data={visible} keyExtractor={(item) => item.id} renderItem={({ item }) => <StudyCard study={item} />}
          onScroll={(event) => reportScroll(event.nativeEvent.contentOffset.y)} scrollEventThrottle={16}
          contentContainerStyle={styles.list}
          ListHeaderComponent={!query && !category ? <View>
            <DiscoverySection title="For you" subtitle="Recommended from your interests" icon="sparkles" studies={forYou} />
            <DiscoverySection title="Most popular" subtitle="What readers are exploring" icon="trending-up" studies={popular} />
            <Text style={[styles.allTitle, { color: colors.text, fontFamily }]}>All studies</Text>
          </View> : <Text style={[styles.resultsTitle, { color: colors.text, fontFamily }]}>{query ? `Results for “${query}”` : category}</Text>}
          ListEmptyComponent={<View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}><Ionicons name="document-text-outline" size={42} color={colors.mutedText} /><Text style={[styles.emptyTitle, { color: colors.text, fontFamily }]}>No studies found</Text><Text style={[styles.emptyCopy, { color: colors.mutedText, fontFamily }]}>Try another topic or search phrase.</Text></View>}
        />
      )}
    </View>
  );

  function CategoryOption({ label, count, active, onPress }: { label: string; count: number; active: boolean; onPress: () => void }) {
    return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.categoryOption, { borderBottomColor: colors.border }, pressed && { backgroundColor: colors.background }]}>
      <View style={[styles.optionCheck, { backgroundColor: active ? colors.primary : "transparent", borderColor: active ? colors.primary : colors.border }]}>{active ? <Ionicons name="checkmark" size={15} color={colors.onPrimary} /> : null}</View>
      <Text numberOfLines={1} style={[styles.categoryOptionText, { color: colors.text, fontFamily }, active && { color: colors.tint, fontWeight: "800" }]}>{label}</Text>
      <Text style={[styles.categoryOptionCount, { color: colors.mutedText, fontFamily }]}>{count}</Text>
    </Pressable>;
  }

  function StudyCard({ study, compact = false }: { study: StudySummary; compact?: boolean }) {
    const accent = getCategoryColor(study.category);
    const excerpt = stripStudyMarkup(study.excerpt).replace(/<[^>]*$/g, "").replace(/\s+/g, " ").trim();
    return <View style={[compact ? styles.discoveryCardWrap : styles.cardWrap, compact && { width: 260 }]}>
      <Link href={{ pathname: "/studies/[id]", params: { id: study.id } }} asChild>
        <Pressable style={({ pressed }) => [styles.card, compact && styles.discoveryCard, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: darkMode ? "#000" : "#0F172A" }, pressed && { opacity: .72 }]}>
          <View style={styles.categoryRow}><View style={[styles.dot, { backgroundColor: accent }]} /><Text numberOfLines={1} style={[styles.category, { color: colors.mutedText, fontFamily }]}>{study.category}</Text></View>
          <Text numberOfLines={compact ? 3 : 2} style={[styles.cardTitle, { color: colors.text, fontFamily, fontSize: size(compact ? 15 : 17) }]}>{study.title}</Text>
          {!compact && excerpt ? <Text numberOfLines={2} style={[styles.excerpt, { color: colors.mutedText, fontFamily }]}>{excerpt}</Text> : null}
          <View style={styles.cardMeta}><Text numberOfLines={1} style={[styles.author, { color: colors.mutedText, fontFamily }]}>{study.author ? `By ${study.author}` : "Advent Pro"}</Text>{study.wordCount ? <Text style={[styles.readTime, { color: colors.mutedText, fontFamily }]}>{Math.max(1, Math.ceil(study.wordCount / 250))} min</Text> : null}</View>
        </Pressable>
      </Link>
      {!compact ? <ShareIconButton color={colors.tint} borderColor={colors.border} backgroundColor={colors.card} onPress={() => void shareStudyLink({ ...study, content: study.excerpt })} style={styles.share} /> : null}
    </View>;
  }

  function DiscoverySection({ title, subtitle, icon, studies }: { title: string; subtitle: string; icon: keyof typeof Ionicons.glyphMap; studies: StudySummary[] }) {
    if (!studies.length) return null;
    return <View style={styles.discovery}>
      <View style={styles.discoveryHeading}><View style={[styles.discoveryIcon, { backgroundColor: `${colors.tint}14` }]}><Ionicons name={icon} size={18} color={colors.tint} /></View><View><Text style={[styles.discoveryTitle, { color: colors.text, fontFamily }]}>{title}</Text><Text style={[styles.discoverySubtitle, { color: colors.mutedText, fontFamily }]}>{subtitle}</Text></View></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.discoveryList}>{studies.map((study) => <StudyCard key={`${title}-${study.id}`} study={study} compact />)}</ScrollView>
    </View>;
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, fixedHeader: { borderBottomWidth: StyleSheet.hairlineWidth, paddingTop: 12, paddingBottom: 12 },
  search: { height: 45, marginHorizontal: 18, borderRadius: 14, borderWidth: 1, flexDirection: "row", alignItems: "center", paddingHorizontal: 13, gap: 9 }, searchInput: { flex: 1, fontSize: 14, paddingVertical: 0 },
  categorySelect: { height: 45, marginHorizontal: 18, marginTop: 9, paddingHorizontal: 11, borderRadius: 14, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 10 }, categorySelectIcon: { width: 30, height: 30, borderRadius: 9, alignItems: "center", justifyContent: "center" }, categorySelectText: { flex: 1, fontSize: 13, fontWeight: "700" },
  pickerOverlay: { flex: 1, backgroundColor: "rgba(2, 6, 23, .48)", justifyContent: "flex-end" }, pickerSheet: { maxHeight: "78%", minHeight: 420, borderWidth: 1, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 18, paddingBottom: 18 }, pickerHeading: { paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 16 }, pickerTitle: { fontSize: 19, fontWeight: "900" }, pickerSubtitle: { fontSize: 11, marginTop: 2 }, categorySearch: { height: 44, margin: 16, marginBottom: 7, borderWidth: 1, borderRadius: 13, flexDirection: "row", alignItems: "center", paddingHorizontal: 12, gap: 8 }, categorySearchInput: { flex: 1, fontSize: 14, paddingVertical: 0 }, categoryList: { paddingHorizontal: 16, paddingBottom: 18 }, categoryOption: { minHeight: 52, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", alignItems: "center", paddingHorizontal: 4, gap: 11 }, optionCheck: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" }, categoryOptionText: { flex: 1, fontSize: 14, fontWeight: "600" }, categoryOptionCount: { minWidth: 34, textAlign: "right", fontSize: 12, fontWeight: "700" }, noCategories: { paddingVertical: 50, alignItems: "center" }, noCategoriesText: { fontSize: 13, marginTop: 8 },
  list: { paddingBottom: 110 }, loading: { flex: 1, alignItems: "center", justifyContent: "center" }, loadingCopy: { fontSize: 12, marginTop: 10 },
  discovery: { marginTop: 22 }, discoveryHeading: { paddingHorizontal: 18, flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 11 }, discoveryIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" }, discoveryTitle: { fontSize: 17, fontWeight: "900" }, discoverySubtitle: { fontSize: 10, marginTop: 1 }, discoveryList: { paddingHorizontal: 18, gap: 11 }, discoveryCardWrap: { marginBottom: 2 }, discoveryCard: { minHeight: 150, padding: 15 },
  allTitle: { fontSize: 19, fontWeight: "900", marginHorizontal: 18, marginTop: 30, marginBottom: 9 }, resultsTitle: { fontSize: 18, fontWeight: "900", marginHorizontal: 18, marginTop: 20, marginBottom: 9 },
  cardWrap: { marginHorizontal: 18, marginVertical: 6, position: "relative" }, card: { borderWidth: 1, borderRadius: 18, padding: 17, elevation: 2, shadowOffset: { width: 0, height: 4 }, shadowOpacity: .06, shadowRadius: 9 }, categoryRow: { flexDirection: "row", alignItems: "center", gap: 7, paddingRight: 34 }, dot: { width: 8, height: 8, borderRadius: 4 }, category: { flex: 1, fontSize: 10, fontWeight: "800", textTransform: "uppercase" }, cardTitle: { fontWeight: "800", lineHeight: 23, marginTop: 9, paddingRight: 25 }, excerpt: { fontSize: 12, lineHeight: 18, marginTop: 7 }, cardMeta: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 13 }, author: { flex: 1, fontSize: 10 }, readTime: { fontSize: 10, fontWeight: "700" }, share: { position: "absolute", right: 9, top: 9 },
  empty: { margin: 18, marginTop: 35, borderWidth: 1, borderRadius: 18, padding: 32, alignItems: "center" }, emptyTitle: { fontSize: 17, fontWeight: "900", marginTop: 12 }, emptyCopy: { fontSize: 12, marginTop: 4, textAlign: "center" },
});
