import { Ionicons } from "@expo/vector-icons";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAppTheme } from "@/hooks/use-app-theme";
import { parseBibleReference } from "@/src/features/scripture/scriptureFormatting";
import {
  type BibleBook,
  type BibleSearchHit,
  type BibleVersionRow,
  getBooks,
  getSelectedVersionId,
  installBibleVersion,
  listBibleVersions,
  searchBible,
  setSelectedVersionId,
} from "@/src/services/bibleService";

export default function BibleHome() {
  const { colors, size, fontFamily, darkMode } = useAppTheme();
  const router = useRouter();

  const [versions, setVersions] = useState<BibleVersionRow[]>([]);
  const [selected, setSelected] = useState<BibleVersionRow | null>(null);
  const [books, setBooks] = useState<BibleBook[]>([]);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<BibleSearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState(false);
  const [progress, setProgress] = useState(0);
  const deferredQuery = useDeferredValue(query);

  const loadFor = useCallback(async (version: BibleVersionRow | null) => {
    if (!version) {
      setBooks([]);
      return;
    }
    if (version.installed) {
      setBooks(await getBooks(version.id));
    } else {
      setBooks([]);
    }
  }, []);

  const refresh = useCallback(async () => {
    const list = await listBibleVersions();
    setVersions(list);
    if (!list.length) {
      setSelected(null);
      setLoading(false);
      return;
    }
    const savedId = await getSelectedVersionId();
    const current =
      list.find((v) => v.id === savedId) ??
      list.find((v) => v.installed) ??
      list[0];
    setSelected(current);
    await loadFor(current);
    setLoading(false);
  }, [loadFor]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      refresh().catch((e) => {
        if (active) {
          console.warn("Bible load failed:", e);
          setLoading(false);
        }
      });
      return () => {
        active = false;
      };
    }, [refresh])
  );

  const pickVersion = useCallback(
    async (version: BibleVersionRow) => {
      setSelected(version);
      setQuery("");
      setHits([]);
      await setSelectedVersionId(version.id);
      await loadFor(version);
    },
    [loadFor]
  );

  const handleInstall = useCallback(async () => {
    if (!selected || installing) return;
    setInstalling(true);
    setProgress(0);
    try {
      const ok = await installBibleVersion(selected.id, (done, total) => {
        setProgress(total ? done / total : 0);
      });
      if (ok) {
        const updated = (await listBibleVersions()).find(
          (v) => v.id === selected.id
        );
        if (updated) {
          setSelected(updated);
          setVersions((prev) =>
            prev.map((v) => (v.id === updated.id ? updated : v))
          );
          await loadFor(updated);
        }
      }
    } catch (e) {
      console.warn("Install failed:", e);
    } finally {
      setInstalling(false);
    }
  }, [selected, installing, loadFor]);

  const openBook = useCallback(
    (book: BibleBook) => {
      if (!selected) return;
      router.push({
        pathname: "/bible/chapters",
        params: { version: selected.id, book: book.book },
      });
    },
    [router, selected]
  );

  const openChapter = useCallback(
    (book: string, chapter: number) => {
      if (!selected) return;
      router.push({
        pathname: "/bible/read",
        params: { version: selected.id, book, chapter: String(chapter) },
      });
    },
    [router, selected]
  );

  const searchTerm = deferredQuery.trim();
  const matchingBooks = useMemo(() => {
    if (!searchTerm) return books;
    const normalizedQuery = searchTerm.toLocaleLowerCase();
    return books.filter((book) => book.book.toLocaleLowerCase().includes(normalizedQuery));
  }, [books, searchTerm]);
  const reference = useMemo(
    () => parseBibleReference(searchTerm, books),
    [books, searchTerm]
  );

  useEffect(() => {
    let active = true;
    if (!selected?.installed || !searchTerm || reference) {
      setHits([]);
      setSearching(false);
      return () => {
        active = false;
      };
    }

    setSearching(true);
    searchBible(searchTerm, selected.id, 60)
      .then((rows) => {
        if (active) setHits(rows);
      })
      .catch(() => {
        if (active) setHits([]);
      })
      .finally(() => {
        if (active) setSearching(false);
      });

    return () => {
      active = false;
    };
  }, [reference, searchTerm, selected?.id, selected?.installed]);

  const searchResultCount = matchingBooks.length + hits.length + (reference ? 1 : 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar
        barStyle={darkMode ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />

      <View
        style={[
          styles.header,
          { backgroundColor: colors.card, borderBottomColor: colors.border },
        ]}
      >
       
        <Text style={[styles.headerSub, { color: colors.mutedText, fontSize: size(14), fontFamily }]}>
          {selected ? selected.name : "No versions available"}
        </Text>

        {/* Version chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {versions.map((v) => {
            const active = selected?.id === v.id;
            return (
              <Pressable
                key={v.id}
                onPress={() => pickVersion(v)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? colors.primary : "transparent",
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: active ? colors.onPrimary : colors.text, fontFamily, fontSize: size(13) },
                  ]}
                >
                  {v.abbreviation || v.name}
                </Text>
                {!v.installed && (
                  <Ionicons
                    name="cloud-download-outline"
                    size={size(13)}
                    color={active ? colors.onPrimary : colors.mutedText}
                    style={{ marginLeft: 5 }}
                  />
                )}
              </Pressable>
            );
          })}
        </ScrollView>

        {selected?.installed ? (
          <View style={[styles.searchBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Ionicons name="search" size={size(18)} color={colors.mutedText} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={`Search ${selected.abbreviation || selected.name}`}
              placeholderTextColor={colors.subtleText}
              autoCorrect={false}
              autoCapitalize="words"
              returnKeyType="search"
              clearButtonMode="while-editing"
              style={[styles.searchInput, { color: colors.text, fontSize: size(15), fontFamily }]}
            />
            {searching ? <ActivityIndicator size="small" color={colors.tint} /> : query ? (
              <Pressable accessibilityLabel="Clear Bible search" onPress={() => setQuery("")} hitSlop={8}>
                <Ionicons name="close-circle" size={size(19)} color={colors.mutedText} />
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : !selected ? (
        <View style={styles.center}>
          <Text style={[styles.muted, { color: colors.mutedText, fontFamily, fontSize: size(15) }]}>
            No Bible versions found.
          </Text>
        </View>
      ) : !selected.installed ? (
        <View style={styles.center}>
          <Ionicons name="book-outline" size={48} color={colors.tint} />
          <Text style={[styles.installTitle, { color: colors.text, fontFamily, fontSize: size(18) }]}>
            {selected.name}
          </Text>
          <Text style={[styles.muted, { color: colors.mutedText, fontFamily, fontSize: size(14) }]}>
            {selected.source === "remote"
              ? "Download this version to read offline."
              : "Install this version to start reading."}
          </Text>

          {installing ? (
            <View style={styles.progressWrap}>
              <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.progressFill,
                    { backgroundColor: colors.primary, width: `${Math.round(progress * 100)}%` },
                  ]}
                />
              </View>
              <Text style={[styles.muted, { color: colors.mutedText, fontFamily, fontSize: size(13) }]}>
                Installing… {Math.round(progress * 100)}%
              </Text>
            </View>
          ) : (
            <Pressable
              onPress={handleInstall}
              style={[styles.installBtn, { backgroundColor: colors.primary }]}
            >
              <Ionicons name="download-outline" size={18} color={colors.onPrimary} />
              <Text style={[styles.installBtnText, { color: colors.onPrimary, fontFamily, fontSize: size(15) }]}>
                {selected.source === "remote" ? "Download" : "Install"}
              </Text>
            </Pressable>
          )}
        </View>
      ) : (
        <FlatList
          data={matchingBooks}
          keyExtractor={(item) => item.book}
          numColumns={2}
          columnWrapperStyle={styles.bookRow}
          contentContainerStyle={styles.bookList}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={searchTerm ? (
            <View style={styles.searchResults}>
              <Text style={[styles.resultSummary, { color: colors.mutedText, fontFamily, fontSize: size(13) }]}>
                {searchResultCount} result{searchResultCount === 1 ? "" : "s"} in {selected.abbreviation || selected.name}
              </Text>
              {reference ? (
                <Pressable
                  onPress={() => openChapter(reference.book.book, reference.chapter)}
                  style={[styles.referenceResult, { backgroundColor: `${colors.tint}14`, borderColor: colors.tint }]}
                >
                  <Ionicons name="navigate-outline" size={size(19)} color={colors.tint} />
                  <View style={styles.resultCopy}>
                    <Text style={[styles.referenceTitle, { color: colors.text, fontFamily, fontSize: size(15) }]}>
                      Go to {reference.book.book} {reference.chapter}{reference.startVerse ? `:${reference.startVerse}${reference.endVerse && reference.endVerse !== reference.startVerse ? `-${reference.endVerse}` : ""}` : ""}
                    </Text>
                    <Text style={[styles.referenceSubtitle, { color: colors.mutedText, fontFamily, fontSize: size(12) }]}>Open this passage in {selected.abbreviation || selected.name}</Text>
                  </View>
                </Pressable>
              ) : null}
              {hits.length ? (
                <View style={styles.hitSection}>
                  <Text style={[styles.sectionLabel, { color: colors.text, fontFamily, fontSize: size(14) }]}>Verse matches</Text>
                  {hits.map((hit) => (
                    <Pressable
                      key={`${hit.book}-${hit.chapter}-${hit.verse}`}
                      onPress={() => openChapter(hit.book, hit.chapter)}
                      style={[styles.hit, { backgroundColor: colors.card, borderColor: colors.border }]}
                    >
                      <Text style={[styles.hitReference, { color: colors.tint, fontFamily, fontSize: size(13) }]}>{hit.book} {hit.chapter}:{hit.verse}</Text>
                      <Text numberOfLines={2} style={[styles.hitText, { color: colors.text, fontFamily, fontSize: size(14) }]}>{hit.text}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
              {matchingBooks.length ? <Text style={[styles.sectionLabel, { color: colors.text, fontFamily, fontSize: size(14) }]}>Books</Text> : null}
            </View>
          ) : null}
          ListEmptyComponent={searchTerm && !searching && !reference && hits.length === 0 ? (
            <View style={styles.emptySearch}>
              <Ionicons name="search-outline" size={36} color={colors.mutedText} />
              <Text style={[styles.muted, { color: colors.mutedText, fontFamily, fontSize: size(14) }]}>No books or verses found in {selected.abbreviation || selected.name}.</Text>
            </View>
          ) : null}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => openBook(item)}
              style={[styles.bookCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Text
                numberOfLines={1}
                style={[styles.bookName, { color: colors.text, fontFamily, fontSize: size(15) }]}
              >
                {item.book}
              </Text>
              <Text style={[styles.bookMeta, { color: colors.mutedText, fontFamily, fontSize: size(12) }]}>
                {item.chapterCount} ch.
              </Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: Platform.OS === "ios" ? 56 : 40,
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerTitle: { fontWeight: "800" },
  headerSub: { marginTop: 2, fontWeight: "500" },
  chips: { gap: 8, paddingTop: 14, paddingRight: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 8,
  },
  chipText: { fontWeight: "700" },
  searchBox: { minHeight: 46, marginTop: 12, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 8 },
  searchInput: { flex: 1, minHeight: 44 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 30, gap: 12 },
  muted: { textAlign: "center", lineHeight: 20 },
  installTitle: { fontWeight: "800", marginTop: 4 },
  installBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 8,
  },
  installBtnText: { fontWeight: "700" },
  progressWrap: { width: "80%", alignItems: "center", gap: 8, marginTop: 8 },
  progressTrack: { width: "100%", height: 8, borderRadius: 999, overflow: "hidden" },
  progressFill: { height: 8, borderRadius: 999 },
  bookList: { padding: 16, paddingBottom: 120 },
  searchResults: { paddingBottom: 12 },
  resultSummary: { marginBottom: 12, fontWeight: "600" },
  referenceResult: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 14, padding: 13, marginBottom: 14 },
  resultCopy: { flex: 1 },
  referenceTitle: { fontWeight: "800" },
  referenceSubtitle: { marginTop: 2 },
  hitSection: { gap: 8, marginBottom: 14 },
  sectionLabel: { fontWeight: "800", marginBottom: 8 },
  hit: { borderWidth: 1, borderRadius: 14, padding: 12 },
  hitReference: { fontWeight: "800", marginBottom: 4 },
  hitText: { lineHeight: 20 },
  emptySearch: { flex: 1, alignItems: "center", justifyContent: "center", padding: 36, gap: 10 },
  bookRow: { gap: 12 },
  bookCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  bookName: { fontWeight: "700" },
  bookMeta: { marginTop: 4 },
});
