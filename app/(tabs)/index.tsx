import { Ionicons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StatusBar, StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";

import { DailyVerseCard } from "@/components/daily-verse-card";
import { ScriptureShareEditor } from "@/components/scripture-share-editor";
import { ShareIconButton } from "@/components/share-icon-button";
import { useAppTheme } from "@/hooks/use-app-theme";
import { MediaCard } from "@/src/features/media/components/MediaCard";
import { listMediaPage } from "@/src/features/media/mediaService";
import type { MediaItem } from "@/src/features/media/types";
import {
  type DailyVerse,
  getDailyVerse,
  isDailyVerseRead,
  markDailyVerseRead,
} from "@/src/services/dailyVerseService";
import {
  FALLBACK_DAILY_VERSE_TEMPLATE,
  getDailyVerseTemplate,
  type DailyVerseTemplate,
} from "@/src/services/dailyVerseTemplateService";
import { shareStudyLink } from "@/src/services/shareService";
import {
  type StudySummary,
  getCategoryColor as getStudyCategoryColor,
  getStudySummaries,
} from "@/src/services/studiesService";

const HOME_SECTION_LIMIT = 20;

export default function HomeScreen() {
  const { colors, size, fontFamily, darkMode } = useAppTheme();
  const router = useRouter();
  const [studies, setStudies] = useState<StudySummary[]>([]);
  const [videos, setVideos] = useState<MediaItem[]>([]);
  const [showExploreStudies, setShowExploreStudies] = useState(false);
  const [showExploreVideos, setShowExploreVideos] = useState(false);
  const [dailyVerse, setDailyVerse] = useState<DailyVerse>(() => getDailyVerse());
  const [dailyVerseTemplate, setDailyVerseTemplate] = useState<DailyVerseTemplate>(
    FALLBACK_DAILY_VERSE_TEMPLATE
  );
  const [dailyVerseVisible, setDailyVerseVisible] = useState(false);
  const [verseShareOpen, setVerseShareOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    getStudySummaries({ limit: HOME_SECTION_LIMIT + 1 })
      .then((data) => {
        if (!mounted) return;
        const availableStudies = Array.isArray(data) ? data : [];
        setStudies(availableStudies.slice(0, HOME_SECTION_LIMIT));
        setShowExploreStudies(availableStudies.length >= HOME_SECTION_LIMIT);
      })
      .catch((error) => console.log("Study loading error:", error));
    void listMediaPage("video")
      .then((page) => {
        if (!mounted) return;
        setVideos(page.items.slice(0, HOME_SECTION_LIMIT));
        setShowExploreVideos(page.items.length >= HOME_SECTION_LIMIT);
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    void getDailyVerseTemplate().then((template) => {
      if (active) setDailyVerseTemplate(template);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    void isDailyVerseRead(dailyVerse).then((read) => {
      if (active) setDailyVerseVisible(!read);
    });

    // Move to the next verse if the app remains open across a daily boundary.
    const delay = Math.max(1000, dailyVerse.expiresAt - Date.now() + 250);
    const timer = setTimeout(() => {
      if (active) setDailyVerse(getDailyVerse());
    }, delay);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [dailyVerse]);

  const dismissDailyVerse = () => {
    setDailyVerseVisible(false);
    void markDailyVerseRead(dailyVerse);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={darkMode ? "light-content" : "dark-content"}
        backgroundColor={darkMode ? "#0B1220" : "#FFFFFF"}
      />

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {dailyVerseVisible ? (
          <View style={styles.dailyVerseBlock}>
            <DailyVerseCard
              reference={dailyVerse.reference}
              text={dailyVerse.text}
              template={dailyVerseTemplate}
            />
            <View style={styles.verseActions}>
              <Pressable onPress={() => setVerseShareOpen(true)} style={styles.verseActionSecondary}>
                <Ionicons name="share-social-outline" size={17} color="#FFFFFF" />
                <Text style={[styles.verseActionText, { fontFamily }]}>Share with friends</Text>
              </Pressable>
              <Pressable onPress={dismissDailyVerse} style={styles.verseActionPrimary}>
                <Ionicons name="checkmark" size={18} color="#0B4AA6" />
                <Text style={[styles.verseReadText, { fontFamily }]}>I’ve read it</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text, fontFamily, fontSize: size(18) }]}>
            Quick Access
          </Text>
          <View style={styles.grid}>
            <QuickAction href="/categories" icon="musical-notes" color="#0EA5E9" title="Songs" />
            <QuickAction href="/studies" icon="library" color="#8B5CF6" title="Studies"  />
            <QuickAction href="/bible" icon="book" color="#10B981" title="Bible"  />
            <QuickAction href="/notes" icon="document-text" color="#F59E0B" title="Notes"  />
          </View>
        </View>

        {videos.length ? <View style={styles.mediaSection}>
          <View style={[styles.sectionHeader, styles.mediaHeader]}>
            <Text style={[styles.sectionTitle, { color: colors.text, fontFamily, fontSize: size(18) }]}>Featured Videos</Text>
          </View>
          {videos.map((video) => <MediaCard key={video.id} item={video} layout="compact" onPress={() => router.push({ pathname: "/media/[id]", params: { id: video.id } })} />)}
          {showExploreVideos ? <ExploreMore href="/media" label="Explore more videos" /> : null}
        </View> : null}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text, fontFamily, fontSize: size(18) }]}>
              Featured Studies
            </Text>
          </View>

          {studies.map((study) => {
            const categoryColor = study.category ? getStudyCategoryColor(study.category) : colors.tint;
            return (
              <View key={study.id} style={styles.studyCardContainer}>
                <Link href={{ pathname: "/studies/[id]", params: { id: study.id } }} asChild>
                  <Pressable
                    android_ripple={{ color: "#d1d5db" }}
                    style={[styles.studyCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  >
                    <View style={styles.studyTop}>
                      <View style={[styles.categoryDot, { backgroundColor: categoryColor }]} />
                      <Text style={[styles.studyCategory, { color: colors.mutedText, fontFamily }]}>
                        {study.category || "Study"}
                      </Text>
                    </View>
                    <Text
                      numberOfLines={2}
                      style={[styles.studyTitle, { color: colors.text, fontFamily, fontSize: size(15) }]}
                    >
                      {study.title}
                    </Text>
                    {!!study.subtitle && (
                      <Text numberOfLines={1} style={[styles.studySubtitle, { color: colors.mutedText, fontFamily }]}>
                        {study.subtitle}
                      </Text>
                    )}
                    <Ionicons name="chevron-forward" size={18} color={colors.mutedText} style={styles.arrow} />
                  </Pressable>
                </Link>
                <ShareIconButton
                  color={colors.tint}
                  borderColor={colors.border}
                  backgroundColor={colors.card}
                  onPress={() => void shareStudyLink({
                    id: study.id,
                    title: study.title,
                    category: study.category,
                    author: study.author,
                    content: study.excerpt,
                  })}
                  style={styles.shareButton}
                />
              </View>
            );
          })}
          {showExploreStudies ? <ExploreMore href="/studies" label="Explore more studies" /> : null}
        </View>
      </Animated.ScrollView>

      <ScriptureShareEditor
        visible={verseShareOpen}
        onClose={() => setVerseShareOpen(false)}
        reference={dailyVerse.reference}
        text={dailyVerse.text}
        template={dailyVerseTemplate}
      />
    </View>
  );
}

type QuickActionProps = {
  href: "/categories" | "/studies" | "/bible" | "/notes" | "/playlists";
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  title: string;

};

function QuickAction({ href, icon, color, title}: QuickActionProps) {
  const { colors, fontFamily } = useAppTheme();
  return (
    <Link href={href} asChild>
      <Pressable
        android_ripple={{ color: "#d1d5db" }}
        style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <View style={[styles.iconWrap, { backgroundColor: `${color}18` }]}>
          <Ionicons name={icon} size={27} color={color} />
        </View>
        <View style={styles.actionCopy}>
          <Text style={[styles.cardTitle, { color: colors.text, fontFamily }]}>{title}</Text>
          <Text style={[styles.cardSub, { color: colors.mutedText, fontFamily }]}></Text>
        </View>
      </Pressable>
    </Link>
  );
}

function ExploreMore({ href, label }: { href: "/media" | "/studies"; label: string }) {
  const { colors, fontFamily } = useAppTheme();
  return (
    <Link href={href} asChild>
      <Pressable
        accessibilityRole="link"
        style={({ pressed }) => [
          styles.exploreMore,
          { backgroundColor: colors.card, borderColor: colors.border },
          pressed && styles.exploreMorePressed,
        ]}
      >
        <Text style={[styles.exploreMoreText, { color: colors.tint, fontFamily }]}>{label}</Text>
        <Ionicons name="arrow-forward" size={18} color={colors.tint} />
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { paddingBottom: 44 },
  dailyVerseBlock: { backgroundColor: "#03245D", overflow: "hidden" },
  verseActions: {
    flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 20,
    paddingTop: 14, paddingBottom: 16,
  },
  verseActionSecondary: {
    flex: 1, minHeight: 44, borderWidth: 1, borderColor: "rgba(255,255,255,0.34)",
    borderRadius: 13, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7,
  },
  verseActionPrimary: {
    flex: 1, minHeight: 44, borderRadius: 13, backgroundColor: "#FFFFFF",
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7,
  },
  verseActionText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  verseReadText: { color: "#0B4AA6", fontSize: 13, fontWeight: "900" },
  section: { paddingHorizontal: 20, marginTop: 28 },
  mediaSection: { marginTop: 28 },
  mediaHeader: { paddingHorizontal: 20 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  sectionTitle: { fontWeight: "800", letterSpacing: -0.2 },
  exploreMore: {
    minHeight: 48, marginHorizontal: 20, marginTop: 6, borderRadius: 15, borderWidth: 1,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
  },
  exploreMorePressed: { opacity: 0.72 },
  exploreMoreText: { fontSize: 14, fontWeight: "800" },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginTop: 15 },
  actionCard: {
    width: "31.5%", minHeight: 122, borderRadius: 18, borderWidth: 1, padding: 10,
    alignItems: "center", justifyContent: "center", marginBottom: 10,
  },
  iconWrap: { width: 46, height: 46, borderRadius: 15, justifyContent: "center", alignItems: "center" },
  actionCopy: { marginTop: 8, alignItems: "center" },
  cardTitle: { fontSize: 14, fontWeight: "800", textAlign: "center" },
  cardSub: { fontSize: 9, marginTop: 3, lineHeight: 12, textAlign: "center" },
  studyCardContainer: { marginBottom: 14, position: "relative" },
  studyCard: { borderRadius: 20, borderWidth: 1, padding: 18 },
  studyTop: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  categoryDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  studyCategory: { fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  studyTitle: { fontWeight: "700", lineHeight: 22, paddingRight: 42 },
  studySubtitle: { fontSize: 12, marginTop: 5 },
  arrow: { alignSelf: "flex-end", marginTop: 12 },
  shareButton: { position: "absolute", top: 10, right: 10 },
});
