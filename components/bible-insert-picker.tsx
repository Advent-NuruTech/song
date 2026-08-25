import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";

import { useAppTheme } from "@/hooks/use-app-theme";
import {
  buildVerseText,
  formatScriptureSelection,
  parseBibleReference,
  type FormattedScripture,
  type TextSelection,
} from "@/src/features/scripture/scriptureFormatting";
import {
  type BibleBook,
  type BibleSearchHit,
  type BibleVerse,
  type BibleVersionRow,
  getBooks,
  getChapter,
  getSelectedVersionId,
  installBibleVersion,
  listBibleVersions,
  searchBible,
  setSelectedVersionId,
} from "@/src/services/bibleService";

export type BibleInsertion = FormattedScripture & {
  versionId: string;
  versionLabel: string;
};

export function BibleInsertPicker({ visible, onClose, onInsert }: {
  visible: boolean;
  onClose: () => void;
  onInsert: (value: BibleInsertion) => boolean | void;
}) {
  const { colors, fontFamily } = useAppTheme();
  const { height: windowHeight } = useWindowDimensions();
  const [versions, setVersions] = useState<BibleVersionRow[]>([]);
  const [version, setVersion] = useState<BibleVersionRow | null>(null);
  const [books, setBooks] = useState<BibleBook[]>([]);
  const [book, setBook] = useState<BibleBook | null>(null);
  const [chapter, setChapter] = useState(1);
  const [verses, setVerses] = useState<BibleVerse[]>([]);
  const [selectedVerses, setSelectedVerses] = useState<number[]>([]);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<BibleSearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewSelection, setPreviewSelection] = useState<TextSelection>({ start: 0, end: 0 });
  const [previewHeight, setPreviewHeight] = useState(62);
  const [previewExpanded, setPreviewExpanded] = useState(false);
  const [dialogMaximized, setDialogMaximized] = useState(false);
  const searchSequence = useRef(0);

  const loadVersion = useCallback(async (nextVersion: BibleVersionRow) => {
    setErrorMessage(null);
    setVersion(nextVersion);
    setBook(null);
    setVerses([]);
    setSelectedVerses([]);
    setHits([]);
    setQuery("");
    try {
      await setSelectedVersionId(nextVersion.id);
      setBooks(nextVersion.installed ? await getBooks(nextVersion.id) : []);
    } catch (error) {
      setBooks([]);
      setErrorMessage((error as Error)?.message || "This Bible version could not be opened.");
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    let active = true;
    setLoading(true);
    void (async () => {
      try {
        const rows = await listBibleVersions();
        if (!active) return;
        setVersions(rows);
        const preferredId = await getSelectedVersionId();
        const preferred = rows.find((item) => item.id === preferredId)
          ?? rows.find((item) => item.installed)
          ?? rows[0]
          ?? null;
        if (preferred) await loadVersion(preferred);
      } catch (error) {
        setErrorMessage((error as Error)?.message || "Please try again.");
        Alert.alert("Bible unavailable", (error as Error)?.message || "Please try again.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; searchSequence.current += 1; };
  }, [loadVersion, visible]);

  const openChapter = useCallback(async (nextBook: BibleBook, nextChapter: number, range?: { start?: number; end?: number; all?: boolean }) => {
    if (!version) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const rows = await getChapter(version.id, nextBook.book, nextChapter);
      setBook(nextBook);
      setChapter(nextChapter);
      setVerses(rows);
      const selected = range?.all
        ? rows.map((item) => item.verse)
        : range?.start
        ? rows.filter((item) => item.verse >= range.start! && item.verse <= (range.end ?? range.start!)).map((item) => item.verse)
        : [];
      setSelectedVerses(selected);
      setPreviewSelection({ start: 0, end: 0 });
      setHits([]);
    } catch (error) {
      setErrorMessage((error as Error)?.message || "This chapter could not be opened.");
    } finally {
      setLoading(false);
    }
  }, [version]);

  useEffect(() => {
    if (!visible || !version?.installed || !query.trim()) {
      setHits([]);
      setSearching(false);
      return;
    }
    const sequence = ++searchSequence.current;
    const timer = setTimeout(() => {
      void (async () => {
        setSearching(true);
        try {
          setErrorMessage(null);
          const reference = parseBibleReference(query, books);
          if (reference) {
            const rows = await getChapter(version.id, reference.book.book, reference.chapter);
            if (sequence !== searchSequence.current) return;
            const matching = rows
              .filter((item) => reference.startVerse === undefined || (item.verse >= reference.startVerse && item.verse <= (reference.endVerse ?? reference.startVerse)))
              .map((item) => ({ versionId: version.id, book: reference.book.book, bookOrder: reference.book.bookOrder, chapter: reference.chapter, verse: item.verse, text: item.text }));
            setHits(matching);
          } else {
            const matching = await searchBible(query, version.id, 40);
            if (sequence === searchSequence.current) setHits(matching);
          }
        } catch (error) {
          if (sequence === searchSequence.current) {
            setHits([]);
            setErrorMessage((error as Error)?.message || "Bible search failed. Please try again.");
          }
        } finally {
          if (sequence === searchSequence.current) setSearching(false);
        }
      })();
    }, 250);
    return () => clearTimeout(timer);
  }, [books, query, version, visible]);

  const selectedRows = useMemo(() => {
    if (!selectedVerses.length) return [];
    const rowsByNumber = new Map(verses.map((item) => [item.verse, item]));
    return selectedVerses.map((number) => rowsByNumber.get(number)).filter((item): item is BibleVerse => Boolean(item));
  }, [selectedVerses, verses]);
  const preview = useMemo(() => buildVerseText(selectedRows), [selectedRows]);
  const allChapterSelected = Boolean(verses.length) && selectedRows.length === verses.length;
  const entireChapterSelected = allChapterSelected && selectedRows.every((item, index) => item.verse === verses[index]?.verse);

  useEffect(() => {
    setPreviewSelection({ start: 0, end: preview.text.length });
  }, [preview.text]);

  const chooseHit = useCallback(async (hit: BibleSearchHit) => {
    const targetBook = books.find((item) => item.book === hit.book);
    if (!targetBook) return;
    const reference = parseBibleReference(query, books);
    setQuery("");
    await openChapter(targetBook, hit.chapter, reference
      ? reference.startVerse === undefined
        ? { all: true }
        : { start: reference.startVerse, end: reference.endVerse }
      : { start: hit.verse, end: hit.verse });
  }, [books, openChapter, query]);

  const install = useCallback(async () => {
    if (!version || installing) return;
    setInstalling(true);
    setProgress(0);
    try {
      setErrorMessage(null);
      const installed = await installBibleVersion(version.id, (done, total) => setProgress(total ? done / total : 0));
      if (!installed) throw new Error("This translation could not be installed.");
      const rows = await listBibleVersions();
      const updated = rows.find((item) => item.id === version.id);
      setVersions(rows);
      if (updated) await loadVersion(updated);
    } catch (error) {
      setErrorMessage((error as Error)?.message || "This translation could not be installed.");
      Alert.alert("Installation failed", (error as Error)?.message || "Please try again.");
    } finally {
      setInstalling(false);
    }
  }, [installing, loadVersion, version]);

  const insert = useCallback(() => {
    if (!version || !book || !selectedRows.length) return;
    const versionLabel = version.abbreviation || version.name;
    const formatted = formatScriptureSelection({
      book: book.book,
      chapter,
      verses: selectedRows,
      versionLabel,
      selection: previewSelection,
      entireChapter: entireChapterSelected,
    });
    if (!formatted) return;
    const accepted = onInsert({ ...formatted, versionId: version.id, versionLabel });
    if (accepted !== false) onClose();
  }, [book, chapter, entireChapterSelected, onClose, onInsert, previewSelection, selectedRows, version]);

  const toggleVerse = (verse: number) => setSelectedVerses((current) => current.includes(verse)
    ? current.filter((number) => number !== verse)
    : [...current, verse]);

  return <Modal visible={visible} transparent={Platform.OS === "web"} animationType={Platform.OS === "web" ? "fade" : "slide"} presentationStyle={Platform.OS === "web" ? "overFullScreen" : "pageSheet"} onRequestClose={onClose}>
    <View style={Platform.OS === "web" ? styles.desktopBackdrop : styles.nativeBackdrop}>
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={[styles.container, Platform.OS === "web" && styles.desktopDialog, Platform.OS === "web" && dialogMaximized && styles.desktopDialogMaximized, { backgroundColor: colors.background, borderColor: colors.border }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerCopy}><Text style={[styles.title, { color: colors.text, fontFamily }]}>Insert Scripture</Text><Text style={[styles.subtitle, { color: colors.mutedText, fontFamily }]}>Search, choose, then long-press to select exact words.</Text></View>
        {Platform.OS === "web" ? <Pressable accessibilityLabel={dialogMaximized ? "Restore Bible picker size" : "Maximize Bible picker"} onPress={() => setDialogMaximized((current) => !current)} style={styles.iconButton}><Ionicons name={dialogMaximized ? "contract-outline" : "expand-outline"} size={22} color={colors.text} /></Pressable> : null}
        <Pressable accessibilityLabel="Close Bible picker" onPress={onClose} style={styles.iconButton}><Ionicons name="close" size={25} color={colors.text} /></Pressable>
      </View>

      {loading && !verses.length ? <View style={styles.center}><ActivityIndicator size="large" color={colors.tint} /></View> : <>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.versionRow} keyboardShouldPersistTaps="handled">
          {versions.map((item) => <Pressable key={item.id} accessibilityRole="button" accessibilityState={{ selected: item.id === version?.id }} onPress={() => void loadVersion(item)} style={[styles.versionChip, { borderColor: item.id === version?.id ? colors.tint : colors.border, backgroundColor: item.id === version?.id ? `${colors.tint}18` : colors.card }]}><Text style={[styles.versionText, { color: item.id === version?.id ? colors.tint : colors.text, fontFamily }]}>{item.abbreviation || item.name}</Text>{!item.installed ? <Ionicons name="cloud-download-outline" size={14} color={colors.mutedText} /> : null}</Pressable>)}
        </ScrollView>
        {errorMessage ? <View style={[styles.errorBanner, { backgroundColor: `${colors.tint}12`, borderColor: colors.border }]}><Ionicons name="alert-circle-outline" size={18} color={colors.tint} /><Text style={[styles.errorText, { color: colors.text, fontFamily }]}>{errorMessage}</Text><Pressable accessibilityRole="button" onPress={() => version ? void loadVersion(version) : setErrorMessage(null)}><Text style={[styles.retryText, { color: colors.tint, fontFamily }]}>Retry</Text></Pressable></View> : null}

        {!version ? <View style={styles.center}><Text style={{ color: colors.mutedText, fontFamily }}>No Bible translations are available.</Text></View> : !version.installed ? <View style={styles.center}>
          <Ionicons name="book-outline" size={48} color={colors.tint} /><Text style={[styles.installTitle, { color: colors.text, fontFamily }]}>{version.name}</Text><Text style={[styles.installCopy, { color: colors.mutedText, fontFamily }]}>Install this translation once to search and insert verses offline.</Text>
          {installing ? <View style={styles.progressWrap}><View style={[styles.progressTrack, { backgroundColor: colors.border }]}><View style={[styles.progressFill, { backgroundColor: colors.tint, width: `${Math.round(progress * 100)}%` }]} /></View><Text style={{ color: colors.mutedText, fontFamily }}>{Math.round(progress * 100)}%</Text></View> : <Pressable onPress={() => void install()} style={[styles.primaryButton, { backgroundColor: colors.tint }]}><Ionicons name="download-outline" size={18} color="#fff" /><Text style={[styles.primaryText, { fontFamily }]}>Install translation</Text></Pressable>}
        </View> : <>
          <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}><Ionicons name="search" size={18} color={colors.mutedText} /><TextInput value={query} onChangeText={setQuery} placeholder="John 3:16 or search verse text" placeholderTextColor={colors.mutedText} autoCapitalize="words" returnKeyType="search" style={[styles.searchInput, { color: colors.text, fontFamily }]} />{searching ? <ActivityIndicator size="small" color={colors.tint} /> : query ? <Pressable accessibilityLabel="Clear Bible search" onPress={() => setQuery("")}><Ionicons name="close-circle" size={19} color={colors.mutedText} /></Pressable> : null}</View>

          {query ? <FlatList data={hits} keyExtractor={(item) => `${item.book}-${item.chapter}-${item.verse}`} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.listContent} renderItem={({ item }) => <Pressable onPress={() => void chooseHit(item)} style={[styles.hit, { borderBottomColor: colors.border }]}><Text style={[styles.hitRef, { color: colors.tint, fontFamily }]}>{item.book} {item.chapter}:{item.verse}</Text><Text numberOfLines={2} style={[styles.hitText, { color: colors.text, fontFamily }]}>{item.text}</Text></Pressable>} ListEmptyComponent={!searching ? <Text style={[styles.empty, { color: colors.mutedText, fontFamily }]}>No verses found in {version.abbreviation || version.name}.</Text> : null} /> : !book ? <FlatList data={books} keyExtractor={(item) => item.book} numColumns={2} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.listContent} columnWrapperStyle={styles.bookRow} renderItem={({ item }) => <Pressable onPress={() => void openChapter(item, 1)} style={[styles.bookCard, { backgroundColor: colors.card, borderColor: colors.border }]}><Text numberOfLines={1} style={[styles.bookName, { color: colors.text, fontFamily }]}>{item.book}</Text><Text style={[styles.bookMeta, { color: colors.mutedText, fontFamily }]}>{item.chapterCount} chapters</Text></Pressable>} /> : <View style={styles.chapterArea}>
            <View style={styles.chapterHeader}><Pressable onPress={() => { setBook(null); setVerses([]); setSelectedVerses([]); }} style={styles.backButton}><Ionicons name="chevron-back" size={20} color={colors.tint} /><Text style={[styles.backText, { color: colors.tint, fontFamily }]}>{book.book}</Text></Pressable><Pressable onPress={() => setSelectedVerses(selectedRows.length === verses.length ? [] : verses.map((item) => item.verse))}><Text style={[styles.selectAll, { color: colors.tint, fontFamily }]}>{selectedRows.length === verses.length ? "Clear" : "Select chapter"}</Text></Pressable></View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chapterRow}>{Array.from({ length: book.chapterCount }, (_, index) => index + 1).map((number) => <Pressable key={number} onPress={() => void openChapter(book, number)} style={[styles.chapterChip, { backgroundColor: number === chapter ? colors.tint : colors.card, borderColor: number === chapter ? colors.tint : colors.border }]}><Text style={[styles.chapterText, { color: number === chapter ? "#fff" : colors.text, fontFamily }]}>{number}</Text></Pressable>)}</ScrollView>
            <FlatList data={verses} keyExtractor={(item) => String(item.verse)} extraData={selectedVerses} contentContainerStyle={[styles.verseList, { paddingBottom: selectedRows.length ? 250 : 30 }]} renderItem={({ item }) => { const selected = selectedVerses.includes(item.verse); return <Pressable onPress={() => toggleVerse(item.verse)} accessibilityRole="checkbox" accessibilityState={{ checked: selected }} style={[styles.verseRow, { backgroundColor: selected ? `${colors.tint}18` : "transparent", borderColor: selected ? `${colors.tint}55` : "transparent" }]}><Text style={[styles.verseNumber, { color: colors.tint, fontFamily }]}>{item.verse}</Text><Text style={[styles.verseText, { color: colors.text, fontFamily }]}>{item.text}</Text></Pressable>; }} />
          </View>}
        </>}
      </>}

      {book && selectedRows.length ? <View style={[styles.previewPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.previewHeader}><View style={styles.previewCopy}><Text style={[styles.previewTitle, { color: colors.text, fontFamily }]}>Exact text</Text><Text style={[styles.previewHelp, { color: colors.mutedText, fontFamily }]}>Long-press and drag the handles, or insert the full selection.</Text></View><Text style={[styles.previewRef, { color: colors.tint, fontFamily }]}>{book.book} {chapter}</Text><Pressable accessibilityLabel={previewExpanded ? "Minimize selected text" : "Maximize selected text"} onPress={() => setPreviewExpanded((current) => !current)} style={styles.previewSizeButton}><Ionicons name={previewExpanded ? "contract-outline" : "expand-outline"} size={18} color={colors.tint} /></Pressable></View>
        <TextInput value={preview.text} onChangeText={() => {}} onContentSizeChange={(event) => setPreviewHeight(Math.max(62, Math.ceil(event.nativeEvent.contentSize.height + 20)))} onSelectionChange={(event) => setPreviewSelection(event.nativeEvent.selection)} selection={previewSelection} multiline scrollEnabled={previewHeight > windowHeight * (previewExpanded ? .52 : .27)} selectTextOnFocus={false} contextMenuHidden={false} style={[styles.previewInput, { height: Math.min(previewHeight, windowHeight * (previewExpanded ? .52 : .27)), color: colors.text, borderColor: colors.border, fontFamily }]} />
        <Pressable accessibilityLabel="Insert selected Bible passage" onPress={insert} style={[styles.insertButton, { backgroundColor: colors.tint }]}><Ionicons name="return-down-back" size={18} color="#fff" /><Text style={[styles.primaryText, { fontFamily }]}>Insert at cursor</Text></Pressable>
      </View> : null}
    </KeyboardAvoidingView>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  nativeBackdrop: { flex: 1 }, desktopBackdrop: { flex: 1, padding: 22, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(2,6,23,.68)" }, container: { flex: 1 }, desktopDialog: { width: "100%", maxWidth: 1040, height: "90%", flex: 0, borderWidth: 1, borderRadius: 20, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 18 }, shadowOpacity: .28, shadowRadius: 36 }, desktopDialogMaximized: { width: "100%", maxWidth: "100%", height: "100%", borderRadius: 0 }, header: { minHeight: 72, borderBottomWidth: 1, paddingHorizontal: 18, flexDirection: "row", alignItems: "center" }, headerCopy: { flex: 1 }, title: { fontSize: 20, fontWeight: "900" }, subtitle: { fontSize: 11, marginTop: 3 }, iconButton: { width: 42, height: 42, alignItems: "center", justifyContent: "center" }, center: { flex: 1, padding: 28, alignItems: "center", justifyContent: "center", gap: 12 },
  versionRow: { minHeight: 57, paddingHorizontal: 14, alignItems: "center", gap: 8 }, versionChip: { minHeight: 34, borderWidth: 1, borderRadius: 18, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 5 }, versionText: { fontSize: 12, fontWeight: "800" }, installTitle: { fontSize: 19, fontWeight: "900", textAlign: "center" }, installCopy: { fontSize: 13, lineHeight: 20, textAlign: "center", maxWidth: 340 }, primaryButton: { minHeight: 46, borderRadius: 14, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 5 }, primaryText: { color: "#fff", fontWeight: "900" }, progressWrap: { width: "80%", alignItems: "center", gap: 8 }, progressTrack: { width: "100%", height: 8, borderRadius: 4, overflow: "hidden" }, progressFill: { height: 8 },
  errorBanner: { minHeight: 42, marginHorizontal: 14, marginBottom: 8, paddingHorizontal: 11, borderWidth: 1, borderRadius: 11, flexDirection: "row", alignItems: "center", gap: 8 }, errorText: { flex: 1, fontSize: 11 }, retryText: { fontSize: 11, fontWeight: "900" },
  searchBox: { minHeight: 46, marginHorizontal: 14, marginBottom: 8, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 8 }, searchInput: { flex: 1, minHeight: 44, paddingVertical: 0 }, listContent: { padding: 14, paddingBottom: 30 }, hit: { paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth }, hitRef: { fontSize: 12, fontWeight: "900", marginBottom: 4 }, hitText: { fontSize: 14, lineHeight: 20 }, empty: { textAlign: "center", paddingVertical: 40 }, bookRow: { gap: 10 }, bookCard: { flex: 1, borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10 }, bookName: { fontWeight: "800" }, bookMeta: { fontSize: 11, marginTop: 3 },
  chapterArea: { flex: 1 }, chapterHeader: { minHeight: 40, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, backButton: { flexDirection: "row", alignItems: "center" }, backText: { fontWeight: "900" }, selectAll: { fontSize: 12, fontWeight: "900" }, chapterRow: { paddingHorizontal: 14, paddingVertical: 7, gap: 7 }, chapterChip: { width: 36, height: 36, borderWidth: 1, borderRadius: 18, alignItems: "center", justifyContent: "center" }, chapterText: { fontSize: 12, fontWeight: "800" }, verseList: { paddingHorizontal: 14 }, verseRow: { flexDirection: "row", gap: 10, padding: 10, marginBottom: 3, borderWidth: 1, borderRadius: 11 }, verseNumber: { width: 22, fontSize: 12, fontWeight: "900", paddingTop: 2 }, verseText: { flex: 1, fontSize: 15, lineHeight: 22 },
  previewPanel: { position: "absolute", left: 10, right: 10, bottom: 10, borderWidth: 1, borderRadius: 18, padding: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: .18, shadowRadius: 12, elevation: 8 }, previewHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }, previewCopy: { flex: 1 }, previewTitle: { fontSize: 14, fontWeight: "900" }, previewHelp: { fontSize: 10, marginTop: 2 }, previewRef: { fontSize: 11, fontWeight: "900" }, previewSizeButton: { width: 34, height: 34, alignItems: "center", justifyContent: "center", borderRadius: 9 }, previewInput: { minHeight: 62, borderWidth: 1, borderRadius: 11, padding: 10, fontSize: 14, lineHeight: 20, textAlignVertical: "top" }, insertButton: { minHeight: 44, marginTop: 9, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
});
