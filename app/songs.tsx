import { Link, useLocalSearchParams } from "expo-router";
import { Search } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAppTheme } from "@/hooks/use-app-theme";
import { runQuery } from "@/src/db/runQuery";
import { formatLanguageName, getLanguageColor } from "@/src/services/languageService";

type Song = {
  id: string;
  hymnNumber: number;
  title: string;
  language: string;
  stanzas: string;
};

function safeLyricsText(stanzas: string) {
  try {
    const parsed = JSON.parse(stanzas) as string[][];
    return parsed.flat().join(" ");
  } catch {
    return String(stanzas);
  }
}

export default function SongsScreen() {
  const { lang } = useLocalSearchParams<{ lang?: string }>();
  const language = typeof lang === "string" ? lang : undefined;

  const { colors, size, fontFamily, darkMode } = useAppTheme();
  const [query, setQuery] = useState("");
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

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

        if (isMounted) {
          setSongs(result.rows._array as Song[]);
        }
      } catch (err) {
        console.error("Failed to load songs:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadSongs();
    return () => {
      isMounted = false;
    };
  }, [language]);

  const filteredSongs = useMemo(() => {
    if (!query.trim()) return songs;
    const searchTerm = query.toLowerCase();

    return songs.filter((song) => {
      const lyrics = safeLyricsText(song.stanzas).toLowerCase();
      return (
        song.title.toLowerCase().includes(searchTerm) ||
        song.hymnNumber.toString().includes(searchTerm) ||
        lyrics.includes(searchTerm)
      );
    });
  }, [songs, query]);

  const placeholder = language
    ? `Search songs in ${formatLanguageName(language)}...`
    : "Search by number, title, or lyrics...";

  const languageColor = language ? getLanguageColor(language) : colors.tint;

  const renderSongItem = ({ item }: { item: Song }) => (
    <Link
      href={{
        pathname: "/song/[id]",
        params: { id: item.id },
      }}
      asChild
    >
      <Pressable
        style={[
          styles.songCard,
          {
            borderColor: colors.border,
            backgroundColor: colors.card,
            shadowColor: darkMode ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.05)",
          }
        ]}
      >
        <View style={styles.songContent}>
          {/* Song Number Badge - Removed Hash icon */}
          <View
            style={[
              styles.numberBadge,
              {
                backgroundColor: `${languageColor}15`,
                borderColor: languageColor,
              }
            ]}
          >
            <Text
              style={[
                styles.numberText,
                {
                  color: languageColor,
                  fontSize: size(18),
                  fontFamily,
                }
              ]}
            >
              {item.hymnNumber}
            </Text>
          </View>

          {/* Song Info */}
          <View style={styles.songInfo}>
            <Text
              style={[
                styles.songTitle,
                {
                  color: colors.text,
                  fontSize: size(17),
                  fontFamily,
                }
              ]}
              numberOfLines={2}
            >
              {item.title}
            </Text>
            
            <View style={styles.songMeta}>
            
              
              {/* Optional: Show stanza count */}
              <Text
                style={[
                  styles.stanzaCount,
                  {
                    color: colors.subtleText,
                    fontSize: size(13),
                    fontFamily,
                  }
                ]}
              >
                {(() => {
                  try {
                    const stanzas = JSON.parse(item.stanzas) as string[][];
                    return `${stanzas.length} stanza${stanzas.length !== 1 ? 's' : ''}`;
                  } catch {
                    return "Multiple stanzas";
                  }
                })()}
              </Text>
            </View>
          </View>

          {/* Arrow Indicator */}
          <View
            style={[
              styles.arrowContainer,
              {
                backgroundColor: darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
              }
            ]}
          >
            <Text
              style={[
                styles.arrowText,
                {
                  color: colors.tint || colors.text,
                  fontSize: size(20),
                  fontFamily,
                }
              ]}
            >
              →
            </Text>
          </View>
        </View>
      </Pressable>
    </Link>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Search Header */}
      <View style={styles.searchContainer}>
        <View style={styles.searchWrapper}>
          <Search 
            size={size(20)} 
            color={colors.mutedText} 
            style={styles.searchIcon}
          />
          <TextInput
            placeholder={placeholder}
            placeholderTextColor={colors.subtleText}
            value={query}
            onChangeText={setQuery}
            style={[
              styles.searchInput,
              {
                color: colors.text,
                fontSize: size(16),
                fontFamily,
              },
            ]}
          />
          {query.length > 0 && (
            <Pressable
              onPress={() => setQuery("")}
              style={styles.clearButton}
            >
              <Text
                style={[
                  styles.clearText,
                  {
                    color: colors.mutedText,
                    fontSize: size(14),
                    fontFamily,
                  }
                ]}
              >
                Clear
              </Text>
            </Pressable>
          )}
        </View>
        
        {/* Results Count */}
        <View style={styles.resultsContainer}>
          <Text
            style={[
              styles.resultsText,
              {
                color: colors.mutedText,
                fontSize: size(14),
                fontFamily,
              }
            ]}
          >
            {filteredSongs.length} {filteredSongs.length === 1 ? 'song' : 'songs'} found
          </Text>
        </View>
      </View>

      {/* Songs List */}
      <FlatList
        data={filteredSongs}
        keyExtractor={(item) => item.id}
        renderItem={renderSongItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <View
                style={[
                  styles.emptyCard,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.card,
                  }
                ]}
              >
                <Search size={size(48)} color={colors.mutedText} />
                <Text
                  style={[
                    styles.emptyTitle,
                    {
                      color: colors.text,
                      fontSize: size(20),
                      fontFamily,
                      marginTop: 16,
                    }
                  ]}
                >
                  No songs found
                </Text>
                <Text
                  style={[
                    styles.emptySubtitle,
                  {
                    color: colors.mutedText,
                    fontSize: size(15),
                    fontFamily,
                    marginTop: 8,
                    textAlign: "center",
                  }
                ]}
              >
                {query 
                  ? "Try different search terms"
                  : "No songs available in this language"
                }
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.loadingContainer}>
            <Text
              style={[
                styles.loadingText,
                {
                  color: colors.mutedText,
                  fontSize: size(16),
                  fontFamily,
                }
              ]}
            >
              Loading songs...
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
  paddingTop: Platform.OS === "ios" ? 60 : 40,
  paddingBottom: 16,
  backgroundColor: "transparent",
},
searchWrapper: {
  flexDirection: "row",
  alignItems: "center",
  borderWidth: 1,
  borderRadius: 16,
  paddingHorizontal: 16,
  paddingVertical: 12,
  backgroundColor: "transparent",
  position: "relative",
},
searchIcon: {
  marginRight: 12,
},
searchInput: {
  flex: 1,
  padding: 0,
  fontWeight: "500",
},
clearButton: {
  paddingHorizontal: 10,
  paddingVertical: 6,
  borderRadius: 12,
},
clearText: {
  fontWeight: "600",
},
resultsContainer: {
  marginTop: 12,
  paddingHorizontal: 4,
},
resultsText: {
  fontWeight: "500",
},
listContent: {
  paddingHorizontal: 20,
  paddingBottom: 40,
  paddingTop: 8,
},
songCard: {
  borderRadius: 18,
  marginBottom: 12,
  borderWidth: 1,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 1,
  shadowRadius: 8,
  elevation: 3,
  overflow: "hidden",
},
songContent: {
  flexDirection: "row",
  alignItems: "center",
  padding: 18,
},
numberBadge: {
  width: 56,
  height: 56,
  borderRadius: 14,
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
},
songTitle: {
  fontWeight: "700",
  lineHeight: 22,
  marginBottom: 6,
},
songMeta: {
  flexDirection: "row",
  alignItems: "center",
  flexWrap: "wrap",
},

stanzaCount: {
  fontWeight: "500",
},
arrowContainer: {
  width: 40,
  height: 40,
  borderRadius: 20,
  justifyContent: "center",
  alignItems: "center",
  marginLeft: 12,
},
arrowText: {
  fontWeight: "700",
},
emptyContainer: {
  paddingHorizontal: 20,
  paddingTop: 60,
},
emptyCard: {
  padding: 40,
  borderRadius: 20,
  borderWidth: 1,
  alignItems: "center",
  justifyContent: "center",
},
emptyTitle: {
  fontWeight: "700",
},
emptySubtitle: {
  lineHeight: 22,
},
loadingContainer: {
  paddingTop: 60,
  alignItems: "center",
},
loadingText: {
  fontWeight: "500",
},
});