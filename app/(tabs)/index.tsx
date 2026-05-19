import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { useEffect, useState } from "react";
import {
  Image,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";

import Animated, {
  FadeInDown,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";

import { useAppTheme } from "@/hooks/use-app-theme";
import { useQuickFooter } from "@/src/context/QuickFooterContext";
import { ShareIconButton } from "@/components/share-icon-button";
import { shareStudy } from "@/src/services/shareService";

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
  const { colors, size, fontFamily, darkMode } = useAppTheme();
  const { reportScroll } = useQuickFooter();

  const [studies, setStudies] = useState<StudySummary[]>([]);
  const [quoteIndex, setQuoteIndex] = useState(0);

  const scrollY = useSharedValue(0);

  useEffect(() => {
    getStudySummaries({ limit: 5 })
      .then(setStudies)
      .catch(console.error);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % QUOTES.length);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const handleScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
      reportScroll(event.contentOffset.y);
    },
  });

  const headerAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(scrollY.value, [0, 120], [1, 0]),
      transform: [
        {
          translateY: interpolate(scrollY.value, [0, 120], [0, -40]),
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
      <StatusBar barStyle="light-content" backgroundColor="#0B4AA6" />
      <Animated.ScrollView
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
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
        <Animated.View
          entering={FadeInDown.delay(100).springify()}
          style={[
            styles.quoteCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              shadowColor: darkMode ? "#000" : "#111827",
            },
          ]}
        >
          <Ionicons
            name="book-outline"
            size={24}
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
            {QUOTES[quoteIndex]}
          </Text>
        </Animated.View>

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
            <Animated.View entering={FadeInDown.delay(200).springify()}>
              <Link href="/categories" asChild>
                <Pressable
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
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(300).springify()}>
              <Link href="/studies" asChild>
                <Pressable
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
            </Animated.View>
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

          {studies.map((study, index) => {
            const categoryColor = study.category
              ? getStudyCategoryColor(study.category)
              : colors.tint;

            return (
              <Animated.View
                key={study.id}
                entering={FadeInDown.delay(400 + index * 100).springify()}
              >
                <View style={styles.studyCardContainer}>
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
                      void shareStudy({
                        title: study.title,
                        category: study.category,
                        author: study.author,
                      })
                    }
                    style={styles.shareButton}
                  />
                </View>
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

  contentContainer: {
    paddingBottom: 40,
  },

  hero: {
    height: 280,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },

  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.12)",
  },

  logo: {
    width: 90,
    height: 90,
    borderRadius: 30,
    marginBottom: 18,
  },

  title: {
    color: "white",
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  subtitle: {
    color: "rgba(255,255,255,0.88)",
    marginTop: 8,
    fontWeight: "500",
  },

  quoteCard: {
    marginHorizontal: 20,
    marginTop: -36,
    borderRadius: 24,
    padding: 22,
    alignItems: "center",
    borderWidth: 1,
    elevation: 4,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: {
      width: 0,
      height: 6,
    },
  },

  quoteText: {
    marginTop: 14,
    textAlign: "center",
    lineHeight: 24,
    fontStyle: "italic",
    fontWeight: "500",
  },

  section: {
    paddingHorizontal: 20,
    marginTop: 30,
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },

  sectionTitle: {
    fontWeight: "700",
  },

  seeAll: {
    fontWeight: "600",
  },

  grid: {
    flexDirection: "row",
    gap: 16,
  },

  actionCard: {
    width: 165,
    borderRadius: 24,
    borderWidth: 1,
    padding: 22,
    alignItems: "center",
  },

  iconWrap: {
    width: 70,
    height: 70,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },

  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
  },

  cardSub: {
    fontSize: 12,
    marginTop: 6,
  },

  studyCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
  },
  studyCardContainer: {
    marginBottom: 14,
    position: "relative",
  },

  studyTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },

  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },

  studyCategory: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },

  studyTitle: {
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 24,
  },

  studySubtitle: {
    fontSize: 13,
    marginTop: 6,
  },

  arrow: {
    alignSelf: "flex-end",
    marginTop: 14,
  },
  shareButton: {
    position: "absolute",
    top: 10,
    right: 10,
  },
});
