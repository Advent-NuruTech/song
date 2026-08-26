import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
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
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { ChevronLeft, ChevronRight, Copy, Share2 } from "@/components/icons";

import { ShareIconButton } from "@/components/share-icon-button";
import { ShareSheet } from "@/components/share-sheet";
import { ScriptureShareEditor } from "@/components/scripture-share-editor";
import { Toast } from "@/components/toast";
import { AddToPlaylistSheet } from "@/components/add-to-playlist-sheet";

import { useAppTheme } from "@/hooks/use-app-theme";


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
import { getPlaylistNeighbors } from "@/src/features/personal/personalService";
import { downloadContent, isContentDownloaded, removeDownloadedContent, touchDownloadedContent } from "@/src/services/contentDownloadService";

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
  }: any) => {
    return (
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={
          styles.scrollContent
        }
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
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

  const { id, playlist } =
    useLocalSearchParams<{
      id?: string;
      playlist?: string;
    }>();

  const {
    colors,
    size,
    fontFamily,
    darkMode,
  } = useAppTheme();

  const mountedRef = useRef(true);

  const [loading, setLoading] =
    useState(true);

  const [song, setSong] =
    useState<ParsedSong | null>(null);
  const [downloaded, setDownloaded] = useState(false);
  const [downloadBusy, setDownloadBusy] = useState(false);

  const [prevSongId, setPrevSongId] =
    useState<string | null>(null);

  const [nextSongId, setNextSongId] =
    useState<string | null>(null);

  const [shareOpen, setShareOpen] =
    useState(false);

  const [selectionOpen, setSelectionOpen] =
    useState(false);

  const [playlistOpen, setPlaylistOpen] = useState(false);
  const [playlistPosition, setPlaylistPosition] = useState<{ index: number; count: number } | null>(null);

  const [toast, setToast] =
    useState<string | null>(null);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadSong = useCallback(
    async (songId: string, playlistId?: string) => {
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

        const isDownloaded = await isContentDownloaded("song", songId);
        if (!mountedRef.current) return;
        setDownloaded(isDownloaded);
        if (isDownloaded) void touchDownloadedContent("song", songId);

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

        if (playlistId) {
          const neighbors = await getPlaylistNeighbors(playlistId, songId);
          if (!mountedRef.current) return;
          setPrevSongId(neighbors.previousId);
          setNextSongId(neighbors.nextId);
          setPlaylistPosition({ index: neighbors.index, count: neighbors.count });
          return;
        }

        setPlaylistPosition(null);
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

    loadSong(String(id), typeof playlist === "string" ? playlist : undefined);
  }, [id, playlist, loadSong]);

  const primaryColor =
    useMemo(() => {
      return song
        ? getLanguageColor(
            song.language
          )
        : colors.tint;
    }, [song, colors.tint]);

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

  const selectableSongText = useMemo(() => {
    if (!song) return "";
    const sections = song.parsedStanzas.map(
      (stanza, index) => `Stanza ${index + 1}\n${stanza.join("\n")}`
    );
    if (song.parsedChorus.length) {
      sections.push(`Chorus\n${song.parsedChorus.join("\n")}`);
    }
    return sections.join("\n\n");
  }, [song]);

  const navigateSong =
    useCallback(
      (targetId: string | null) => {
        if (!targetId) return;

        router.replace({
          pathname:
            "/song/[id]",
          params: {
            id: targetId,
            ...(typeof playlist === "string" ? { playlist } : {}),
          },
        });
      },
      [playlist, router]
    );

  const handleDownload = useCallback(async () => {
    if (!song || downloadBusy) return;
    setDownloadBusy(true);
    try {
      await downloadContent("song", song.id);
      setDownloaded(true);
      await loadSong(song.id, typeof playlist === "string" ? playlist : undefined);
    } catch (error) {
      setToast((error as Error).message);
    } finally {
      setDownloadBusy(false);
    }
  }, [downloadBusy, loadSong, playlist, song]);

  const handleRemoveDownload = useCallback(async () => {
    if (!song || downloadBusy) return;
    setDownloadBusy(true);
    try {
      await removeDownloadedContent("song", song.id);
      setDownloaded(false);
      setToast("Download removed. The hymn stays in your catalog.");
    } finally {
      setDownloadBusy(false);
    }
  }, [downloadBusy, song]);

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
              {playlistPosition && playlistPosition.index >= 0 && (
                <Text style={[styles.playlistPosition, { color: primaryColor, fontFamily }]}>
                  Playlist {playlistPosition.index + 1} of {playlistPosition.count}
                </Text>
              )}
            </View>

            <Pressable
              accessibilityLabel="Add song to playlist"
              onPress={() => setPlaylistOpen(true)}
              style={[styles.headerAction, { borderColor: colors.border, backgroundColor: colors.card }]}
            >
              <Ionicons name="list-circle-outline" size={20} color={primaryColor} />
            </Pressable>

            <Pressable
              accessibilityLabel={downloaded ? "Remove song download" : "Download song"}
              onPress={downloaded ? handleRemoveDownload : handleDownload}
              style={[styles.headerAction, { borderColor: colors.border, backgroundColor: colors.card }]}
            >
              <Ionicons name={downloaded ? "trash-outline" : "download-outline"} size={20} color={primaryColor} />
            </Pressable>

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

        {downloaded ? <SongContent
          song={song}
          colors={colors}
          size={size}
          fontFamily={fontFamily}
          darkMode={darkMode}
          primaryColor={
            primaryColor
          }
        /> : <View style={styles.downloadGate}>
          <Ionicons name="cloud-download-outline" size={46} color={primaryColor} />
          <Text style={[styles.downloadTitle, { color: colors.text, fontFamily }]}>Download this hymn?</Text>
          <Text style={[styles.downloadCopy, { color: colors.mutedText, fontFamily }]}>The hymn remains visible in the catalog. Lyrics load only when you choose, keeping startup and browsing fast.</Text>
          <Pressable disabled={downloadBusy} onPress={handleDownload} style={[styles.downloadButton, { backgroundColor: primaryColor }, downloadBusy && { opacity: .55 }]}>
            {downloadBusy ? <ActivityIndicator color="#fff" /> : <Ionicons name="download-outline" size={19} color="#fff" />}
            <Text style={styles.downloadButtonText}>{downloadBusy ? "Downloading..." : "Download hymn"}</Text>
          </Pressable>
        </View>}
      </View>

      <ShareSheet
        visible={shareOpen}
        onClose={() => setShareOpen(false)}
        title={song.title}
        subtitle={`Hymn #${song.hymnNumber}`}
        options={[
          {
            key: "exact",
            label: "Choose exact text",
            hint: "Select a line, part of a stanza, or any excerpt",
            icon: Copy,
            onPress: () => setSelectionOpen(true),
          },
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

      <ScriptureShareEditor
        visible={selectionOpen}
        onClose={() => setSelectionOpen(false)}
        reference={`Hymn #${song.hymnNumber} — ${song.title}`}
        text={selectableSongText}
        onCopied={() => setToast("Selected hymn text copied")}
      />

      <Toast message={toast} onHide={() => setToast(null)} />
      <AddToPlaylistSheet
        visible={playlistOpen}
        songId={song.id}
        songTitle={song.title}
        onClose={() => setPlaylistOpen(false)}
        onAdded={(title) => setToast(`Added to ${title}`)}
      />
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

  playlistPosition: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: "800",
  },

  headerAction: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
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

  downloadGate: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 34 },
  downloadTitle: { marginTop: 16, fontSize: 21, fontWeight: "800" },
  downloadCopy: { marginTop: 8, maxWidth: 420, textAlign: "center", fontSize: 14, lineHeight: 21 },
  downloadButton: { marginTop: 22, minHeight: 48, borderRadius: 14, paddingHorizontal: 22, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 },
  downloadButtonText: { color: "#fff", fontSize: 14, fontWeight: "800" },

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
