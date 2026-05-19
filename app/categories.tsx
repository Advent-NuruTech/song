import { Link, Stack } from "expo-router";
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
import { useQuickFooter } from "@/src/context/QuickFooterContext";
import {
    formatLanguageLabel,
    getLanguageColor,
    getLanguagesWithCounts,
    type LanguageSummary,
} from "@/src/services/languageService";

export default function CategoriesScreen() {
  const { colors, size, fontFamily, darkMode } = useAppTheme();
  const { reportScroll } = useQuickFooter();
  const [languages, setLanguages] = useState<LanguageSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadLanguages = async () => {
      try {
        const items = await getLanguagesWithCounts();
        
        if (!isMounted) return;
        setLanguages(items);
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
              styles.headerTitle,
              { 
                color: colors.text, 
                fontSize: size(32), 
                fontFamily,
              }
            ]}
          >
            Languages
          </Text>
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
            Select a language to explore songs
          </Text>
        </View>
      </View>

      {/* Language Cards List */}
      <FlatList
        data={languages}
        keyExtractor={(item) => item.value}
        renderItem={renderLanguageItem}
        onScroll={(event) => reportScroll(event.nativeEvent.contentOffset.y)}
        scrollEventThrottle={16}
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
      />
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
