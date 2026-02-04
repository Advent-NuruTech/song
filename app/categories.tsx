import { Link } from "expo-router";
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

export default function CategoriesScreen() {
  const { colors, size, fontFamily, darkMode } = useAppTheme();
  const [languages, setLanguages] = useState<LanguageSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadLanguages = async () => {
      try {
        const items = await getLanguagesWithCounts();
        
        if (!isMounted) return;

        // Sort languages with priority order
        const sortedItems = [...items].sort((a, b) => {
          const aName = (a.name || a.value || "").toLowerCase();
          const bName = (b.name || b.value || "").toLowerCase();
          
          // Define priority order
          const priorityOrder = ["total", "english", "swahili"];
          
          const aPriorityIndex = priorityOrder.findIndex(lang => aName.includes(lang));
          const bPriorityIndex = priorityOrder.findIndex(lang => bName.includes(lang));
          
          // If both are in priority list, sort by priority order
          if (aPriorityIndex !== -1 && bPriorityIndex !== -1) {
            return aPriorityIndex - bPriorityIndex;
          }
          
          // If only one is in priority list, it comes first
          if (aPriorityIndex !== -1) return -1;
          if (bPriorityIndex !== -1) return 1;
          
          // Alphabetical for non-priority languages
          return aName.localeCompare(bName);
        });
        
        setLanguages(sortedItems);
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
    const itemName = (item.name || item.value || "").toLowerCase();
    const { total } = item;

    if (itemName.includes("total")) {
      return "All songs across all languages";
    }
    
    if (itemName.includes("english")) {
      return total > 0 ? `Explore ${total} English songs` : "No English songs yet";
    }
    
    if (itemName.includes("swahili")) {
      return total > 0 ? `Explore ${total} Swahili songs` : "No Swahili songs yet";
    }
    
    return total > 0 ? `Explore ${total} songs in ${item.name}` : "No songs yet";
  };

  const renderLanguageItem = ({ item }: { item: LanguageSummary }) => {
    const color = getLanguageColor(item.code || item.value);
    const label = formatLanguageLabel(item.code || item.value);
    const itemName = (item.name || item.value || "").toLowerCase();
    const isTotal = itemName.includes("total");
    const description = getDescription(item);

    // Use tint color as primary color (available in your theme)
    const primaryColor = colors.tint || color;
    
    // Calculate background colors based on dark mode
    const circleBgOpacity = darkMode ? "30" : "20";
    const badgeBgOpacity = darkMode ? "40" : "15";
    const circleBgColor = isTotal 
      ? `${primaryColor}${circleBgOpacity}`
      : `${color}${circleBgOpacity}`;
    
    const badgeBgColor = isTotal 
      ? `${primaryColor}${badgeBgOpacity}`
      : `${color}${badgeBgOpacity}`;

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
                  borderColor: isTotal ? primaryColor : color,
                }
              ]}
            >
              <Text
                style={[
                  styles.labelText,
                  { 
                    color: isTotal ? primaryColor : color, 
                    fontSize: size(isTotal ? 20 : 16), 
                    fontFamily,
                  }
                ]}
              >
                {isTotal ? "🎵" : label}
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
                        color: isTotal ? primaryColor : color, 
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