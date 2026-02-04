import { Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Platform, ScrollView, StatusBar, StyleSheet, Text, View } from "react-native";
import PagerView from "react-native-pager-view";

import { useAppTheme } from "@/hooks/use-app-theme";
import { runQuery } from "@/src/db/runQuery";
import { getLanguageColor } from "@/src/services/languageService";

type SongRow = {
  id: string;
  hymnNumber: number;
  title: string;
  language: string;
  author?: string | null;
  stanzas: string;
  chorus: string | null;
};

function safeStanzas(value: string): string[][] {
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed as string[][];
    return [[String(parsed)]];
  } catch {
    return [[String(value)]];
  }
}

function safeChorus(value: string | null): string[] | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed as string[];
    return [String(parsed)];
  } catch {
    return [String(value)];
  }
}

export default function SongDetailsScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { colors, size, fontFamily, darkMode } = useAppTheme();

  const [songs, setSongs] = useState<SongRow[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentSong, setCurrentSong] = useState<SongRow | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadSongSet = async () => {
      try {
        const single = await runQuery(
          "SELECT id, language FROM songs WHERE id = ? LIMIT 1",
          [id]
        );

        if (single.rows.length === 0) return;

        const language = single.rows.item(0).language;
        const result = await runQuery(
          `
            SELECT id, hymnNumber, title, language, author, stanzas, chorus
            FROM songs
            WHERE language = ?
            ORDER BY hymnNumber ASC
          `,
          [language]
        );

        const list = result.rows._array as SongRow[];
        const index = list.findIndex((s) => s.id === id);

        if (isMounted) {
          setSongs(list);
          setCurrentIndex(index >= 0 ? index : 0);
          setCurrentSong(list[index >= 0 ? index : 0] || null);
        }
      } catch (e) {
        console.error("Failed to load song:", e);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadSongSet();
    return () => {
      isMounted = false;
    };
  }, [id]);

  const handlePageSelected = (event: { nativeEvent: { position: number } }) => {
    const newIndex = event.nativeEvent.position;
    setCurrentIndex(newIndex);
    setCurrentSong(songs[newIndex] || null);
  };

  const languageColor = currentSong ? getLanguageColor(currentSong.language) : colors.tint;
  const primaryColor = currentSong ? languageColor : colors.tint;

  if (loading || songs.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <View style={[styles.loadingCard, { backgroundColor: colors.card }]}>
            <View style={[styles.loadingNumber, { backgroundColor: `${primaryColor}20` }]}>
              <Text style={[styles.loadingNumberText, { color: primaryColor }]}>#</Text>
            </View>
            <View style={styles.loadingContent}>
              <View style={[styles.loadingTitle, { backgroundColor: colors.border }]} />
              <View style={[styles.loadingLine, { backgroundColor: colors.border }]} />
              <View style={[styles.loadingLineShort, { backgroundColor: colors.border }]} />
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar
        barStyle={darkMode ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />

      {/* Song Header */}
      <View style={[styles.headerContainer, { backgroundColor: colors.card }]}>
        <View style={styles.headerContent}>
          {/* Song Number Badge */}
          <View
            style={[
              styles.headerNumberBadge,
              {
                backgroundColor: `${primaryColor}15`,
                borderColor: primaryColor,
              }
            ]}
          >
            <Text
              style={[
                styles.headerNumberText,
                {
                  color: primaryColor,
                  fontSize: size(20),
                  fontFamily,
                }
              ]}
            >
              {currentSong?.hymnNumber}
            </Text>
          </View>

          <View style={styles.headerTextContainer}>
            <Text
              style={[
                styles.headerTitle,
                {
                  color: colors.text,
                  fontSize: size(20),
                  fontFamily,
                }
              ]}
              numberOfLines={2}
            >
              {currentSong?.title}
            </Text>
            {!!currentSong?.author?.trim() && (
              <Text
                style={[
                  styles.headerAuthor,
                  {
                    color: colors.mutedText,
                    fontSize: size(14),
                    fontFamily,
                  }
                ]}
                numberOfLines={1}
              >
                By {currentSong.author}
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Song Content */}
      <PagerView
        style={[styles.pager, { backgroundColor: colors.background }]}
        initialPage={currentIndex}
        onPageSelected={handlePageSelected}
      >
        {songs.map((item) => {
          const stanzas = safeStanzas(item.stanzas);
          const chorus = safeChorus(item.chorus);
          const itemLanguageColor = getLanguageColor(item.language) || colors.tint;

          return (
            <View
              key={item.id}
              style={[styles.page, { backgroundColor: colors.background }]}
            >
              <ScrollView 
                style={styles.lyrics} 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.lyricsContent}
              >
                {stanzas.map((stanza, stanzaIndex) => (
                  <View key={stanzaIndex} style={styles.stanzaContainer}>
                    <View style={styles.stanzaRow}>
                      {/* Stanza Number - Reduced size */}
                      <View style={[
                        styles.stanzaNumberContainer,
                        {
                          backgroundColor: `${itemLanguageColor}15`,
                        }
                      ]}>
                        <Text
                          style={[
                            styles.stanzaNumber,
                            {
                              color: itemLanguageColor,
                              fontSize: size(14),
                              fontFamily,
                            }
                          ]}
                        >
                          {stanzaIndex + 1}
                        </Text>
                      </View>

                      {/* Stanza Content - Side by side */}
                      <View style={styles.stanzaContent}>
                        {stanza.map((line, lineIndex) => (
                          <View key={lineIndex} style={styles.lineContainer}>
                            {line.trim() && (
                              <Text
                                style={[
                                  styles.line,
                                  {
                                    color: colors.text,
                                    fontSize: size(18),
                                    fontFamily,
                                    lineHeight: size(28),
                                  }
                                ]}
                              >
                                {line}
                              </Text>
                            )}
                          </View>
                        ))}

                        {/* Chorus after first stanza */}
                        {stanzaIndex === 0 && chorus && (
                          <View
                            style={[
                              styles.chorusContainer,
                              {
                                backgroundColor: `${itemLanguageColor}08`,
                                borderColor: `${itemLanguageColor}30`,
                              }
                            ]}
                          >
                            <View style={styles.chorusHeader}>
                              <Text
                                style={[
                                  styles.chorusLabel,
                                  {
                                    color: itemLanguageColor,
                                    fontSize: size(15),
                                    fontFamily,
                                    fontWeight: "700",
                                  }
                                ]}
                              >
                                Chorus
                              </Text>
                            </View>
                            
                            {chorus.map((line, i) => (
                              <Text
                                key={i}
                                style={[
                                  styles.chorusLine,
                                  {
                                    color: colors.text,
                                    fontSize: size(18),
                                    fontFamily,
                                    lineHeight: size(28),
                                  }
                                ]}
                              >
                                {line}
                              </Text>
                            ))}
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
          );
        })}
      </PagerView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  loadingCard: {
    width: "100%",
    maxWidth: 400,
    padding: 24,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  loadingNumber: {
    width: 60,
    height: 60,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  loadingNumberText: {
    fontSize: 24,
    fontWeight: "800",
  },
  loadingContent: {
    flex: 1,
  },
  loadingTitle: {
    height: 20,
    width: "70%",
    borderRadius: 8,
    marginBottom: 12,
  },
  loadingLine: {
    height: 16,
    width: "100%",
    borderRadius: 8,
    marginBottom: 8,
  },
  loadingLineShort: {
    height: 16,
    width: "60%",
    borderRadius: 8,
  },
  headerContainer: {
    paddingTop: Platform.OS === "ios" ? 90 : 80,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerNumberBadge: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    marginRight: 16,
  },
  headerNumberText: {
    fontWeight: "800",
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontWeight: "700",
    marginBottom: 4,
  },
  headerAuthor: {
    fontWeight: "500",
  },
  pager: {
    flex: 1,
  },
  page: {
    flex: 1,
  },
  lyrics: {
    flex: 1,
  },
  lyricsContent: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    paddingBottom: 60,
  },
  stanzaContainer: {
    marginBottom: 24,
  },
  stanzaRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  stanzaNumberContainer: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    marginTop: 2,
  },
  stanzaNumber: {
    fontWeight: "700",
  },
  stanzaContent: {
    flex: 1,
  },
  lineContainer: {
    marginBottom: 8,
  },
  line: {
    fontWeight: "500",
  },
  chorusContainer: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  chorusHeader: {
    marginBottom: 12,
  },
  chorusLabel: {
    fontWeight: "700",
  },
  chorusLine: {
    fontWeight: "500",
    fontStyle: "italic",
    marginBottom: 8,
  },
});
