import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Animated, {
  Extrapolate,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring
} from "react-native-reanimated";

import { useAppTheme } from "@/hooks/use-app-theme";
import { StudySummary, getCategoriesWithCounts, getStudySummaries } from "@/src/services/studiesService";

const QUOTES = [
  "Wisdom is the principal thing; therefore get wisdom. - Proverbs 4:7",
  "Study to show thyself approved unto God. - 2 Timothy 2:15",
  "The fear of the Lord is the beginning of wisdom. - Proverbs 9:10",
  "Let everything that has breath praise the Lord. - Psalm 150:6",
  "Thy word is a lamp unto my feet. - Psalm 119:105",
  "Sing unto the Lord a new song. - Psalm 96:1",
];

// Fixed number of animations - don't depend on data length
const NUM_STUDY_CARDS = 5; // Max number of study cards to show
const TOTAL_CARDS = 3 + NUM_STUDY_CARDS; // quote + actions + study cards

export default function HomeScreen() {
  const { colors, size, fontFamily, darkMode } = useAppTheme();
  const { width: windowWidth } = useWindowDimensions();
  const headerColor = "#0B4AA6";

  const [latestStudies, setLatestStudies] = useState<StudySummary[]>([]);
  const [loadingStudies, setLoadingStudies] = useState(true);
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);
  const [categories, setCategories] = useState<Array<{ category: string, count: number }>>([]);

  // Animation values - fixed array length
  const scrollY = useSharedValue(0);
  const headerOpacity = useSharedValue(1);
  const cardsAnim = Array.from({ length: TOTAL_CARDS }, () => useSharedValue(0));

  // Fetch studies and categories
  useEffect(() => {
    Promise.all([
      getStudySummaries({ limit: 10 }),
      getCategoriesWithCounts()
    ])
      .then(([studiesData, categoriesData]) => {
        setLatestStudies(studiesData);
        setCategories(categoriesData);
      })
      .finally(() => setLoadingStudies(false));
  }, []);

  // Rotating quotes effect
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentQuoteIndex((prev) => (prev + 1) % QUOTES.length);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  // Initialize animations
  useEffect(() => {
    const animateCards = () => {
      cardsAnim.forEach((anim, index) => {
        anim.value = withDelay(
          index * 100,
          withSpring(1, {
            damping: 12,
            stiffness: 100,
          })
        );
      });
    };

    // Delay animation slightly for better UX
    const timer = setTimeout(animateCards, 300);
    return () => clearTimeout(timer);
  }, []);

  const handleScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
      
      headerOpacity.value = interpolate(
        event.contentOffset.y,
        [0, 100],
        [1, 0],
        Extrapolate.CLAMP
      );
    },
  });

  // Create all card animations upfront - no hooks inside map
  const cardAnimations = {
    quote: useAnimatedStyle(() => ({
      opacity: cardsAnim[0].value,
      transform: [
        {
          translateY: interpolate(
            cardsAnim[0].value,
            [0, 1],
            [50, 0],
            Extrapolate.CLAMP
          ),
        },
        {
          scale: interpolate(
            cardsAnim[0].value,
            [0, 1],
            [0.9, 1],
            Extrapolate.CLAMP
          ),
        },
      ],
    })),
    songsAction: useAnimatedStyle(() => ({
      opacity: cardsAnim[1].value,
      transform: [
        {
          translateY: interpolate(
            cardsAnim[1].value,
            [0, 1],
            [50, 0],
            Extrapolate.CLAMP
          ),
        },
        {
          scale: interpolate(
            cardsAnim[1].value,
            [0, 1],
            [0.9, 1],
            Extrapolate.CLAMP
          ),
        },
      ],
    })),
    studiesAction: useAnimatedStyle(() => ({
      opacity: cardsAnim[2].value,
      transform: [
        {
          translateY: interpolate(
            cardsAnim[2].value,
            [0, 1],
            [50, 0],
            Extrapolate.CLAMP
          ),
        },
        {
          scale: interpolate(
            cardsAnim[2].value,
            [0, 1],
            [0.9, 1],
            Extrapolate.CLAMP
          ),
        },
      ],
    })),
    study1: useAnimatedStyle(() => ({
      opacity: cardsAnim[3].value,
      transform: [
        {
          translateY: interpolate(
            cardsAnim[3].value,
            [0, 1],
            [50, 0],
            Extrapolate.CLAMP
          ),
        },
        {
          scale: interpolate(
            cardsAnim[3].value,
            [0, 1],
            [0.9, 1],
            Extrapolate.CLAMP
          ),
        },
      ],
    })),
    study2: useAnimatedStyle(() => ({
      opacity: cardsAnim[4].value,
      transform: [
        {
          translateY: interpolate(
            cardsAnim[4].value,
            [0, 1],
            [50, 0],
            Extrapolate.CLAMP
          ),
        },
        {
          scale: interpolate(
            cardsAnim[4].value,
            [0, 1],
            [0.9, 1],
            Extrapolate.CLAMP
          ),
        },
      ],
    })),
    study3: useAnimatedStyle(() => ({
      opacity: cardsAnim[5].value,
      transform: [
        {
          translateY: interpolate(
            cardsAnim[5].value,
            [0, 1],
            [50, 0],
            Extrapolate.CLAMP
          ),
        },
        {
          scale: interpolate(
            cardsAnim[5].value,
            [0, 1],
            [0.9, 1],
            Extrapolate.CLAMP
          ),
        },
      ],
    })),
    study4: useAnimatedStyle(() => ({
      opacity: cardsAnim[6].value,
      transform: [
        {
          translateY: interpolate(
            cardsAnim[6].value,
            [0, 1],
            [50, 0],
            Extrapolate.CLAMP
          ),
        },
        {
          scale: interpolate(
            cardsAnim[6].value,
            [0, 1],
            [0.9, 1],
            Extrapolate.CLAMP
          ),
        },
      ],
    })),
    study5: useAnimatedStyle(() => ({
      opacity: cardsAnim[7].value,
      transform: [
        {
          translateY: interpolate(
            cardsAnim[7].value,
            [0, 1],
            [50, 0],
            Extrapolate.CLAMP
          ),
        },
        {
          scale: interpolate(
            cardsAnim[7].value,
            [0, 1],
            [0.9, 1],
            Extrapolate.CLAMP
          ),
        },
      ],
    })),
  };

  // Helper function to get study category color
  const getCategoryColor = (category: string): string => {
    const categoryData = categories.find(c => c.category === category);
    if (!categoryData) return colors.tint;
    
    const categoryColors: Record<string, string> = {
      "Bible Study": "#4F46E5",
      "Doctrine": "#059669",
      "Prophecy": "#DC2626",
      "History": "#7C3AED",
      "Sermon": "#EA580C",
      "Devotional": "#DB2777",
      "Apologetics": "#0891B2",
      "Theology": "#9333EA",
      "Ethics": "#65A30D",
      "Spiritual Growth": "#DB2777",
    };
    
    return categoryColors[category] || generateColorFromString(category);
  };

  const generateColorFromString = (str: string): string => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const colors = [
      "#4F46E5", "#059669", "#DC2626", "#7C3AED", "#EA580C",
      "#DB2777", "#0891B2", "#9333EA", "#65A30D", "#CA8A04"
    ];
    
    return colors[Math.abs(hash) % colors.length];
  };

  // Get study animation style by index
  const getStudyAnimation = (index: number) => {
    switch(index) {
      case 0: return cardAnimations.study1;
      case 1: return cardAnimations.study2;
      case 2: return cardAnimations.study3;
      case 3: return cardAnimations.study4;
      case 4: return cardAnimations.study5;
      default: return cardAnimations.study1;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {/* Header with animated opacity */}
        <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
          <View style={[styles.headerGradient, { backgroundColor: headerColor }]}>
            <View style={styles.headerContent}>
              <View style={styles.logoContainer}>
                <Image
                  source={require("@/assets/images/icon.png")}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </View>

              <Text
                style={[
                  styles.appTitle,
                  { fontSize: size(28), fontFamily },
                ]}
              >
                Advent Pro
              </Text>

              <Text
                style={[
                  styles.poweredBy,
                  { fontSize: size(12), fontFamily },
                ]}
              >
                Powered by Advent Nurutech
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Rotating Quote Card */}
        <Animated.View
          style={[
            styles.quoteCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              shadowColor: darkMode ? "#000" : "#0f172a",
            },
            cardAnimations.quote,
          ]}
        >
        
          
          <Text
            style={[
              styles.quoteText,
              {
                color: colors.text,
                fontSize: size(16),
                fontFamily,
                lineHeight: size(24),
              },
            ]}
          >
            {QUOTES[currentQuoteIndex]}
          </Text>
          
          <View style={styles.quoteDots}>
            {QUOTES.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.quoteDot,
                  {
                    backgroundColor:
                      index === currentQuoteIndex
                        ? colors.tint
                        : colors.border,
                  },
                ]}
              />
            ))}
          </View>
        </Animated.View>

        {/* Quick Actions Section */}
        <View style={styles.actionsContainer}>
          <Text
            style={[
              styles.sectionTitle,
              { color: colors.text, fontSize: size(18), fontFamily },
            ]}
          >
            Quick Actions
          </Text>

          <View style={[styles.actionsGrid, { gap: windowWidth * 0.05 }]}>
            {/* Songs Card */}
            <Animated.View style={cardAnimations.songsAction}>
              <Link href="/categories" asChild>
                <Pressable
                  style={[
                    styles.actionCard,
                    {
                      width: (windowWidth - 40 - (windowWidth * 0.05)) / 2,
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      shadowColor: darkMode ? "#000" : "#0f172a",
                    },
                  ]}
                >
                  <View style={[styles.cardIconContainer, { backgroundColor: 'rgba(56, 189, 248, 0.1)' }]}>
                    <Ionicons
                      name="musical-notes"
                      size={size(32)}
                      color="#38BDF8"
                    />
                  </View>
                  <Text
                    style={[
                      styles.actionText,
                      { color: colors.text, fontSize: size(16), fontFamily, marginTop: 8 },
                    ]}
                  >
                    Songs & Hymns
                  </Text>
                  <Text
                    style={[
                      styles.cardSubtitle,
                      { color: colors.mutedText, fontSize: size(12), fontFamily },
                    ]}
                  >
                    Worship Music Collection
                  </Text>
                </Pressable>
              </Link>
            </Animated.View>

            {/* Studies Card */}
            <Animated.View style={cardAnimations.studiesAction}>
              <Link href="/studies" asChild>
                <Pressable
                  style={[
                    styles.actionCard,
                    {
                      width: (windowWidth - 40 - (windowWidth * 0.05)) / 2,
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      shadowColor: darkMode ? "#000" : "#0f172a",
                    },
                  ]}
                >
                  <View style={[styles.cardIconContainer, { backgroundColor: 'rgba(139, 92, 246, 0.1)' }]}>
                    <Ionicons
                      name="library"
                      size={size(32)}
                      color="#8B5CF6"
                    />
                  </View>
                  <Text
                    style={[
                      styles.actionText,
                      { color: colors.text, fontSize: size(16), fontFamily, marginTop: 8 },
                    ]}
                  >
                    Studies
                  </Text>
                  <Text
                    style={[
                      styles.cardSubtitle,
                      { color: colors.mutedText, fontSize: size(12), fontFamily },
                    ]}
                  >
                    Biblical Research
                  </Text>
                </Pressable>
              </Link>
            </Animated.View>
          </View>
        </View>

        {/* Latest Studies Section */}
        <View style={styles.latestSection}>
          <View style={styles.sectionHeader}>
            <Text
              style={[
                styles.sectionTitle,
                { color: colors.text, fontSize: size(18), fontFamily },
              ]}
            >
              Featured Studies
            </Text>
            <Link href="/studies" asChild>
              <Pressable>
                <Text
                  style={[
                    styles.seeAll,
                    { color: colors.tint, fontSize: size(14), fontFamily },
                  ]}
                >
                  See All
                </Text>
              </Pressable>
            </Link>
          </View>

          {latestStudies.slice(0, NUM_STUDY_CARDS).map((study, index) => {
            const categoryColor = getCategoryColor(study.category || "Bible Study");
            const studyAnimation = getStudyAnimation(index);
            
            return (
              <Animated.View 
                key={study.id} 
                style={studyAnimation}
              >
                <Link
                  href={{
                    pathname: "/studies/[id]",
                    params: { id: study.id },
                  }}
                  asChild
                >
                  <Pressable
                    style={[
                      styles.studyCard,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                        shadowColor: darkMode ? "#000" : "#0f172a",
                      },
                    ]}
                  >
                    <View style={styles.studyCardHeader}>
                      <View style={styles.studyIndexContainer}>
                        <Text
                          style={[
                            styles.studyIndex,
                            { color: colors.mutedText, fontSize: size(12), fontFamily },
                          ]}
                        >
                          {String(index + 1).padStart(2, "0")}
                        </Text>
                      </View>
                      
                      <View style={styles.studyCategoryContainer}>
                        <View
                          style={[
                            styles.studyCategoryDot,
                            { backgroundColor: categoryColor },
                          ]}
                        />
                        <Text
                          style={[
                            styles.studyCategory,
                            {
                              color: colors.mutedText,
                              fontSize: size(12),
                              fontFamily,
                            },
                          ]}
                        >
                          {study.category || "Study"}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.studyContent}>
                      <Text
                        numberOfLines={2}
                        style={[
                          styles.studyTitle,
                          { color: colors.text, fontSize: size(16), fontFamily },
                        ]}
                      >
                        {study.title}
                      </Text>

                      {study.subtitle ? (
                        <Text
                          numberOfLines={1}
                          style={[
                            styles.studySubtitle,
                            {
                              color: colors.mutedText,
                              fontSize: size(13),
                              fontFamily,
                            },
                          ]}
                        >
                          {study.subtitle}
                        </Text>
                      ) : null}
                    </View>

                    <View style={styles.studyFooter}>
                      <Ionicons 
                        name="chevron-forward" 
                        size={size(16)} 
                        color={colors.mutedText} 
                      />
                    </View>
                  </Pressable>
                </Link>
              </Animated.View>
            );
          })}
        </View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    height: 200,
  },
  headerGradient: {
    flex: 1,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    justifyContent: "center",
  },
  headerContent: {
    alignItems: "center",
    paddingTop: 70,
  },
  logoContainer: {
    width: 90,
    height: 90,
    marginTop: -25,
    borderRadius: 45,
    backgroundColor: "rgba(6, 38, 94, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 3,
    borderColor: "rgba(96, 165, 250, 0.6)",
    overflow: "hidden",
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  appTitle: {
    fontWeight: "bold",
    color: "white",
    marginTop: 3,
    letterSpacing: 0.5,
  },
  poweredBy: {
    color: "rgba(191,219,254,0.95)",
    marginTop: 6,
    letterSpacing: 0.4,
    fontWeight: "600",
  },
  quoteCard: {
    marginHorizontal: 20,
    marginTop: -10,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    elevation: 5,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
  },
  quoteIcon: {
    marginBottom: 16,
  },
  quoteText: {
    textAlign: "center",
    fontWeight: "500",
    fontStyle: "italic",
    marginBottom: 20,
    lineHeight: 24,
  },
  quoteDots: {
    flexDirection: "row",
    gap: 8,
  },
  quoteDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  actionsContainer: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  sectionTitle: {
    fontWeight: "700",
    marginBottom: 16,
  },
  actionsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  actionCard: {
    borderRadius: 20,
    padding: 22,
    alignItems: "center",
    borderWidth: 1,
    elevation: 5,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    minHeight: 160,
    justifyContent: "center",
  },
  cardIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  actionText: {
    fontWeight: "700",
    textAlign: "center",
  },
  cardSubtitle: {
    textAlign: "center",
    marginTop: 6,
  },
  latestSection: {
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  seeAll: {
    fontWeight: "600",
  },
  studyCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
    elevation: 5,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
  },
  studyCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  studyIndexContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  studyIndex: {
    fontWeight: "600",
    opacity: 0.7,
  },
  studyCategoryContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  studyCategoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  studyCategory: {
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  studyContent: {
    marginBottom: 16,
  },
  studyTitle: {
    fontWeight: "700",
    marginBottom: 8,
    lineHeight: 22,
  },
  studySubtitle: {
    lineHeight: 18,
  },
  studyFooter: {
    alignItems: 'flex-end',
  },
});