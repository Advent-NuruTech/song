import { Link, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useAppTheme } from "@/hooks/use-app-theme";
import {
  formatLanguageLabel,
  getLanguageColor,
  getLanguagesWithCounts,
  type LanguageSummary,
} from "@/src/services/languageService";
import { getContentCategories, type ContentCategory } from "@/src/services/contentCategoryService";

export default function CategoriesScreen() {
  const { colors, size, fontFamily, darkMode } = useAppTheme();
  const [languages, setLanguages] = useState<LanguageSummary[]>([]);
  const [songCategories, setSongCategories] = useState<ContentCategory[]>([]);
  const [mode, setMode] = useState<"category" | "language">("category");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadLanguages = async () => {
      try {
        const [items, categories] = await Promise.all([getLanguagesWithCounts(), getContentCategories("song")]);
        
        if (!isMounted) return;
        setLanguages(items);
        setSongCategories(categories);
      } catch (error) {
        console.error("Failed to load language counts:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadLanguages();

    return () => {
      isMounted = false;
    };
  }, []);

  const getDescription = (item: LanguageSummary) => {
    const { total } = item;
    return total > 0
      ? `Explore ${total} songs in ${item.name}`
      : `No songs yet in ${item.name}`;
  };

  const renderLanguageItem = ({ item }: { item: LanguageSummary }) => {
    const color = getLanguageColor(item.code || item.value);
    const label = formatLanguageLabel(item.code || item.value);
    const description = getDescription(item);

    // Calculate background colors based on dark mode
    const circleBgOpacity = darkMode ? "30" : "20";
    const badgeBgOpacity = darkMode ? "40" : "15";
    const circleBgColor = `${color}${circleBgOpacity}`;
    const badgeBgColor = `${color}${badgeBgOpacity}`;

    return (
      <Link
        href={{
          pathname: "/songs",
          params: { lang: item.value },
        }}
        asChild
      >
        <Pressable
          style={[
            styles.card,
            { 
              borderColor: colors.border, 
              backgroundColor: colors.card,
              shadowColor: darkMode ? "rgba(0,0,0,0.4)" : "rgba(0,0,0,0.08)",
            }
          ]}
        >
          <View style={styles.cardInner}>
            {/* Language Label Circle */}
            <View
              style={[
                styles.labelCircle,
                { 
                  backgroundColor: circleBgColor,
                  borderColor: color,
                }
              ]}
            >
              <Text
                style={[
                  styles.labelText,
                  { 
                    color: color, 
                    fontSize: size(16), 
                    fontFamily,
                  }
                ]}
              >
                {label}
              </Text>
            </View>

            {/* Content */}
            <View style={styles.contentContainer}>
              <View style={styles.titleRow}>
                <Text
                  style={[
                    styles.title,
                    { 
                      color: colors.text, 
                      fontSize: size(18), 
                      fontFamily,
                    }
                  ]}
                  numberOfLines={1}
                >
                  {item.name}
                </Text>
                
                <View style={[
                  styles.countBadge, 
                  { 
                    backgroundColor: badgeBgColor,
                  }
                ]}>
                  <Text
                    style={[
                      styles.countText,
                      { 
                        color: color, 
                        fontSize: size(14), 
                        fontFamily,
                      }
                    ]}
                  >
                    {item.total}
                  </Text>
                </View>
              </View>

              <Text
                style={[
                  styles.description,
                  { 
                    color: colors.mutedText, 
                    fontSize: size(14), 
                    fontFamily,
                    lineHeight: size(20),
                  }
                ]}
                numberOfLines={2}
              >
                {description}
              </Text>
            </View>

      
          </View>
        </Pressable>
      </Link>
    );
  };

  const renderCategoryItem = ({ item }: { item: ContentCategory }) => (
    <Link href={{ pathname: "/songs", params: { category: item.name } }} asChild>
      <Pressable style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card, shadowColor: darkMode ? "rgba(0,0,0,0.4)" : "rgba(0,0,0,0.08)" }]}>
        <View style={styles.cardInner}>
          <View style={[styles.labelCircle, { backgroundColor: `${item.color}${darkMode ? "30" : "20"}`, borderColor: item.color }]}><Ionicons name={(item.icon || "musical-notes-outline") as keyof typeof Ionicons.glyphMap} size={27} color={item.color} /></View>
          <View style={styles.contentContainer}><View style={styles.titleRow}><Text numberOfLines={1} style={[styles.title, { color: colors.text, fontSize: size(18), fontFamily }]}>{item.displayName}</Text><View style={[styles.countBadge, { backgroundColor: `${item.color}${darkMode ? "40" : "15"}` }]}><Text style={[styles.countText, { color: item.color, fontSize: size(14), fontFamily }]}>{item.usageCount}</Text></View></View><Text numberOfLines={2} style={[styles.description, { color: colors.mutedText, fontSize: size(14), fontFamily, lineHeight: size(20) }]}>{item.description || `Explore ${item.usageCount} songs in ${item.displayName}`}</Text></View>
        </View>
      </Pressable>
    </Link>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <Stack.Screen options={{ headerShown: false, title: "" }} />

      <StatusBar
        barStyle={darkMode ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />

      {/* Centered Header */}
      <View style={[
        styles.headerContainer,
        { 
          borderBottomColor: colors.border,
          backgroundColor: colors.card,
        }
      ]}>
        <View style={styles.headerCenter}>
         
          <Text
            style={[
              styles.headerSubtitle,
              { 
                color: colors.mutedText, 
                fontSize: size(16), 
                fontFamily,
                marginTop: 8,
              }
            ]}
          >
            Browse songs without loading their lyrics
          </Text>
        </View>
        <View style={[styles.segment, { borderColor: colors.border, backgroundColor: colors.background }]}>
          {(["category", "language"] as const).map((item) => <Pressable key={item} onPress={() => setMode(item)} style={[styles.segmentButton, mode === item && { backgroundColor: colors.tint }]}><Text style={[styles.segmentText, { color: mode === item ? colors.onPrimary : colors.mutedText, fontFamily }]}>{item === "category" ? "Categories" : "Languages"}</Text></Pressable>)}
        </View>
      </View>

      {/* Language Cards List */}
      {mode === "language" ? <FlatList
        data={languages}
        keyExtractor={(item) => item.value}
        renderItem={renderLanguageItem}
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
                <Text
                  style={[
                    styles.emptyText,
                    { 
                      color: colors.mutedText, 
                      fontSize: size(16), 
                      fontFamily,
                      textAlign: "center",
                    }
                  ]}
                >
                  No languages found. Add songs to see languages here.
                </Text>
              </View>
            </View>
          ) : null
        }
      /> : <FlatList
        data={songCategories}
        keyExtractor={(item) => item.name}
        renderItem={renderCategoryItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={!loading ? <View style={styles.emptyContainer}><View style={[styles.emptyCard, { borderColor: colors.border, backgroundColor: colors.card }]}><Text style={[styles.emptyText, { color: colors.mutedText, fontSize: size(16), fontFamily }]}>No song categories yet. Add one in Admin, then assign songs to it.</Text></View></View> : null}
      />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  headerContainer: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === "ios" ? 50 : 32,
    paddingBottom: 24,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 1,
  },
  headerCenter: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  headerTitle: {
    textAlign: "center",
    letterSpacing: -0.5,
    fontWeight: "800",
  },
  headerSubtitle: {
    textAlign: "center",
    lineHeight: 22,
  },
  segment: { marginTop: 18, padding: 4, borderWidth: 1, borderRadius: 14, flexDirection: "row" },
  segmentButton: { minWidth: 112, minHeight: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  segmentText: { fontSize: 13, fontWeight: "800" },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 16,
  },
  card: {
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
    overflow: "hidden",
  },
  cardInner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
  },
  labelCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    borderWidth: 2,
  },
  labelText: {
    fontWeight: "700",
  },
  contentContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  title: {
    flex: 1,
    marginRight: 12,
    fontWeight: "700",
  },
  countBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    minWidth: 40,
    alignItems: "center",
  },
  countText: {
    fontWeight: "600",
  },
  description: {
    marginTop: 4,
  },

  emptyContainer: {
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  emptyCard: {
    padding: 32,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    lineHeight: 24,
  },
});
