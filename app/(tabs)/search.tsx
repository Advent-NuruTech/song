import { Link } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SectionList,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { ShareIconButton } from "@/components/share-icon-button";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useQuickFooter } from "@/src/context/QuickFooterContext";
import { runQuery } from "@/src/db/runQuery";
import {
  formatLanguageName,
  getLanguageMap,
} from "@/src/services/languageService";
import {
  type BibleSearchHit,
  getSelectedVersionId,
  listBibleVersions,
  searchBible,
} from "@/src/services/bibleService";
import { shareSongLink, shareStudyLink } from "@/src/services/shareService";
import { SearchResult, searchStudies } from "@/src/services/studiesService";

type SongRow = {
  id: string;
  hymnNumber: number;
  title: string;
  language: string;
  stanzas: string;
  chorus: string | null;
};

type SearchItem =
  | { type: "song"; song: SongRow }
  | { type: "study"; study: SearchResult }
  | { type: "bible"; hit: BibleSearchHit };

function safeLines(value: string) {
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.flat().map(String);
    return [String(parsed)];
  } catch {
    return [String(value)];
  }
}

function escapeRegExp(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlight(text: string, query: string, highlightStyle: object) {
  if (!query) return <Text>{text}</Text>;

  const safeQuery = escapeRegExp(query);
  const regex = new RegExp(`(${safeQuery})`, "gi");
  const parts = text.split(regex);

  return (
    <Text>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <Text key={i} style={highlightStyle}>
            {part}
          </Text>
        ) : (
          <Text key={i}>{part}</Text>
        )
      )}
    </Text>
  );
}

function stripTags(input: string) {
  return input.replace(/<\/?b>/g, "");
}

export default function SearchScreen() {
  const { colors, size, fontFamily, darkMode } = useAppTheme();
  const { reportScroll } = useQuickFooter();
  const [query, setQuery] = useState("");
  const [songResults, setSongResults] = useState<SongRow[]>([]);
  const [songLoading, setSongLoading] = useState(false);
  const [studyResults, setStudyResults] = useState<SearchResult[]>([]);
  const [studyLoading, setStudyLoading] = useState(false);
  const [bibleResults, setBibleResults] = useState<BibleSearchHit[]>([]);
  const [bibleVersionId, setBibleVersionId] = useState<string | null>(null);
  const [languageMap, setLanguageMap] = useState<
    Record<string, { code: string; name: string }>
  >({});

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        const map = await getLanguageMap();
        if (mounted) setLanguageMap(map);

        // Resolve which Bible version to search (selected, else any installed).
        const versions = await listBibleVersions();
        const installed = versions.filter((v) => v.installed);
        const savedId = await getSelectedVersionId();
        const chosen =
          installed.find((v) => v.id === savedId) ?? installed[0] ?? null;
        if (mounted) setBibleVersionId(chosen?.id ?? null);
      } catch (e) {
        console.error("Search load failed", e);
      }
    }

    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const trimmed = query.trim();

    if (!trimmed) {
      setSongResults([]);
      setStudyResults([]);
      setBibleResults([]);
      setSongLoading(false);
      setStudyLoading(false);
      return () => {
        mounted = false;
      };
    }

    setSongLoading(true);
    setStudyLoading(true);
    const timer = setTimeout(async () => {
      try {
        const tokens = trimmed
          .replace(/"/g, " ")
          .split(/\s+/)
          .map((token) => token.trim())
          .filter(Boolean)
          .map((token) => `${token}*`)
          .join(" ");

        let songMatches: SongRow[] = [];

        if (tokens.length > 0) {
          try {
            const songResult = await runQuery(
              `
                SELECT id, hymnNumber, title, language, stanzas, chorus
                FROM songs
                WHERE rowid IN (
                  SELECT rowid
                  FROM songs_fts
                  WHERE songs_fts MATCH ?
                  LIMIT 100
                )
                ORDER BY hymnNumber ASC
                LIMIT 100
              `,
              [tokens]
            );
            songMatches = songResult.rows._array as SongRow[];
          } catch {
            const likeQuery = `%${trimmed}%`;
            const fallback = await runQuery(
              `
                SELECT id, hymnNumber, title, language, stanzas, chorus
                FROM songs
                WHERE title LIKE ?
                   OR CAST(hymnNumber AS TEXT) LIKE ?
                ORDER BY hymnNumber ASC
                LIMIT 100
              `,
              [likeQuery, likeQuery]
            );
            songMatches = fallback.rows._array as SongRow[];
          }
        }

        const matches = await searchStudies(trimmed);
        const bibleMatches = bibleVersionId
          ? await searchBible(trimmed, bibleVersionId, 40)
          : [];
        if (mounted) {
          setSongResults(songMatches);
          setStudyResults(matches);
          setBibleResults(bibleMatches);
        }
      } catch (error) {
        console.error("Search failed", error);
        if (mounted) {
          setSongResults([]);
          setStudyResults([]);
          setBibleResults([]);
        }
      } finally {
        if (mounted) {
          setSongLoading(false);
          setStudyLoading(false);
        }
      }
    }, 250);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [query, bibleVersionId]);

  const hasQuery = query.trim().length > 0;
  const hasResults =
    songResults.length + studyResults.length + bibleResults.length > 0;

  const sections = useMemo(
    () => {
      if (!hasQuery) return [];
      const data: { title: string; data: SearchItem[] }[] = [];

      if (songResults.length > 0) {
        data.push({
          title: `Songs (${songResults.length})`,
          data: songResults.map((song) => ({ type: "song", song })),
        });
      }

      if (bibleResults.length > 0) {
        data.push({
          title: `Bible (${bibleResults.length})`,
          data: bibleResults.map((hit) => ({ type: "bible", hit })),
        });
      }

      if (studyResults.length > 0) {
        data.push({
          title: `Studies (${studyResults.length})`,
          data: studyResults.map((study) => ({ type: "study", study })),
        });
      }

      return data;
    },
    [hasQuery, songResults, studyResults, bibleResults]
  );

  const highlightStyle = {
    backgroundColor: colors.highlight,
    fontWeight: "700",
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>      <StatusBar
        barStyle={darkMode ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search songs and studies..."
        placeholderTextColor={colors.subtleText}
        style={[
          styles.input,
          {
            borderColor: colors.border,
            backgroundColor: colors.inputBackground,
            color: colors.text,
            fontSize: size(16),
            fontFamily,
          },
        ]}
      />

      <SectionList
        sections={sections}
        onScroll={(event) => reportScroll(event.nativeEvent.contentOffset.y)}
        scrollEventThrottle={16}
        keyExtractor={(item, index) =>
          item.type === "song"
            ? `${item.song.id}-${index}`
            : item.type === "bible"
            ? `${item.hit.versionId}-${item.hit.book}-${item.hit.chapter}-${item.hit.verse}-${index}`
            : `${item.study.id}-${index}`
        }
        keyboardShouldPersistTaps="handled"
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.resultsContainer}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text
              style={[
                styles.sectionTitle,
                { color: colors.text, fontSize: size(15), fontFamily },
              ]}
            >
              {section.title}
            </Text>
          </View>
        )}
        renderItem={({ item }) => {
          if (item.type === "song") {
            const song = item.song;
            const lyricsPreview = safeLines(song.stanzas)
              .join(" ")
              .slice(0, 140);
            const meta = languageMap[song.language];
            const name = meta?.name ?? formatLanguageName(song.language);

            return (
              <View style={styles.cardContainer}>
                <Link
                  href={{
                    pathname: "/song/[id]",
                    params: { id: song.id },
                  }}
                  asChild
                >
                  <Pressable
                    style={[
                      styles.card,
                      {
                        borderColor: colors.border,
                        backgroundColor: colors.card,
                        shadowColor: colors.text,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.title,
                        { color: colors.text, fontSize: size(18), fontFamily },
                      ]}
                    >
                      {highlight(song.title, query, highlightStyle)}
                    </Text>

                    <Text
                      style={[
                        styles.meta,
                        {
                          color: colors.mutedText,
                          fontSize: size(14),
                          fontFamily,
                        },
                      ]}
                    >
                      #{highlight(song.hymnNumber.toString(), query, highlightStyle)} -{" "}
                      {name}
                    </Text>

                    <Text
                      style={[
                        styles.lyrics,
                        { color: colors.text, fontSize: size(15), fontFamily },
                      ]}
                    >
                      {highlight(lyricsPreview, query, highlightStyle)}
                    </Text>
                  </Pressable>
                </Link>

                <ShareIconButton
                  color={colors.tint}
                  borderColor={colors.border}
                  backgroundColor={colors.card}
                  onPress={() =>
                    void shareSongLink({
                      title: song.title,
                      hymnNumber: song.hymnNumber,
                      language: name,
                    })
                  }
                  style={styles.shareButton}
                />
              </View>
            );
          }

          if (item.type === "bible") {
            const hit = item.hit;
            const reference = `${hit.book} ${hit.chapter}:${hit.verse}`;
            return (
              <View style={styles.cardContainer}>
                <Link
                  href={{
                    pathname: "/bible/read",
                    params: {
                      version: hit.versionId,
                      book: hit.book,
                      chapter: String(hit.chapter),
                    },
                  }}
                  asChild
                >
                  <Pressable
                    style={[
                      styles.card,
                      {
                        borderColor: colors.border,
                        backgroundColor: colors.card,
                        shadowColor: colors.text,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.studyTitle,
                        { color: colors.tint, fontSize: size(15), fontFamily },
                      ]}
                    >
                      {reference}
                    </Text>
                    <Text
                      style={[
                        styles.studyExcerpt,
                        { color: colors.text, fontSize: size(15), fontFamily },
                      ]}
                    >
                      {highlight(hit.text.slice(0, 180), query, highlightStyle)}
                    </Text>
                  </Pressable>
                </Link>
              </View>
            );
          }

          const study = item.study;
          const excerpt = stripTags(study.excerpt ?? "").slice(0, 160);

          return (
            <View style={styles.cardContainer}>
              <Link
                href={{
                  pathname: "/studies/[id]",
                  params: { id: study.id },
                }}
                asChild
              >
                <Pressable
                  style={[
                    styles.card,
                    {
                      borderColor: colors.border,
                      backgroundColor: colors.card,
                      shadowColor: colors.text,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.studyTitle,
                      { color: colors.text, fontSize: size(17), fontFamily },
                    ]}
                  >
                    {highlight(study.title, query, highlightStyle)}
                  </Text>
                  <Text
                    style={[
                      styles.studyMeta,
                      { color: colors.mutedText, fontSize: size(13), fontFamily },
                    ]}
                  >
                    {study.category} {study.author ? `- ${study.author}` : ""}
                  </Text>
                  {!!excerpt && (
                    <Text
                      style={[
                        styles.studyExcerpt,
                        { color: colors.text, fontSize: size(14), fontFamily },
                      ]}
                    >
                      {highlight(excerpt, query, highlightStyle)}
                    </Text>
                  )}
                </Pressable>
              </Link>

              <ShareIconButton
                color={colors.tint}
                borderColor={colors.border}
                backgroundColor={colors.card}
                onPress={() =>
                  void shareStudyLink({
                    id: study.id,
                    title: study.title,
                    category: study.category,
                    author: study.author,
                    content: study.excerpt,
                  })
                }
                style={styles.shareButton}
              />
            </View>
          );
        }}
        ListHeaderComponent={
          (studyLoading || songLoading) && hasQuery ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={colors.tint} />
              <Text
                style={[
                  styles.loadingText,
                  { color: colors.mutedText, fontSize: size(13), fontFamily },
                ]}
              >
                Searching songs and studies...
              </Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          !hasQuery ? (
            <View style={styles.emptyState}>
              <Text
                style={[
                  styles.emptyTitle,
                  { color: colors.text, fontSize: size(18), fontFamily },
                ]}
              >
                Search songs and studies
              </Text>
              <Text
                style={[
                  styles.emptySubtitle,
                  { color: colors.mutedText, fontSize: size(14), fontFamily },
                ]}
              >
                Type a title, number, lyric, or study topic to begin.
              </Text>
            </View>
          ) : !hasResults && !studyLoading && !songLoading ? (
            <View style={styles.emptyState}>
              <Text
                style={[
                  styles.emptyTitle,
                  { color: colors.text, fontSize: size(18), fontFamily },
                ]}
              >
                No results found
              </Text>
              <Text
                style={[
                  styles.emptySubtitle,
                  { color: colors.mutedText, fontSize: size(14), fontFamily },
                ]}
              >
                Try a different keyword or shorter phrase.
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 26,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginTop: 38,
    marginBottom: 16,
  },
  resultsContainer: {
    paddingBottom: 40,
  },
  sectionHeader: {
    paddingTop: 10,
    paddingBottom: 6,
  },
  sectionTitle: {
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
  },
  cardContainer: {
    marginBottom: 12,
    position: "relative",
  },
  shareButton: {
    position: "absolute",
    top: 10,
    right: 10,
  },
  title: {
    fontWeight: "700",
  },
  meta: {
    marginTop: 4,
  },
  lyrics: {
    marginTop: 8,
  },
  studyTitle: {
    fontWeight: "700",
  },
  studyMeta: {
    marginTop: 6,
    fontWeight: "600",
  },
  studyExcerpt: {
    marginTop: 8,
    lineHeight: 20,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  loadingText: {
    fontWeight: "600",
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: "center",
    gap: 8,
  },
  emptyTitle: {
    fontWeight: "700",
    textAlign: "center",
  },
  emptySubtitle: {
    textAlign: "center",
    lineHeight: 20,
  },
});
