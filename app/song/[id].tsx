import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  ActivityIndicator,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { ChevronLeft, ChevronRight, Copy, Share2 } from "lucide-react-native";

import { ShareIconButton } from "@/components/share-icon-button";
import { ShareSheet } from "@/components/share-sheet";
import { Toast } from "@/components/toast";

import { useAppTheme } from "@/hooks/use-app-theme";

import { useQuickFooter } from "@/src/context/QuickFooterContext";

import { runQuery } from "@/src/db/runQuery";

import {
  getLanguageColor,
} from "@/src/services/languageService";

import {
  type ShareableSong,
  copySong,
  shareSong,
  shareChorus,
  shareStanza,
} from "@/src/services/shareService";

type ParsedSong = {
  id: string;
  hymnNumber: number;
  title: string;
  language: string;
  author?: string | null;

  parsedStanzas: string[][];
  parsedChorus: string[];
};

function parseStanzas(
  value: string
): string[][] {
  try {
    const parsed = JSON.parse(value);

    if (Array.isArray(parsed)) {
      return parsed;
    }

    return [[String(parsed)]];
  } catch {
    return [[String(value)]];
  }
}

function parseChorus(
  value?: string | null
): string[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);

    if (Array.isArray(parsed)) {
      return parsed
        .flat()
        .map(String)
        .map((line) => line.trim())
        .filter(Boolean);
    }

    const text = String(parsed).trim();

    return text ? [text] : [];
  } catch {
    const text = String(value).trim();

    return text ? [text] : [];
  }
}

const SongContent = memo(
  ({
    song,
    colors,
    size,
    fontFamily,
    darkMode,
    primaryColor,
    onScroll,
  }: any) => {
    return (
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={
          styles.scrollContent
        }
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
        scrollEventThrottle={16}
        onScroll={onScroll}
      >
        {song.parsedStanzas.map(
          (
            stanza: string[],
            stanzaIndex: number
          ) => (
            <View
              key={stanzaIndex}
              style={styles.stanzaContainer}
            >
              <View
                style={[
                  styles.stanzaNumberContainer,
                  {
                    backgroundColor: `${primaryColor}12`,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.stanzaNumber,
                    {
                      color: primaryColor,
                      fontSize: size(17),
                      fontFamily,
                    },
                  ]}
                >
                  {stanzaIndex + 1}
                </Text>
              </View>

              <View
                style={styles.stanzaContent}
              >
                {stanza.map(
                  (
                    line: string,
                    lineIndex: number
                  ) => (
                    <Text
                      key={lineIndex}
                      style={[
                        styles.line,
                        {
                          color: colors.text,
                          fontSize: size(22),
                          lineHeight: size(36),
                          fontFamily,
                        },
                      ]}
                    >
                      {line}
                    </Text>
                  )
                )}
              </View>

              {!!song.parsedChorus
                .length && (
                <View
                  style={[
                    styles.chorusContainer,
                    {
                      backgroundColor:
                        darkMode
                          ? "rgba(255,255,255,0.05)"
                          : "rgba(0,0,0,0.04)",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chorusLabel,
                      {
                        color: primaryColor,
                        fontSize: size(13),
                        fontFamily,
                      },
                    ]}
                  >
                    Chorus
                  </Text>

                  {song.parsedChorus.map(
                    (
                      line: string,
                      index: number
                    ) => (
                      <Text
                        key={index}
                        style={[
                          styles.chorusLine,
                          {
                            color:
                              colors.text,
                            fontSize:
                              size(20),
                            lineHeight:
                              size(33),
                            fontFamily,
                          },
                        ]}
                      >
                        {line}
                      </Text>
                    )
                  )}
                </View>
              )}
            </View>
          )
        )}
      </ScrollView>
    );
  }
);

SongContent.displayName =
  "SongContent";

export default function SongScreen() {
  const router = useRouter();

  const { id } =
    useLocalSearchParams<{
      id?: string;
    }>();

  const {
    colors,
    size,
    fontFamily,
    darkMode,
  } = useAppTheme();

  const { reportScroll } =
    useQuickFooter();

  const mountedRef = useRef(true);

  const [loading, setLoading] =
    useState(true);

  const [song, setSong] =
    useState<ParsedSong | null>(null);

  const [prevSongId, setPrevSongId] =
    useState<string | null>(null);

  const [nextSongId, setNextSongId] =
    useState<string | null>(null);

  const [shareOpen, setShareOpen] =
    useState(false);

  const [toast, setToast] =
    useState<string | null>(null);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadSong = useCallback(
    async (songId: string) => {
      try {
        setLoading(true);

        const result = await runQuery(
          `
        SELECT
          id,
          hymnNumber,
          title,
          language,
          author,
          stanzas,
          chorus
        FROM songs
        WHERE id = ?
        LIMIT 1
        `,
          [songId]
        );

        if (
          !mountedRef.current
        )
          return;

        if (
          result.rows.length === 0
        ) {
          setSong(null);
          return;
        }

        const raw =
          result.rows.item(0);

        const parsedSong: ParsedSong =
          {
            id: String(raw.id),
            hymnNumber:
              raw.hymnNumber,
            title: raw.title,
            language:
              raw.language,
            author: raw.author,

            parsedStanzas:
              parseStanzas(
                raw.stanzas
              ),

            parsedChorus:
              parseChorus(
                raw.chorus
              ),
          };

        setSong(parsedSong);

        const [prevResult, nextResult] = await Promise.all([
          runQuery(
            `
              SELECT id
              FROM songs
              WHERE language = ?
                AND hymnNumber < ?
              ORDER BY hymnNumber DESC
              LIMIT 1
            `,
            [raw.language, raw.hymnNumber]
          ),
          runQuery(
            `
              SELECT id
              FROM songs
              WHERE language = ?
                AND hymnNumber > ?
              ORDER BY hymnNumber ASC
              LIMIT 1
            `,
            [raw.language, raw.hymnNumber]
          ),
        ]);

        if (!mountedRef.current) return;

        setPrevSongId(prevResult.rows.length ? String(prevResult.rows.item(0).id) : null);
        setNextSongId(nextResult.rows.length ? String(nextResult.rows.item(0).id) : null);
      } catch (error) {
        console.error(error);
      } finally {
        if (
          mountedRef.current
        ) {
          setLoading(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    if (!id) return;

    loadSong(String(id));
  }, [id, loadSong]);

  const primaryColor =
    useMemo(() => {
      return song
        ? getLanguageColor(
            song.language
          )
        : colors.tint;
    }, [song, colors.tint]);

  const handleScroll =
    useCallback(
      (
        event: NativeSyntheticEvent<NativeScrollEvent>
      ) => {
        reportScroll(
          event.nativeEvent
            .contentOffset.y
        );
      },
      [reportScroll]
    );

  const shareableSong =
    useMemo<ShareableSong | null>(() => {
      if (!song) return null;
      return {
        id: song.id,
        title: song.title,
        hymnNumber: song.hymnNumber,
        language: song.language,
        author: song.author,
        stanzas: song.parsedStanzas,
        chorus: song.parsedChorus,
      };
    }, [song]);

  const handleShareSong =
    useCallback(() => {
      if (shareableSong) void shareSong(shareableSong);
    }, [shareableSong]);

  const handleCopySong =
    useCallback(async () => {
      if (!shareableSong) return;
      const ok = await copySong(shareableSong);
      setToast(ok ? "Hymn copied" : "Couldn't copy");
    }, [shareableSong]);

  const navigateSong =
    useCallback(
      (targetId: string | null) => {
        if (!targetId) return;

        router.replace({
          pathname:
            "/song/[id]",
          params: {
            id: targetId,
          },
        });
      },
      [router]
    );

  if (loading) {
    return (
      <View
        style={[
          styles.centered,
          {
            backgroundColor:
              colors.background,
          },
        ]}
      >
        <StatusBar
          barStyle={
            darkMode
              ? "light-content"
              : "dark-content"
          }
          backgroundColor={
            colors.background
          }
        />

        <ActivityIndicator
          size="large"
          color={colors.tint}
        />

        <Text
          style={[
            styles.loadingText,
            {
              color: colors.text,
              fontSize: size(16),
              fontFamily,
            },
          ]}
        >
          Loading hymn...
        </Text>
      </View>
    );
  }

  if (!song) {
    return (
      <View
        style={[
          styles.centered,
          {
            backgroundColor:
              colors.background,
          },
        ]}
      >
        <Text
          style={{
            color: colors.text,
            fontSize: size(16),
            fontFamily,
          }}
        >
          Song not found
        </Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      <StatusBar
        barStyle={
          darkMode
            ? "light-content"
            : "dark-content"
        }
        backgroundColor={
          colors.background
        }
      />

      <View
        style={[
          styles.container,
          {
            backgroundColor:
              colors.background,
          },
        ]}
      >
        {/* HEADER */}

        <View
          style={[
            styles.header,
            {
              backgroundColor:
                colors.card,

              borderBottomColor:
                colors.border,
            },
          ]}
        >
          <View
            style={
              styles.headerTop
            }
          >
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: `${primaryColor}14`,
                  borderColor:
                    primaryColor,
                },
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  {
                    color:
                      primaryColor,
                    fontSize:
                      size(18),
                    fontFamily,
                  },
                ]}
              >
                {song.hymnNumber}
              </Text>
            </View>

            <View
              style={
                styles.headerInfo
              }
            >
              <Text
                numberOfLines={2}
                style={[
                  styles.title,
                  {
                    color:
                      colors.text,
                    fontSize:
                      size(21),
                    fontFamily,
                  },
                ]}
              >
                {song.title}
              </Text>

              {!!song.author && (
                <Text
                  numberOfLines={
                    1
                  }
                  style={[
                    styles.author,
                    {
                      color:
                        colors.mutedText,
                      fontSize:
                        size(13),
                      fontFamily,
                    },
                  ]}
                >
                  By {song.author}
                </Text>
              )}
            </View>

            <ShareIconButton
              color={primaryColor}
              borderColor={
                colors.border
              }
              backgroundColor={
                colors.card
              }
              onPress={() =>
                setShareOpen(true)
              }
              size={38}
              iconSize={18}
            />
          </View>

          {/* NAVIGATION */}

          <View
            style={
              styles.navigationRow
            }
          >
            <Pressable
              disabled={
                !prevSongId
              }
              onPress={() =>
                navigateSong(
                  prevSongId
                )
              }
              style={[
                styles.navButton,
                {
                  opacity:
                    prevSongId
                      ? 1
                      : 0.4,

                  borderColor:
                    colors.border,
                },
              ]}
            >
              <ChevronLeft
                size={18}
                color={
                  colors.text
                }
              />

              <Text
                style={[
                  styles.navText,
                  {
                    color:
                      colors.text,
                    fontFamily,
                  },
                ]}
              >
                Previous
              </Text>
            </Pressable>

            <Pressable
              disabled={
                !nextSongId
              }
              onPress={() =>
                navigateSong(
                  nextSongId
                )
              }
              style={[
                styles.navButton,
                {
                  opacity:
                    nextSongId
                      ? 1
                      : 0.4,

                  borderColor:
                    colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.navText,
                  {
                    color:
                      colors.text,
                    fontFamily,
                  },
                ]}
              >
                Next
              </Text>

              <ChevronRight
                size={18}
                color={
                  colors.text
                }
              />
            </Pressable>
          </View>
        </View>

        {/* CONTENT */}

        <SongContent
          song={song}
          colors={colors}
          size={size}
          fontFamily={fontFamily}
          darkMode={darkMode}
          primaryColor={
            primaryColor
          }
          onScroll={handleScroll}
        />
      </View>

      <ShareSheet
        visible={shareOpen}
        onClose={() => setShareOpen(false)}
        title={song.title}
        subtitle={`Hymn #${song.hymnNumber}`}
        options={[
          {
            key: "share",
            label: "Share full hymn",
            hint: "All lyrics — great for status",
            icon: Share2,
            onPress: handleShareSong,
          },
          {
            key: "copy",
            label: "Copy full hymn",
            hint: "Paste anywhere",
            icon: Copy,
            onPress: () => void handleCopySong(),
          },
          ...song.parsedStanzas.map((_, i) => ({
            key: `stanza-${i}`,
            label: `Share Stanza ${i + 1}`,
            hint: `${song.parsedStanzas[i].length} lines`,
            icon: Share2,
            onPress: () => {
              if (shareableSong) void shareStanza(shareableSong, i);
            },
          })),
          ...(song.parsedChorus.length > 0
            ? [
                {
                  key: "chorus",
                  label: "Share Chorus",
                  hint: `${song.parsedChorus.length} lines`,
                  icon: Share2,
                  onPress: () => {
                    if (shareableSong) void shareChorus(shareableSong);
                  },
                },
              ]
            : []),
        ]}
      />

      <Toast message={toast} onHide={() => setToast(null)} />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    marginTop: 16,
    fontWeight: "700",
  },

  header: {
    paddingTop:
      Platform.OS === "ios"
        ? 68
        : 52,

    paddingHorizontal: 20,

    paddingBottom: 18,

    borderBottomWidth: 1,
  },

  headerTop: {
    flexDirection: "row",
    alignItems: "center",
  },

  badge: {
    width: 58,
    height: 58,
    borderRadius: 18,

    justifyContent: "center",
    alignItems: "center",

    borderWidth: 1.5,

    marginRight: 14,
  },

  badgeText: {
    fontWeight: "800",
  },

  headerInfo: {
    flex: 1,
    marginRight: 12,
  },

  title: {
    fontWeight: "800",
  },

  author: {
    marginTop: 4,
    fontWeight: "500",
  },

  navigationRow: {
    flexDirection: "row",
    justifyContent:
      "space-between",

    marginTop: 18,
  },

  navButton: {
    flexDirection: "row",
    alignItems: "center",

    borderWidth: 1,

    borderRadius: 14,

    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  navText: {
    fontWeight: "700",
    marginHorizontal: 6,
  },

  scroll: {
    flex: 1,
  },

  scrollContent: {
    paddingTop: 26,
    paddingBottom: 120,
    paddingHorizontal: 24,
  },

  stanzaContainer: {
    marginBottom: 34,
    alignItems: "center",
  },

  stanzaNumberContainer: {
    width: 36,
    height: 36,

    borderRadius: 12,

    justifyContent: "center",
    alignItems: "center",

    marginBottom: 18,
  },

  stanzaNumber: {
    fontWeight: "800",
  },

  stanzaContent: {
    width: "100%",
    alignItems: "center",
  },

  line: {
    textAlign: "center",
    fontWeight: "600",
    marginBottom: 10,
  },

  chorusContainer: {
    marginTop: 18,

    width: "100%",

    borderRadius: 20,

    padding: 20,

    alignItems: "center",
  },

  chorusLabel: {
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,

    marginBottom: 12,
  },

  chorusLine: {
    textAlign: "center",
    fontWeight: "600",
    marginBottom: 8,
  },
});
