import { Link, Stack, useLocalSearchParams } from "expo-router";
import { ChevronLeft, Copy, Send, Share2 } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Linking,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { ShareIconButton } from "@/components/share-icon-button";
import { ShareSheet } from "@/components/share-sheet";
import { Toast } from "@/components/toast";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useQuickFooter } from "@/src/context/QuickFooterContext";
import {
  copyStudy,
  shareStudy,
  shareStudyLink,
} from "@/src/services/shareService";
import { Study, getCategoryColor, getStudyById } from "@/src/services/studiesService";

type InlineToken = {
  text: string;
  bold?: boolean;
  color?: string;
  link?: string;
};

function normalizeUrl(rawValue: string) {
  const raw = rawValue.trim();
  const trimmed = raw.replace(/[),.;!?]+$/g, "");
  const trailing = raw.slice(trimmed.length);
  const url = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  return {
    display: trimmed,
    url,
    trailing,
  };
}

function tokenizeWithLinks(text: string, bold?: boolean, color?: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  const linkRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = linkRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ text: text.slice(lastIndex, match.index), bold, color });
    }

    const linkValue = normalizeUrl(match[0]);
    tokens.push({
      text: linkValue.display,
      bold,
      color,
      link: linkValue.url,
    });

    if (linkValue.trailing) {
      tokens.push({ text: linkValue.trailing, bold, color });
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    tokens.push({ text: text.slice(lastIndex), bold, color });
  }

  return tokens;
}

function tokenizeInlineContent(input: string): InlineToken[] {
  const colorRegex = /\[color=(#[0-9a-fA-F]{3,8}|[a-zA-Z]+)\]([\s\S]*?)\[\/color\]/g;
  const tokens: InlineToken[] = [];
  let lastColorIndex = 0;
  let colorMatch: RegExpExecArray | null;

  const pushBoldAware = (text: string, color?: string) => {
    const boldRegex = /\*\*(.+?)\*\*/g;
    let lastBoldIndex = 0;
    let boldMatch: RegExpExecArray | null;

    while ((boldMatch = boldRegex.exec(text)) !== null) {
      if (boldMatch.index > lastBoldIndex) {
        tokens.push(...tokenizeWithLinks(text.slice(lastBoldIndex, boldMatch.index), false, color));
      }

      tokens.push(...tokenizeWithLinks(boldMatch[1], true, color));
      lastBoldIndex = boldMatch.index + boldMatch[0].length;
    }

    if (lastBoldIndex < text.length) {
      tokens.push(...tokenizeWithLinks(text.slice(lastBoldIndex), false, color));
    }
  };

  while ((colorMatch = colorRegex.exec(input)) !== null) {
    if (colorMatch.index > lastColorIndex) {
      pushBoldAware(input.slice(lastColorIndex, colorMatch.index));
    }

    pushBoldAware(colorMatch[2], colorMatch[1]);
    lastColorIndex = colorMatch.index + colorMatch[0].length;
  }

  if (lastColorIndex < input.length) {
    pushBoldAware(input.slice(lastColorIndex));
  }

  return tokens.filter((token) => token.text.length > 0);
}

function renderInlineText({
  text,
  baseStyle,
  tintColor,
  keyPrefix,
}: {
  text: string;
  baseStyle: object;
  tintColor: string;
  keyPrefix: string;
}) {
  const tokens = tokenizeInlineContent(text);

  return (
    <Text style={baseStyle}>
      {tokens.map((token, index) => {
        const tokenStyle: object[] = [];
        if (token.bold) tokenStyle.push(styles.boldText);
        if (token.color) tokenStyle.push({ color: token.color });
        if (token.link) tokenStyle.push(styles.inlineLink, { color: tintColor });

        return (
          <Text
            key={`${keyPrefix}-${index}`}
            style={tokenStyle}
            onPress={
              token.link
                ? () => {
                    void Linking.openURL(token.link as string);
                  }
                : undefined
            }
          >
            {token.text}
          </Text>
        );
      })}
    </Text>
  );
}

function renderStudyContent(
  text: string,
  colors: any,
  size: (value: number) => number,
  fontFamily: string
) {
  if (!text) return null;

  const lines = text.split("\n");
  const elements: React.JSX.Element[] = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (!listItems.length) return;

    elements.push(
      <View key={`list-${elements.length}`} style={styles.listContainer}>
        {listItems.map((item, index) => (
          <View key={`list-${index}`} style={styles.listItem}>
            <Text style={[styles.listBullet, { color: colors.mutedText }]}>•</Text>
            {renderInlineText({
              text: item,
              tintColor: colors.tint,
              keyPrefix: `list-inline-${index}`,
              baseStyle: {
                ...styles.listText,
                color: colors.text,
                fontSize: size(16),
                fontFamily,
                lineHeight: size(28),
              },
            })}
          </View>
        ))}
      </View>
    );

    listItems = [];
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();

    if (!line) {
      flushList();
      elements.push(<View key={`space-${i}`} style={styles.paragraphSpacing} />);
      continue;
    }

    if (line.startsWith("## ")) {
      flushList();
      elements.push(
        <View key={`h2-${i}`}>
          {renderInlineText({
            text: line.slice(3),
            tintColor: colors.tint,
            keyPrefix: `h2-inline-${i}`,
            baseStyle: {
              ...styles.heading2,
              color: colors.text,
              fontSize: size(24),
              fontFamily,
            },
          })}
        </View>
      );
      continue;
    }

    if (line.startsWith("### ")) {
      flushList();
      elements.push(
        <View key={`h3-${i}`}>
          {renderInlineText({
            text: line.slice(4),
            tintColor: colors.tint,
            keyPrefix: `h3-inline-${i}`,
            baseStyle: {
              ...styles.heading3,
              color: colors.text,
              fontSize: size(20),
              fontFamily,
            },
          })}
        </View>
      );
      continue;
    }

    if (/^\d+\.\s/.test(line)) {
      listItems.push(line.replace(/^\d+\.\s/, ""));
      continue;
    }

    if (line.startsWith("- ") || line.startsWith("* ")) {
      listItems.push(line.slice(2));
      continue;
    }

    if (listItems.length) {
      listItems[listItems.length - 1] = `${listItems[listItems.length - 1]} ${line}`;
      continue;
    }

    elements.push(
      <View key={`p-${i}`}>
        {renderInlineText({
          text: line,
          tintColor: colors.tint,
          keyPrefix: `para-inline-${i}`,
          baseStyle: {
            ...styles.paragraph,
            color: colors.text,
            fontSize: size(16),
            fontFamily,
            lineHeight: size(28),
          },
        })}
      </View>
    );
  }

  flushList();
  return elements;
}

export default function StudyDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { colors, size, fontFamily, darkMode } = useAppTheme();
  const { reportScroll } = useQuickFooter();
  const [study, setStudy] = useState<Study | null>(null);
  const [loading, setLoading] = useState(true);
  const [showHeader, setShowHeader] = useState(true);
  const [shareOpen, setShareOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const scrollY = useRef(new Animated.Value(0)).current;

  const handleCopyStudy = useCallback(async () => {
    if (!study) return;
    const ok = await copyStudy(study);
    setToast(ok ? "Study copied" : "Couldn't copy");
  }, [study]);

  useEffect(() => {
    let isMounted = true;

    const loadStudy = async () => {
      try {
        if (!id) return;

        const data = await getStudyById(id);
        if (isMounted) {
          setStudy(data);
        }
      } catch (error) {
        console.error("Failed to load study:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void loadStudy();
    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    reportScroll(offsetY);
    setShowHeader(offsetY < 100);
    scrollY.setValue(offsetY);
  };

  if (loading) {
    return (
      <>
        <Stack.Screen
          options={{
            headerShown: false,
            title: "",
            headerTransparent: true,
          }}
        />
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <StatusBar
            barStyle={darkMode ? "light-content" : "dark-content"}
            backgroundColor={colors.background}
          />
          <View style={styles.loadingContainer}>
            <Text
              style={[
                styles.loadingText,
                { color: colors.mutedText, fontSize: size(16), fontFamily },
              ]}
            >
              Loading study...
            </Text>
          </View>
        </View>
      </>
    );
  }

  if (!study) {
    return (
      <>
        <Stack.Screen
          options={{
            headerShown: false,
            title: "",
          }}
        />
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <StatusBar
            barStyle={darkMode ? "light-content" : "dark-content"}
            backgroundColor={colors.background}
          />
          <View style={styles.errorContainer}>
            <Text
              style={[
                styles.errorText,
                { color: colors.mutedText, fontSize: size(16), fontFamily },
              ]}
            >
              Study not found
            </Text>
          </View>
        </View>
      </>
    );
  }

  const color = getCategoryColor(study.category);
  const wordCount = study.wordCount || 0;
  const readingTime = Math.ceil(wordCount / 250);

  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, -200],
    extrapolate: "clamp",
  });

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 80, 100],
    outputRange: [1, 0.5, 0],
    extrapolate: "clamp",
  });

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
          title: "",
          headerTransparent: true,
        }}
      />
      <StatusBar
        barStyle={darkMode ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />

      <Animated.View
        style={[
          styles.headerContainer,
          {
            backgroundColor: colors.card,
            transform: [{ translateY: headerTranslateY }],
            opacity: headerOpacity,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Link href="/studies" asChild>
          <Pressable style={styles.backButton}>
            <ChevronLeft size={size(24)} color={colors.text} />
          </Pressable>
        </Link>

        <ShareIconButton
          color={colors.tint}
          borderColor={colors.border}
          backgroundColor={colors.card}
          onPress={() => setShareOpen(true)}
          style={styles.shareButton}
          size={36}
          iconSize={17}
        />

        <View style={styles.headerContent}>
          <View style={styles.categoryRow}>
            <View style={[styles.categoryDot, { backgroundColor: color }]} />
            <Text
              style={[
                styles.categoryText,
                {
                  color: colors.mutedText,
                  fontSize: size(14),
                  fontFamily,
                },
              ]}
            >
              {study.category}
            </Text>
          </View>

          <Text
            style={[
              styles.studyTitle,
              {
                color: colors.text,
                fontSize: size(24),
                fontFamily,
              },
            ]}
            numberOfLines={2}
          >
            {study.title}
          </Text>

          {study.subtitle ? (
            <Text
              style={[
                styles.studySubtitle,
                {
                  color: colors.mutedText,
                  fontSize: size(16),
                  fontFamily,
                },
              ]}
              numberOfLines={2}
            >
              {study.subtitle}
            </Text>
          ) : null}
        </View>
      </Animated.View>

      <ScrollView
        style={[styles.scrollContainer, { backgroundColor: colors.background }]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        <View style={styles.content}>
          {renderStudyContent(study.content, colors, size, fontFamily)}

          <View style={[styles.footerMetadata, { borderTopColor: colors.border }]}> 
            {study.author ? (
              <Text
                style={[
                  styles.author,
                  {
                    color: colors.text,
                    fontSize: size(14),
                    fontFamily,
                  },
                ]}
              >
                By {study.author}
              </Text>
            ) : null}

            {(wordCount > 0 || readingTime > 0) && (
              <Text
                style={[
                  styles.stats,
                  {
                    color: colors.subtleText,
                    fontSize: size(13),
                    fontFamily,
                  },
                ]}
              >
                {readingTime > 0 && `${readingTime} min read`}
                {wordCount > 0 && readingTime > 0 && " • "}
                {wordCount > 0 && `${wordCount.toLocaleString()} words`}
              </Text>
            )}
          </View>

          <View style={styles.footer}>
            <Text
              style={[
                styles.footerText,
                {
                  color: colors.mutedText,
                  fontSize: size(12),
                  fontFamily,
                },
              ]}
            >
              Last updated: {new Date(study.updatedAt || study.createdAt).toLocaleDateString()}
            </Text>
          </View>
        </View>
      </ScrollView>

      {!showHeader && (
        <Link href="/studies" asChild>
          <Pressable
            style={[
              styles.floatingBackButton,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                shadowColor: darkMode ? "#000" : "#000",
              },
            ]}
          >
            <ChevronLeft size={size(20)} color={colors.text} />
            <Text
              style={[
                styles.floatingBackText,
                { color: colors.text, fontSize: size(14), fontFamily },
              ]}
            >
              Back
            </Text>
          </Pressable>
        </Link>
      )}

      <ShareSheet
        visible={shareOpen}
        onClose={() => setShareOpen(false)}
        title={study.title}
        subtitle={study.category}
        options={[
          {
            key: "share",
            label: "Share full study",
            hint: "Send the whole reading",
            icon: Share2,
            onPress: () =>
              void shareStudy({
                title: study.title,
                subtitle: study.subtitle,
                category: study.category,
                author: study.author,
                content: study.content,
              }),
          },
          {
            key: "copy",
            label: "Copy study text",
            hint: "Paste anywhere",
            icon: Copy,
            onPress: () => void handleCopyStudy(),
          },
          {
            key: "recommend",
            label: "Recommend this study",
            hint: "Share title only",
            icon: Send,
            onPress: () =>
              void shareStudyLink({
                title: study.title,
                category: study.category,
                author: study.author,
              }),
          },
        ]}
      />

      <Toast message={toast} onHide={() => setToast(null)} />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: Platform.OS === "ios" ? 100 : 80,
  },
  loadingText: {
    fontWeight: "500",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: Platform.OS === "ios" ? 100 : 80,
  },
  errorText: {
    fontWeight: "500",
  },
  headerContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    paddingTop: Platform.OS === "ios" ? 90 : 70,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  backButton: {
    position: "absolute",
    left: 20,
    top: Platform.OS === "ios" ? 90 : 70,
    zIndex: 1,
    padding: 8,
  },
  shareButton: {
    position: "absolute",
    right: 20,
    top: Platform.OS === "ios" ? 90 : 70,
    zIndex: 1,
  },
  headerContent: {
    alignItems: "center",
    marginTop: 8,
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  categoryText: {
    fontWeight: "600",
  },
  studyTitle: {
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
    lineHeight: 30,
  },
  studySubtitle: {
    textAlign: "center",
    lineHeight: 22,
    fontWeight: "500",
    marginBottom: 16,
  },
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    paddingTop: Platform.OS === "ios" ? 200 : 250,
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  content: {
    maxWidth: 800,
    alignSelf: "center",
    width: "100%",
  },
  heading2: {
    fontWeight: "700",
    marginTop: 32,
    marginBottom: 16,
    lineHeight: 32,
  },
  heading3: {
    fontWeight: "600",
    marginTop: 24,
    marginBottom: 12,
    lineHeight: 26,
  },
  paragraph: {
    marginBottom: 20,
    textAlign: "justify",
  },
  paragraphSpacing: {
    height: 16,
  },
  listContainer: {
    marginBottom: 20,
    marginLeft: 8,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  listBullet: {
    width: 24,
    fontSize: 16,
    fontWeight: "600",
  },
  listText: {
    flex: 1,
    textAlign: "justify",
  },
  boldText: {
    fontWeight: "700",
  },
  inlineLink: {
    textDecorationLine: "underline",
    fontWeight: "700",
  },
  footerMetadata: {
    marginTop: 40,
    paddingTop: 20,
    borderTopWidth: 1,
    alignItems: "center",
    gap: 8,
  },
  author: {
    fontWeight: "500",
  },
  stats: {
    fontWeight: "500",
  },
  footer: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
    alignItems: "center",
  },
  footerText: {
    fontWeight: "500",
  },
  floatingBackButton: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 30,
    left: 80,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    zIndex: 200,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  floatingBackText: {
    fontWeight: "600",
    marginLeft: 4,
  },
});



