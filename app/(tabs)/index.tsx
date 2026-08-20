import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Image,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";

import Animated, {
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";

import { ShareIconButton } from "@/components/share-icon-button";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useQuickFooter } from "@/src/context/QuickFooterContext";
import { shareStudyLink } from "@/src/services/shareService";

import {
  StudySummary,
  getCategoryColor as getStudyCategoryColor,
  getStudySummaries,
} from "@/src/services/studiesService";

const QUOTES = [
  "Thy word is a lamp unto my feet. — Psalm 119:105",
  "Study to show thyself approved unto God. — 2 Timothy 2:15",
  "The fear of the Lord is the beginning of wisdom. — Proverbs 9:10",
  "Sing unto the Lord a new song. — Psalm 96:1",
];

export default function HomeScreen() {
  const { colors, size, fontFamily } = useAppTheme();

  // keep context active without heavy realtime updates
  useQuickFooter();

  const [studies, setStudies] = useState<StudySummary[]>([]);
  const [quoteIndex, setQuoteIndex] = useState(0);

  const scrollY = useSharedValue(0);

  const currentQuote = useMemo(
    () => QUOTES[quoteIndex],
    [quoteIndex]
  );

  useEffect(() => {
    let mounted = true;

    getStudySummaries({ limit: 8 })
      .then((data) => {
        if (mounted) {
          setStudies(Array.isArray(data) ? data : []);
        }
      })
      .catch((error) => {
        console.log("Study loading error:", error);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % QUOTES.length);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const headerAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(scrollY.value, [0, 120], [1, 0]),
      transform: [
        {
          translateY: interpolate(scrollY.value, [0, 120], [0, -30]),
        },
      ],
    };
  });

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
        },
      ]}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor="#0B4AA6"
      />

      <Animated.ScrollView
        onScroll={handleScroll}
        scrollEventThrottle={32}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
        contentContainerStyle={styles.contentContainer}
      >
        {/* HERO */}
        <Animated.View
          style={[
            styles.hero,
            {
              backgroundColor: "#0B4AA6",
            },
            headerAnimatedStyle,
          ]}
        >
          <View style={styles.heroOverlay} />

          <Image
            source={require("@/assets/images/icon.png")}
            style={styles.logo}
            resizeMode="contain"
            fadeDuration={0}
          />

          <Text
            style={[
              styles.title,
              {
                fontSize: size(30),
                fontFamily,
              },
            ]}
          >
            Advent Pro
          </Text>

          <Text
            style={[
              styles.subtitle,
              {
                fontSize: size(13),
                fontFamily,
              },
            ]}
          >
            Present Truth Resource Center
          </Text>
        </Animated.View>

        {/* QUOTE */}
        <View
          style={[
            styles.quoteCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <Ionicons
            name="book-outline"
            size={22}
            color={colors.tint}
          />

          <Text
            style={[
              styles.quoteText,
              {
                color: colors.text,
                fontFamily,
                fontSize: size(15),
              },
            ]}
          >
            {currentQuote}
          </Text>
        </View>

        {/* QUICK ACTIONS */}
        <View style={styles.section}>
          <Text
            style={[
              styles.sectionTitle,
              {
                color: colors.text,
                fontFamily,
                fontSize: size(18),
              },
            ]}
          >
            Quick Access
          </Text>

          <View style={styles.grid}>
            <Link href="/categories" asChild>
              <Pressable
                android_ripple={{ color: "#d1d5db" }}
                style={[
                  styles.actionCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.iconWrap,
                    {
                      backgroundColor: "rgba(56,189,248,0.12)",
                    },
                  ]}
                >
                  <Ionicons
                    name="musical-notes"
                    size={28}
                    color="#38BDF8"
                  />
                </View>

                <Text
                  style={[
                    styles.cardTitle,
                    {
                      color: colors.text,
                      fontFamily,
                    },
                  ]}
                >
                  Songs
                </Text>

                <Text
                  style={[
                    styles.cardSub,
                    {
                      color: colors.mutedText,
                      fontFamily,
                    },
                  ]}
                >
                  Hymns & Worship
                </Text>
              </Pressable>
            </Link>

            <Link href="/studies" asChild>
              <Pressable
                android_ripple={{ color: "#d1d5db" }}
                style={[
                  styles.actionCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.iconWrap,
                    {
                      backgroundColor: "rgba(139,92,246,0.12)",
                    },
                  ]}
                >
                  <Ionicons
                    name="library"
                    size={28}
                    color="#8B5CF6"
                  />
                </View>

                <Text
                  style={[
                    styles.cardTitle,
                    {
                      color: colors.text,
                      fontFamily,
                    },
                  ]}
                >
                  Studies
                </Text>

                <Text
                  style={[
                    styles.cardSub,
                    {
                      color: colors.mutedText,
                      fontFamily,
                    },
                  ]}
                >
                  Bible Research
                </Text>
              </Pressable>
            </Link>

            <Link href="/bible" asChild>
              <Pressable
                android_ripple={{ color: "#d1d5db" }}
                style={[
                  styles.actionCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.iconWrap,
                    {
                      backgroundColor: "rgba(16,185,129,0.12)",
                    },
                  ]}
                >
                  <Ionicons
                    name="book"
                    size={28}
                    color="#10B981"
                  />
                </View>

                <Text
                  style={[
                    styles.cardTitle,
                    {
                      color: colors.text,
                      fontFamily,
                    },
                  ]}
                >
                  Bible
                </Text>

                <Text
                  style={[
                    styles.cardSub,
                    {
                      color: colors.mutedText,
                      fontFamily,
                    },
                  ]}
                >
                  Read Scripture
                </Text>
              </Pressable>
            </Link>
          </View>
        </View>

        {/* FEATURED STUDIES */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text
              style={[
                styles.sectionTitle,
                {
                  color: colors.text,
                  fontFamily,
                  fontSize: size(18),
                },
              ]}
            >
              Featured Studies
            </Text>

            <Link href="/studies" asChild>
              <Pressable>
                <Text
                  style={[
                    styles.seeAll,
                    {
                      color: colors.tint,
                      fontFamily,
                    },
                  ]}
                >
                  See all
                </Text>
              </Pressable>
            </Link>
          </View>

          {studies.map((study) => {
            const categoryColor = study.category
              ? getStudyCategoryColor(study.category)
              : colors.tint;

            return (
              <View
                key={study.id}
                style={styles.studyCardContainer}
              >
                <Link
                  href={{
                    pathname: "/studies/[id]",
                    params: { id: study.id },
                  }}
                  asChild
                >
                  <Pressable
                    android_ripple={{ color: "#d1d5db" }}
                    style={[
                      styles.studyCard,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <View style={styles.studyTop}>
                      <View
                        style={[
                          styles.categoryDot,
                          {
                            backgroundColor: categoryColor,
                          },
                        ]}
                      />

                      <Text
                        style={[
                          styles.studyCategory,
                          {
                            color: colors.mutedText,
                            fontFamily,
                          },
                        ]}
                      >
                        {study.category || "Study"}
                      </Text>
                    </View>

                    <Text
                      numberOfLines={2}
                      style={[
                        styles.studyTitle,
                        {
                          color: colors.text,
                          fontFamily,
                        },
                      ]}
                    >
                      {study.title}
                    </Text>

                    {!!study.subtitle && (
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.studySubtitle,
                          {
                            color: colors.mutedText,
                            fontFamily,
                          },
                        ]}
                      >
                        {study.subtitle}
                      </Text>
                    )}

                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={colors.mutedText}
                      style={styles.arrow}
                    />
                  </Pressable>
                </Link>

                <ShareIconButton
                  color={colors.tint}
                  borderColor={colors.border}
                  backgroundColor={colors.card}
                  onPress={() =>
                    void shareStudyLink({
                      id: study.id,
                      title: study.title,
                      category: study.category,
                      author: study.author,
                      content: study.excerpt,
                    })
                  }
                  style={styles.shareButton}
                />
              </View>
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

  contentContainer: {
    paddingBottom: 40,
  },

  hero: {
    height: 270,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },

  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.08)",
  },

  logo: {
    width: 90,
    height: 90,
    borderRadius: 24,
    marginBottom: 16,
  },

  title: {
    color: "white",
    fontWeight: "800",
    letterSpacing: 0.3,
  },

  subtitle: {
    color: "rgba(255,255,255,0.88)",
    marginTop: 6,
    fontWeight: "500",
  },

  quoteCard: {
    marginHorizontal: 20,
    marginTop: -32,
    borderRadius: 22,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
  },

  quoteText: {
    marginTop: 12,
    textAlign: "center",
    lineHeight: 22,
    fontStyle: "italic",
    fontWeight: "500",
  },

  section: {
    paddingHorizontal: 20,
    marginTop: 28,
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },

  sectionTitle: {
    fontWeight: "700",
  },

  seeAll: {
    fontWeight: "600",
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 16,
  },

  actionCard: {
    width: "48%",
    borderRadius: 22,
    borderWidth: 1,
    padding: 20,
    alignItems: "center",
    marginBottom: 12,
  },

  iconWrap: {
    width: 68,
    height: 68,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
  },

  cardSub: {
    fontSize: 12,
    marginTop: 5,
  },

  studyCardContainer: {
    marginBottom: 14,
    position: "relative",
  },

  studyCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
  },

  studyTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },

  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },

  studyCategory: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
  },

  studyTitle: {
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 22,
  },

  studySubtitle: {
    fontSize: 12,
    marginTop: 5,
  },

  arrow: {
    alignSelf: "flex-end",
    marginTop: 12,
  },

  shareButton: {
    position: "absolute",
    top: 10,
    right: 10,
  },
});