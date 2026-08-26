import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Search } from "@/components/icons";
import React, {
  memo,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { FlashList } from "@shopify/flash-list";

import { useAppTheme } from "@/hooks/use-app-theme";
import { runQuery } from "@/src/db/runQuery";

import {
  formatLanguageName,
  getLanguageColor,
} from "@/src/services/languageService";

type Song = {
  id: string;
  hymnNumber: number;
  title: string;
  language: string;
  searchableLyrics: string;
  stanzaCount: number;
};

const CARD_HEIGHT = 92;

function preprocessLyrics(stanzas: string) {
  try {
    const parsed = JSON.parse(stanzas) as string[][];
    return parsed.flat().join(" ").toLowerCase();
  } catch {
    return String(stanzas).toLowerCase();
  }
}

function getStanzaCount(stanzas: string) {
  try {
    return (JSON.parse(stanzas) as string[][]).length;
  } catch {
    return 0;
  }
}

type SongCardProps = {
  item: Song;
  onPress: () => void;
  colors: any;
  size: any;
  fontFamily: string;
  darkMode: boolean;
  languageColor: string;
};

const SongCard = memo(
  ({
    item,
    onPress,
    colors,
    size,
    fontFamily,
    darkMode,
    languageColor,
  }: SongCardProps) => {
    return (
      <View style={styles.songCardContainer}>
        <Pressable
          onPress={onPress}
          android_ripple={{
            color: `${languageColor}20`,
          }}
          style={[
            styles.songCard,
            {
              borderColor: colors.border,
              backgroundColor: colors.card,
              shadowColor: darkMode
                ? "rgba(0,0,0,0.25)"
                : "rgba(0,0,0,0.05)",
            },
          ]}
        >
          <View style={styles.songContent}>
            <View
              style={[
                styles.numberBadge,
                {
                  backgroundColor: `${languageColor}15`,
                  borderColor: languageColor,
                },
              ]}
            >
              <Text
                style={[
                  styles.numberText,
                  {
                    color: languageColor,
                    fontSize: size(18),
                    fontFamily,
                  },
                ]}
              >
                {item.hymnNumber}
              </Text>
            </View>

            <View style={styles.songInfo}>
              <Text
                numberOfLines={2}
                style={[
                  styles.songTitle,
                  {
                    color: colors.text,
                    fontSize: size(17),
                    fontFamily,
                  },
                ]}
              >
                {item.title}
              </Text>

              <Text
                style={[
                  styles.stanzaCount,
                  {
                    color: colors.subtleText,
                    fontSize: size(13),
                    fontFamily,
                  },
                ]}
              >
                {item.stanzaCount}{" "}
                {item.stanzaCount === 1 ? "stanza" : "stanzas"}
              </Text>
            </View>
          </View>
        </Pressable>
      </View>
    );
  }
);

SongCard.displayName = "SongCard";

export default function SongsScreen() {
  const router = useRouter();

  const { lang } = useLocalSearchParams<{
    lang?: string;
  }>();

  const language =
    typeof lang === "string"
      ? lang
      : undefined;

  const {
    colors,
    size,
    fontFamily,
    darkMode,
  } = useAppTheme();


  const [query, setQuery] = useState("");
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);

  const deferredQuery = useDeferredValue(query);

  const languageColor = useMemo(() => {
    return language
      ? getLanguageColor(language)
      : colors.tint;
  }, [language, colors.tint]);

  useEffect(() => {
    let mounted = true;

    const loadSongs = async () => {
      try {
        const result = await runQuery(
          `
          SELECT id, hymnNumber, title, language, stanzas
          FROM songs
          ${language ? "WHERE language = ?" : ""}
          ORDER BY hymnNumber ASC
          `,
          language ? [language] : []
        );

        if (!mounted) return;

        const processedSongs: Song[] =
          result.rows._array.map((song: any) => ({
            id: String(song.id),
            hymnNumber: song.hymnNumber,
            title: song.title,
            language: song.language,
            searchableLyrics: preprocessLyrics(song.stanzas),
            stanzaCount: getStanzaCount(song.stanzas),
          }));

        setSongs(processedSongs);
      } catch (error) {
        console.error("Failed loading songs:", error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadSongs();

    return () => {
      mounted = false;
    };
  }, [language]);

  const filteredSongs = useMemo(() => {
    const trimmed =
      deferredQuery.trim().toLowerCase();

    if (!trimmed) {
      return songs;
    }

    return songs.filter((song) => {
      return (
        song.title
          .toLowerCase()
          .includes(trimmed) ||
        song.hymnNumber
          .toString()
          .includes(trimmed) ||
        song.searchableLyrics.includes(trimmed)
      );
    });
  }, [songs, deferredQuery]);

  const placeholder = useMemo(() => {
    return language
      ? `Search songs in ${formatLanguageName(language)}...`
      : "Search by number, title, or lyrics...";
  }, [language]);

  const handleSongPress = useCallback(
    (id: string) => {
      router.push({
        pathname: "/song/[id]",
        params: { id },
      });
    },
    [router]
  );

  const keyExtractor = useCallback(
    (item: Song) => item.id,
    []
  );

  const renderItem = useCallback(
    ({ item }: { item: Song }) => (
      <SongCard
        item={item}
        onPress={() => handleSongPress(item.id)}
        colors={colors}
        size={size}
        fontFamily={fontFamily}
        darkMode={darkMode}
        languageColor={languageColor}
      />
    ),
    [
      handleSongPress,
      colors,
      size,
      fontFamily,
      darkMode,
      languageColor,
    ]
  );

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor:
            colors.background,
        },
      ]}
    >
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
        backgroundColor={colors.background}
      />

      <View style={styles.searchContainer}>
        <View
          style={[
            styles.searchWrapper,
            {
              borderColor: colors.border,
              backgroundColor: colors.card,
            },
          ]}
        >
          <Search
            size={size(20)}
            color={colors.mutedText}
            style={styles.searchIcon}
          />

          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={placeholder}
            placeholderTextColor={
              colors.subtleText
            }
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            clearButtonMode="while-editing"
            style={[
              styles.searchInput,
              {
                color: colors.text,
                fontSize: size(16),
                fontFamily,
              },
            ]}
          />
        </View>

        <View style={styles.resultsContainer}>
          <Text
            style={[
              styles.resultsText,
              {
                color:
                  colors.mutedText,
                fontSize: size(14),
                fontFamily,
              },
            ]}
          >
            {filteredSongs.length} songs
          </Text>
        </View>
      </View>

      <FlashList
        data={filteredSongs}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.listContent}
        drawDistance={400}
        getItemType={() => "song"}
        overrideItemLayout={(layout) => {
          (layout as any).size = CARD_HEIGHT;
        }}
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingContainer}>
              <Text
                style={[
                  styles.loadingText,
                  {
                    color: colors.mutedText,
                  },
                ]}
              >
                Loading songs...
              </Text>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Text
                style={[
                  styles.emptyTitle,
                  {
                    color: colors.text,
                  },
                ]}
              >
                No songs found
              </Text>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  searchContainer: {
    paddingHorizontal: 20,
    paddingTop:
      Platform.OS === "ios" ? 60 : 40,
    paddingBottom: 16,
  },

  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  searchIcon: {
    marginRight: 12,
  },

  searchInput: {
    flex: 1,
    padding: 0,
    fontWeight: "500",
  },

  resultsContainer: {
    marginTop: 12,
    paddingHorizontal: 2,
  },

  resultsText: {
    fontWeight: "500",
  },

  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 4,
  },

  songCardContainer: {
    marginBottom: 12,
  },

  songCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",

    shadowOffset: {
      width: 0,
      height: 2,
    },

    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },

  songContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    minHeight: CARD_HEIGHT,
  },

  numberBadge: {
    width: 58,
    height: 58,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    borderWidth: 2,
  },

  numberText: {
    fontWeight: "800",
  },

  songInfo: {
    flex: 1,
    justifyContent: "center",
  },

  songTitle: {
    fontWeight: "700",
    lineHeight: 22,
    marginBottom: 6,
  },

  stanzaCount: {
    fontWeight: "500",
  },

  emptyContainer: {
    paddingTop: 80,
    alignItems: "center",
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
  },

  loadingContainer: {
    paddingTop: 60,
    alignItems: "center",
  },

  loadingText: {
    fontWeight: "500",
  },
});
