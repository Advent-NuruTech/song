import { Ionicons } from "@expo/vector-icons";
import { Link, Stack } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { ShareIconButton } from "@/components/share-icon-button";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useQuickFooter } from "@/src/context/QuickFooterContext";
import { shareStudyLink } from "@/src/services/shareService";
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
  const clearSearch = () => { setQuery(""); setCategory(null); void getStudySummaries({ limit: 200 }).then(setAllStudies); };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.fixedHeader, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={styles.titleRow}>
          <View><Text style={[styles.title, { color: colors.text, fontFamily, fontSize: size(24) }]}>Studies</Text><Text style={[styles.subtitle, { color: colors.mutedText, fontFamily }]}>Learn, reflect and grow</Text></View>
          <View style={[styles.totalBadge, { backgroundColor: `${colors.tint}14` }]}><Text style={[styles.totalText, { color: colors.tint, fontFamily }]}>{visible.length}</Text></View>
        </View>
        <View style={[styles.search, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="search" size={19} color={colors.mutedText} />
          <TextInput value={query} onChangeText={setQuery} placeholder="Search studies" placeholderTextColor={colors.mutedText} returnKeyType="search" style={[styles.searchInput, { color: colors.text, fontFamily }]} />
          {searching ? <ActivityIndicator size="small" color={colors.tint} /> : query ? <Pressable onPress={clearSearch} hitSlop={8}><Ionicons name="close-circle" size={20} color={colors.mutedText} /></Pressable> : null}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <Chip label="All" active={!category} onPress={() => setCategory(null)} />
          {categories.map((item) => <Chip key={item.category} label={`${item.category}  ${item.count}`} active={category === item.category} onPress={() => setCategory(category === item.category ? null : item.category)} />)}
        </ScrollView>
      </View>

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

  function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
    return <Pressable onPress={onPress} style={[styles.chip, { backgroundColor: active ? colors.primary : colors.card, borderColor: active ? colors.primary : colors.border }]}><Text style={[styles.chipText, { color: active ? colors.onPrimary : colors.text, fontFamily }]}>{label}</Text></Pressable>;
  }

  function StudyCard({ study, compact = false }: { study: StudySummary; compact?: boolean }) {
    const accent = getCategoryColor(study.category);
    return <View style={[compact ? styles.discoveryCardWrap : styles.cardWrap, compact && { width: 260 }]}>
      <Link href={{ pathname: "/studies/[id]", params: { id: study.id } }} asChild>
        <Pressable style={({ pressed }) => [styles.card, compact && styles.discoveryCard, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: darkMode ? "#000" : "#0F172A" }, pressed && { opacity: .72 }]}>
          <View style={styles.categoryRow}><View style={[styles.dot, { backgroundColor: accent }]} /><Text numberOfLines={1} style={[styles.category, { color: colors.mutedText, fontFamily }]}>{study.category}</Text></View>
          <Text numberOfLines={compact ? 3 : 2} style={[styles.cardTitle, { color: colors.text, fontFamily, fontSize: size(compact ? 15 : 17) }]}>{study.title}</Text>
          {!compact && study.excerpt ? <Text numberOfLines={2} style={[styles.excerpt, { color: colors.mutedText, fontFamily }]}>{study.excerpt}</Text> : null}
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
  screen: { flex: 1 }, fixedHeader: { borderBottomWidth: StyleSheet.hairlineWidth, paddingTop: 12 },
  titleRow: { paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, title: { fontWeight: "900", letterSpacing: -.4 }, subtitle: { fontSize: 11, marginTop: 1 }, totalBadge: { minWidth: 34, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" }, totalText: { fontSize: 12, fontWeight: "900" },
  search: { height: 45, marginHorizontal: 18, marginTop: 12, borderRadius: 14, borderWidth: 1, flexDirection: "row", alignItems: "center", paddingHorizontal: 13, gap: 9 }, searchInput: { flex: 1, fontSize: 14, paddingVertical: 0 }, chips: { paddingHorizontal: 18, paddingVertical: 11, gap: 8 }, chip: { height: 34, paddingHorizontal: 14, borderRadius: 17, borderWidth: 1, alignItems: "center", justifyContent: "center" }, chipText: { fontSize: 12, fontWeight: "700" },
  list: { paddingBottom: 110 }, loading: { flex: 1, alignItems: "center", justifyContent: "center" }, loadingCopy: { fontSize: 12, marginTop: 10 },
  discovery: { marginTop: 22 }, discoveryHeading: { paddingHorizontal: 18, flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 11 }, discoveryIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" }, discoveryTitle: { fontSize: 17, fontWeight: "900" }, discoverySubtitle: { fontSize: 10, marginTop: 1 }, discoveryList: { paddingHorizontal: 18, gap: 11 }, discoveryCardWrap: { marginBottom: 2 }, discoveryCard: { minHeight: 150, padding: 15 },
  allTitle: { fontSize: 19, fontWeight: "900", marginHorizontal: 18, marginTop: 30, marginBottom: 9 }, resultsTitle: { fontSize: 18, fontWeight: "900", marginHorizontal: 18, marginTop: 20, marginBottom: 9 },
  cardWrap: { marginHorizontal: 18, marginVertical: 6, position: "relative" }, card: { borderWidth: 1, borderRadius: 18, padding: 17, elevation: 2, shadowOffset: { width: 0, height: 4 }, shadowOpacity: .06, shadowRadius: 9 }, categoryRow: { flexDirection: "row", alignItems: "center", gap: 7, paddingRight: 34 }, dot: { width: 8, height: 8, borderRadius: 4 }, category: { flex: 1, fontSize: 10, fontWeight: "800", textTransform: "uppercase" }, cardTitle: { fontWeight: "800", lineHeight: 23, marginTop: 9, paddingRight: 25 }, excerpt: { fontSize: 12, lineHeight: 18, marginTop: 7 }, cardMeta: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 13 }, author: { flex: 1, fontSize: 10 }, readTime: { fontSize: 10, fontWeight: "700" }, share: { position: "absolute", right: 9, top: 9 },
  empty: { margin: 18, marginTop: 35, borderWidth: 1, borderRadius: 18, padding: 32, alignItems: "center" }, emptyTitle: { fontSize: 17, fontWeight: "900", marginTop: 12 }, emptyCopy: { fontSize: 12, marginTop: 4, textAlign: "center" },
});
