import { Link } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAppTheme } from "@/hooks/use-app-theme";
import { runQuery } from "@/src/db/runQuery";
import {
  formatLanguageName,
  getLanguageMap,
} from "@/src/services/languageService";
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
  | { type: "study"; study: SearchResult };

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
  const { colors, size, fontFamily } = useAppTheme();
  const [query, setQuery] = useState("");
  const [songs, setSongs] = useState<SongRow[]>([]);
  const [studyResults, setStudyResults] = useState<SearchResult[]>([]);
  const [studyLoading, setStudyLoading] = useState(false);
  const [languageMap, setLanguageMap] = useState<
    Record<string, { code: string; name: string }>
  >({});

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        const [songResult, map] = await Promise.all([
          runQuery(
            `
              SELECT id, hymnNumber, title, language, stanzas, chorus
              FROM songs
              ORDER BY hymnNumber ASC
            `
          ),
          getLanguageMap(),
        ]);

        if (mounted) {
          setSongs(songResult.rows._array as SongRow[]);
          setLanguageMap(map);
        }
      } catch (e) {
        console.error("Search load failed", e);
      }
    }

    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    return songs.filter((song) => {
      const stanzasText = safeLines(song.stanzas).join(" ").toLowerCase();
      const chorusText = song.chorus
        ? safeLines(song.chorus).join(" ").toLowerCase()
        : "";

      return (
        song.title.toLowerCase().includes(q) ||
        song.hymnNumber.toString().includes(q) ||
        stanzasText.includes(q) ||
        chorusText.includes(q)
      );
    });
  }, [query, songs]);

  useEffect(() => {
    let mounted = true;
    const trimmed = query.trim();

    if (!trimmed) {
      setStudyResults([]);
      setStudyLoading(false);
      return () => {
        mounted = false;
      };
    }

    setStudyLoading(true);
    const timer = setTimeout(async () => {
      try {
        const matches = await searchStudies(trimmed);
        if (mounted) {
          setStudyResults(matches);
        }
      } catch (error) {
        console.error("Study search failed", error);
        if (mounted) {
          setStudyResults([]);
        }
      } finally {
        if (mounted) {
          setStudyLoading(false);
        }
      }
    }, 250);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [query]);

  const hasQuery = query.trim().length > 0;
  const hasResults = results.length + studyResults.length > 0;

  const sections = useMemo(
    () => {
      if (!hasQuery) return [];
      const data: Array<{ title: string; data: SearchItem[] }> = [];

      if (results.length > 0) {
        data.push({
          title: `Songs (${results.length})`,
          data: results.map((song) => ({ type: "song", song })),
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
    [hasQuery, results, studyResults]
  );

  const highlightStyle = {
    backgroundColor: colors.highlight,
    fontWeight: "700",
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TextInput
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
        keyExtractor={(item, index) =>
          item.type === "song"
            ? `${item.song.id}-${index}`
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
            );
          }

          const study = item.study;
          const excerpt = stripTags(study.excerpt ?? "").slice(0, 160);

          return (
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
          );
        }}
        ListHeaderComponent={
          studyLoading && hasQuery ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={colors.tint} />
              <Text
                style={[
                  styles.loadingText,
                  { color: colors.mutedText, fontSize: size(13), fontFamily },
                ]}
              >
                Searching studies...
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
          ) : !hasResults && !studyLoading ? (
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
    marginBottom: 12,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
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
