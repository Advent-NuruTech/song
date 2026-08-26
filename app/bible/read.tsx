import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { ChevronLeft, ChevronRight, Copy, Share2, X } from "@/components/icons";

import { ShareIconButton } from "@/components/share-icon-button";
import { ShareSheet } from "@/components/share-sheet";
import { ScriptureShareEditor } from "@/components/scripture-share-editor";
import { Toast } from "@/components/toast";
import { useAppTheme } from "@/hooks/use-app-theme";
import {
  copyScripture,
  shareScripture,
  verseReference,
} from "@/src/services/shareService";
import {
  type BibleBook,
  type BibleVerse,
  getBooks,
  getChapter,
} from "@/src/services/bibleService";

export default function BibleReader() {
  const { colors, size, fontFamily, darkMode } = useAppTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ version: string; book: string; chapter: string }>();

  const versionId = String(params.version ?? "");
  const [books, setBooks] = useState<BibleBook[]>([]);
  const [book, setBook] = useState(String(params.book ?? ""));
  const [chapter, setChapter] = useState(Number(params.chapter ?? 1) || 1);
  const [verses, setVerses] = useState<BibleVerse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [shareOpen, setShareOpen] = useState(false);
  const [editorPayload, setEditorPayload] = useState<{ reference: string; text: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!versionId) return;
      const list = await getBooks(versionId);
      if (active) setBooks(list);
    })();
    return () => {
      active = false;
    };
  }, [versionId]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    (async () => {
      if (!versionId || !book) return;
      const rows = await getChapter(versionId, book, chapter);
      if (!active) return;
      setVerses(rows);
      setSelected(new Set());
      setLoading(false);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    })();
    return () => {
      active = false;
    };
  }, [versionId, book, chapter]);

  const bookIndex = useMemo(
    () => books.findIndex((b) => b.book === book),
    [books, book]
  );
  const currentBook = bookIndex >= 0 ? books[bookIndex] : null;

  const canPrev = chapter > 1 || bookIndex > 0;
  const canNext =
    (currentBook ? chapter < currentBook.chapterCount : false) ||
    bookIndex < books.length - 1;

  const goPrev = useCallback(() => {
    if (chapter > 1) {
      setChapter((c) => c - 1);
    } else if (bookIndex > 0) {
      const prev = books[bookIndex - 1];
      setBook(prev.book);
      setChapter(prev.chapterCount || 1);
    }
  }, [chapter, bookIndex, books]);

  const goNext = useCallback(() => {
    if (currentBook && chapter < currentBook.chapterCount) {
      setChapter((c) => c + 1);
    } else if (bookIndex < books.length - 1) {
      const next = books[bookIndex + 1];
      setBook(next.book);
      setChapter(1);
    }
  }, [currentBook, chapter, bookIndex, books]);

  const toggleVerse = useCallback((verse: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(verse)) next.delete(verse);
      else next.add(verse);
      return next;
    });
  }, []);

  const selectedVerses = useMemo(
    () => verses.filter((v) => selected.has(v.verse)),
    [verses, selected]
  );

  // Whole chapter
  const shareChapter = useCallback(() => {
    void shareScripture(`${book} ${chapter}`, verses);
  }, [book, chapter, verses]);

  const copyChapter = useCallback(async () => {
    const ok = await copyScripture(`${book} ${chapter}`, verses);
    setToast(ok ? "Chapter copied" : "Couldn't copy");
  }, [book, chapter, verses]);

  // Selected verses
  const openSelectionEditor = useCallback(() => {
    if (!selectedVerses.length) return;
    const ref = verseReference(book, chapter, selectedVerses);
    const text = selectedVerses.map((verse) => `${verse.verse}. ${verse.text}`).join("\n");
    setEditorPayload({ reference: ref, text });
  }, [book, chapter, selectedVerses]);

  const openSingleVerseEditor = useCallback(
    (verse: BibleVerse) => {
      const ref = verseReference(book, chapter, [verse]);
      setEditorPayload({ reference: ref, text: verse.text });
    },
    [book, chapter]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar
        barStyle={darkMode ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />

      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn} hitSlop={10}>
          <ChevronLeft size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text, fontSize: size(20), fontFamily }]}>
          {book} {chapter}
        </Text>
        <ShareIconButton
          color={colors.tint}
          borderColor={colors.border}
          backgroundColor={colors.card}
          onPress={() => setShareOpen(true)}
          size={38}
          iconSize={18}
        />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {verses.map((v) => {
            const isSelected = selected.has(v.verse);
            return (
              <Pressable
                key={v.verse}
                onPress={() => toggleVerse(v.verse)}
                onLongPress={() => openSingleVerseEditor(v)}
                style={[
                  styles.verseRow,
                  isSelected && { backgroundColor: `${colors.tint}1A` },
                ]}
              >
                <Text style={styles.verseLine}>
                  <Text style={[styles.verseNum, { color: colors.tint, fontFamily, fontSize: size(13) }]}>
                    {v.verse}{" "}
                  </Text>
                  <Text style={{ color: colors.text, fontFamily, fontSize: size(18), lineHeight: size(30) }}>
                    {v.text}
                  </Text>
                </Text>
              </Pressable>
            );
          })}

          <View style={styles.navRow}>
            <Pressable
              disabled={!canPrev}
              onPress={goPrev}
              style={[styles.navBtn, { borderColor: colors.border, opacity: canPrev ? 1 : 0.4 }]}
            >
              <ChevronLeft size={18} color={colors.text} />
              <Text style={[styles.navText, { color: colors.text, fontFamily }]}>Previous</Text>
            </Pressable>
            <Pressable
              disabled={!canNext}
              onPress={goNext}
              style={[styles.navBtn, { borderColor: colors.border, opacity: canNext ? 1 : 0.4 }]}
            >
              <Text style={[styles.navText, { color: colors.text, fontFamily }]}>Next</Text>
              <ChevronRight size={18} color={colors.text} />
            </Pressable>
          </View>
        </ScrollView>
      )}

      {selectedVerses.length > 0 && (
        <View
          style={[
            styles.selectionBar,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Pressable
            onPress={() => setSelected(new Set())}
            hitSlop={8}
            style={styles.selClear}
          >
            <X size={18} color={colors.mutedText} />
          </Pressable>
          <Text
            style={[styles.selCount, { color: colors.text, fontFamily, fontSize: size(14) }]}
          >
            {selectedVerses.length} selected
          </Text>
          <View style={styles.selActions}>
            <Pressable
              onPress={openSelectionEditor}
              style={[styles.selBtn, styles.selBtnPrimary, { backgroundColor: colors.tint }]}
            >
              <Share2 size={16} color={darkMode ? "#0B1220" : "#fff"} />
              <Text
                style={[
                  styles.selBtnText,
                  { color: darkMode ? "#0B1220" : "#fff", fontFamily },
                ]}
              >
                Select text
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      <ShareSheet
        visible={shareOpen}
        onClose={() => setShareOpen(false)}
        title={`${book} ${chapter}`}
        subtitle="Whole chapter"
        options={[
          {
            key: "exact",
            label: "Choose exact text",
            hint: "Select part of a verse or edit an excerpt",
            icon: Copy,
            onPress: () => {
              const text = verses.map((verse) => `${verse.verse}. ${verse.text}`).join("\n");
              setEditorPayload({ reference: `${book} ${chapter}`, text });
            },
          },
          {
            key: "share",
            label: "Share chapter",
            hint: "Send all verses",
            icon: Share2,
            onPress: shareChapter,
          },
          {
            key: "copy",
            label: "Copy chapter",
            hint: "Paste anywhere",
            icon: Copy,
            onPress: () => void copyChapter(),
          },
        ]}
      />

      <ScriptureShareEditor
        visible={editorPayload !== null}
        onClose={() => setEditorPayload(null)}
        reference={editorPayload?.reference ?? `${book} ${chapter}`}
        text={editorPayload?.text ?? ""}
        onCopied={() => setToast("Selected text copied")}
      />

      <Toast message={toast} onHide={() => setToast(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: Platform.OS === "ios" ? 56 : 40,
    paddingHorizontal: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontWeight: "800", flex: 1, textAlign: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 24, paddingBottom: 140 },
  verseRow: {
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 4,
    marginHorizontal: -6,
  },
  verseLine: { marginBottom: 8 },
  verseNum: { fontWeight: "800" },
  navRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 24 },
  navBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  navText: { fontWeight: "700", marginHorizontal: 6 },
  selectionBar: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 24,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  selClear: { padding: 2 },
  selCount: { fontWeight: "700", flex: 1 },
  selActions: { flexDirection: "row", gap: 8 },
  selBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  selBtnPrimary: { borderWidth: 0 },
  selBtnText: { fontWeight: "700" },
});
