import { Link, Stack } from "expo-router";
import { Search, X } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    FlatList,
    NativeScrollEvent,
    NativeSyntheticEvent,
    Platform,
    Pressable,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

import { useAppTheme } from "@/hooks/use-app-theme";
import { useQuickFooter } from "@/src/context/QuickFooterContext";
import {
    StudySummary,
    getCategoriesWithCounts,
    getCategoryColor,
    getStudySummaries,
    searchStudies,
} from "@/src/services/studiesService";
import { ShareIconButton } from "@/components/share-icon-button";
import { shareStudyLink } from "@/src/services/shareService";

export default function StudiesScreen() {
  const { colors, size, fontFamily, darkMode } = useAppTheme();
  const { reportScroll } = useQuickFooter();
  const [studies, setStudies] = useState<StudySummary[]>([]);
  const [categories, setCategories] = useState<{ category: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showHeader, setShowHeader] = useState(true);
  
  const scrollY = useRef(new Animated.Value(0)).current;
  const mainScrollViewRef = useRef<FlatList>(null);
  const categoriesScrollViewRef = useRef<FlatList>(null);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        const [categoryList, studyList] = await Promise.all([
          getCategoriesWithCounts(),
          getStudySummaries({
            category: selectedCategory || undefined,
            limit: 100
          })
        ]);

        if (isMounted) {
          setCategories(categoryList);
          setStudies(studyList);
        }
      } catch (error) {
        console.error("Failed to load studies:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, [selectedCategory]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setShowSearchResults(false);
      return;
    }

    setSearching(true);
    setShowSearchResults(true);
    
    try {
      const results = await searchStudies(query);
      setStudies(results.map(r => ({
        ...r,
        excerpt: r.excerpt || '',
        wordCount: 0,
        isFeatured: false
      })));
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setShowSearchResults(false);
    setSelectedCategory(null);
    
    // Reload all studies
    setLoading(true);
    getStudySummaries({ limit: 100 }).then(data => {
      setStudies(data);
      setLoading(false);
    });
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    reportScroll(offsetY);
    setShowHeader(offsetY < 100);
    scrollY.setValue(offsetY);
  };

  const renderCategoryItem = ({ item }: { item: {category: string, count: number} }) => {
    const isSelected = selectedCategory === item.category;
    const color = getCategoryColor(item.category);
    
    return (
      <Pressable
        onPress={() => {
          setSelectedCategory(isSelected ? null : item.category);
          setShowSearchResults(false);
          
          // Scroll to top when category changes
          if (mainScrollViewRef.current) {
            mainScrollViewRef.current.scrollToOffset({ offset: 0, animated: true });
          }
        }}
        style={[
          styles.categoryItem,
          {
            backgroundColor: isSelected 
              ? color 
              : darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)",
            borderColor: isSelected ? color : colors.border,
          }
        ]}
      >
        <Text
          style={[
            styles.categoryText,
            {
              color: isSelected ? '#FFFFFF' : colors.text,
              fontSize: size(14),
              fontFamily,
            }
          ]}
          numberOfLines={1}
        >
          {item.category}
        </Text>
        <View style={[
          styles.categoryCount,
          { backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : colors.border }
        ]}>
          <Text
            style={[
              styles.countText,
              {
                color: isSelected ? '#FFFFFF' : colors.mutedText,
                fontSize: size(12),
                fontFamily,
              }
            ]}
          >
            {item.count}
          </Text>
        </View>
      </Pressable>
    );
  };

  const renderStudyItem = ({ item }: { item: StudySummary }) => {
    const color = getCategoryColor(item.category);
    const wordCountText = item.wordCount > 0 
      ? `${Math.ceil(item.wordCount / 250)} min read • ${item.wordCount.toLocaleString()} words`
      : '';

    return (
      <View style={styles.studyCardContainer}>
        <Link
          href={{
            pathname: "/studies/[id]",
            params: { id: item.id },
          }}
          asChild
        >
          <Pressable
            style={[
              styles.studyCard,
              {
                borderColor: colors.border,
                backgroundColor: colors.card,
                shadowColor: darkMode ? "#000" : "#0f172a",
              }
            ]}
          >
            <View style={styles.studyContent}>
              {/* Category Indicator */}
              <View style={styles.categoryIndicator}>
                <View style={[styles.categoryDot, { backgroundColor: color }]} />
                <Text
                  style={[
                    styles.categoryLabel,
                    {
                      color: colors.mutedText,
                      fontSize: size(13),
                      fontFamily,
                    }
                  ]}
                >
                  {item.category}
                </Text>
              </View>

              {/* Study Title */}
              <Text
                style={[
                  styles.studyTitle,
                  {
                    color: colors.text,
                    fontSize: size(18),
                    fontFamily,
                  }
                ]}
                numberOfLines={2}
              >
                {item.title}
              </Text>

              {/* Subtitle */}
              {item.subtitle && (
                <Text
                  style={[
                    styles.studySubtitle,
                    {
                      color: colors.mutedText,
                      fontSize: size(15),
                      fontFamily,
                    }
                  ]}
                  numberOfLines={1}
                >
                  {item.subtitle}
                </Text>
              )}

              {/* Excerpt */}
              {item.excerpt && (
                <Text
                  style={[
                    styles.excerpt,
                    {
                      color: colors.mutedText,
                      fontSize: size(14),
                      fontFamily,
                    }
                  ]}
                  numberOfLines={3}
                >
                  {item.excerpt}
                </Text>
              )}

              {/* Metadata */}
              <View style={styles.metadata}>
                {item.author && (
                  <Text
                    style={[
                      styles.author,
                      {
                        color: colors.text,
                        fontSize: size(13),
                        fontFamily,
                      }
                    ]}
                  >
                    By {item.author}
                  </Text>
                )}

                {wordCountText && (
                  <Text
                    style={[
                      styles.wordCount,
                      {
                        color: colors.subtleText,
                        fontSize: size(12),
                        fontFamily,
                      }
                    ]}
                  >
                    {wordCountText}
                  </Text>
                )}
              </View>
            </View>
          </Pressable>
        </Link>

        <ShareIconButton
          color={colors.tint}
          borderColor={colors.border}
          backgroundColor={colors.card}
          onPress={() =>
            void shareStudyLink({
              title: item.title,
              category: item.category,
              author: item.author,
            })
          }
          style={styles.shareButton}
        />
      </View>
    );
  };

  // Animation values for floating elements
  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, -200],
    extrapolate: 'clamp',
  });

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 80, 100],
    outputRange: [1, 0.5, 0],
    extrapolate: 'clamp',
  });

  const searchBarTranslateY = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [0, -60],
    extrapolate: 'clamp',
  });

  const categoriesTranslateY = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [0, -120],
    extrapolate: 'clamp',
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: "Studies", headerShown: false }} />
      <StatusBar
        barStyle={darkMode ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />

      {/* Animated Header - Disappears on scroll */}
      <Animated.View 
        style={[
          styles.headerContainer,
          {
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
            transform: [{ translateY: headerTranslateY }],
            opacity: headerOpacity,
          }
        ]}
      >
        <View style={styles.headerContent}>
          <Text
            style={[
              styles.headerTitle,
              {
                color: colors.text,
                fontSize: size(28),
                fontFamily,
              }
            ]}
          >
            Studies
          </Text>
          <Text
            style={[
              styles.headerSubtitle,
              {
                color: colors.mutedText,
                fontSize: size(15),
                fontFamily,
                marginTop: 4,
              }
            ]}
          >
            Comprehensive biblical research and studies
          </Text>
        </View>
      </Animated.View>

      {/* Floating Search Bar */}
      <Animated.View 
        style={[
          styles.searchContainer,
          {
            transform: [{ translateY: searchBarTranslateY }],
            backgroundColor: colors.background,
          }
        ]}
      >
        <View style={[
          styles.searchWrapper,
          {
            borderColor: colors.border,
            backgroundColor: colors.card,
          }
        ]}>
          <Search 
            size={size(18)} 
            color={colors.mutedText} 
            style={styles.searchIcon}
          />
          <TextInput
            placeholder="Search studies by title, content, or keywords..."
            placeholderTextColor={colors.subtleText}
            value={searchQuery}
            onChangeText={handleSearch}
            style={[
              styles.searchInput,
              {
                color: colors.text,
                fontSize: size(16),
                fontFamily,
              },
            ]}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <Pressable
              onPress={clearSearch}
              style={styles.clearButton}
            >
              <X size={size(18)} color={colors.mutedText} />
            </Pressable>
          )}
        </View>
        
        {searching && (
          <View style={styles.searchingIndicator}>
            <ActivityIndicator size="small" color={colors.tint} />
            <Text style={[styles.searchingText, { color: colors.mutedText, fontFamily }]}>
              Searching...
            </Text>
          </View>
        )}
      </Animated.View>

      {/* Floating Categories */}
      <Animated.View 
        style={[
          styles.categoriesSection,
          {
            transform: [{ translateY: categoriesTranslateY }],
            backgroundColor: colors.background,
          }
        ]}
      >
        <View style={styles.sectionHeader}>

          
          <Text
            style={[
              styles.sectionTitle,
              {
                color: colors.text,
                fontSize: size(18),
                fontFamily,
              }
            ]}
          >
            Topics
          </Text>
          {selectedCategory && (
            <Pressable
              onPress={() => setSelectedCategory(null)}
              style={styles.clearFilter}
            >
              <Text
                style={[
                  styles.clearFilterText,
                  {
                    color: colors.mutedText,
                    fontSize: size(14),
                    fontFamily,
                  }
                ]}
              >
                Clear filter
              </Text>
            </Pressable>
          )}

           <Text
            style={[
              styles.sectionTitle,
              {
                color: colors.text,
                fontSize: size(18),
                fontFamily,
              }
            ]}
          >
            {showSearchResults 
              ? `Search Results for "${searchQuery}"`
              : selectedCategory 
                ? `${selectedCategory} Studies`
                : 'All Studies'
            }
            <Text
              style={[
                styles.studyCount,
                {
                  color: colors.mutedText,
                  fontSize: size(14),
                  fontFamily,
                }
              ]}
            >
              {' '}({studies.length})
            </Text>
          </Text>
        </View>
        <FlatList
          ref={categoriesScrollViewRef}
          data={categories}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesList}
          renderItem={renderCategoryItem}
          keyExtractor={(item) => item.category}
        />
      </Animated.View>

      {/* Main Studies List */}
      <View style={styles.studiesSection}>
        
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.tint} />
            <Text style={[styles.loadingText, { color: colors.mutedText, fontFamily }]}>
              Loading studies...
            </Text>
          </View>
        ) : (
          <FlatList
            ref={mainScrollViewRef}
            data={studies}
            keyExtractor={(item) => item.id}
            renderItem={renderStudyItem}
            contentContainerStyle={[
              styles.studiesList,
              { paddingTop: Platform.OS === "ios" ? 220 : 200 }
            ]}
            showsVerticalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            ListEmptyComponent={
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
                  <Search size={size(40)} color={colors.mutedText} />
                  <Text
                    style={[
                      styles.emptyTitle,
                      {
                        color: colors.text,
                        fontSize: size(18),
                        fontFamily,
                        marginTop: 16,
                      }
                    ]}
                  >
                    {showSearchResults
                      ? "No results found"
                      : "No studies available"
                    }
                  </Text>
                  <Text
                    style={[
                      styles.emptySubtitle,
                      {
                        color: colors.mutedText,
                        fontSize: size(14),
                        fontFamily,
                        marginTop: 8,
                        textAlign: "center",
                      }
                    ]}
                  >
                    {showSearchResults
                      ? "Try different search terms"
                      : selectedCategory
                        ? `No studies in "${selectedCategory}" category`
                        : "Studies will appear here once added"
                    }
                  </Text>
                </View>
              </View>
            }
          />
        )}
      </View>

      {/* Floating Back to Top Button */}
      {!showHeader && (
        <Pressable
          onPress={() => {
            if (mainScrollViewRef.current) {
              mainScrollViewRef.current.scrollToOffset({ offset: 0, animated: true });
            }
          }}
          style={[
            styles.floatingTopButton,
            { 
              backgroundColor: colors.card, 
              borderColor: colors.border,
              shadowColor: darkMode ? '#000' : '#000',
            }
          ]}
        >
          <Text style={[
            styles.floatingTopText,
            { color: colors.text, fontSize: size(14), fontFamily }
          ]}>
            ↑ Top
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  headerContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    backgroundColor: "#c41414",
    right: 0,
    zIndex: 100,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  headerContent: {
    alignItems: "center",
  },
  headerTitle: {
    fontWeight: "700",
    textAlign: "center",
  },
  headerSubtitle: {
    textAlign: "center",
    lineHeight: 20,
  },
  searchContainer: {
    position: "absolute",
    top: Platform.OS === "ios" ? 140 : 120,
    left: 0,
    right: 0,
    zIndex: 90,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
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
  clearButton: {
    padding: 4,
  },
  searchingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 8,
  },
  searchingText: {
    fontSize: 14,
  },
  categoriesSection: {
    position: "absolute",
    top: Platform.OS === "ios" ? 200 : 180,
    left: 0,
    right: 0,
    zIndex: 80,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionHeaderRow: {
    position: "absolute",
    top: Platform.OS === "ios" ? 290 : 270,
    left: 20,
    right: 20,
    zIndex: 70,
  },
  sectionTitle: {
    fontWeight: "600",
  },
  clearFilter: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  clearFilterText: {
    fontWeight: "500",
  },
  categoriesList: {
    gap: 8,
    paddingBottom: 16,
  },
  categoryItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  categoryText: {
    fontWeight: "500",
  },
  categoryCount: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  countText: {
    fontWeight: "600",
  },
  studiesSection: {
    flex: 1,
  },
  studyCount: {
    fontWeight: "400",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  studiesList: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  studyCardContainer: {
    marginBottom: 12,
    position: "relative",
  },
  studyCard: {
    borderRadius: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  studyContent: {
    padding: 20,
  },
  categoryIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  categoryLabel: {
    fontWeight: "500",
  },
  studyTitle: {
    fontWeight: "700",
    lineHeight: 24,
    marginBottom: 6,
  },
  studySubtitle: {
    fontWeight: "500",
    marginBottom: 12,
  },
  excerpt: {
    lineHeight: 22,
    marginBottom: 16,
  },
  metadata: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  author: {
    fontWeight: "500",
  },
  wordCount: {
    fontWeight: "500",
  },
  shareButton: {
    position: "absolute",
    top: 10,
    right: 10,
  },
  emptyContainer: {
    paddingTop: 40,
  },
  emptyCard: {
    padding: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontWeight: "600",
  },
  emptySubtitle: {
    lineHeight: 20,
  },
  floatingTopButton: {
    position: "absolute",
    bottom: 30,
    right: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    zIndex: 200,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  floatingTopText: {
    fontWeight: "600",
  },
});
