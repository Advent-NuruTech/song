import { Link, Stack, router, useLocalSearchParams } from "expo-router";
import { ChevronLeft, Copy, Heart, MessageCircle, Send, Share2 } from "@/components/icons";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
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
import { ScriptureShareEditor } from "@/components/scripture-share-editor";
import { isRichStudyHtml, StudyRichContent } from "@/components/study-rich-content";
import { Toast } from "@/components/toast";
import { CommunityCommentsSheet, type CommunityComment } from "@/components/community-comments-sheet";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useAuth } from "@/src/auth/AuthContext";
import { useQuickFooter } from "@/src/context/QuickFooterContext";
import {
  copyStudy,
  shareStudy,
  shareStudyLink,
  stripStudyMarkup,
} from "@/src/services/shareService";
import { Study, getCategoryColor, getStudyById } from "@/src/services/studiesService";
import {
  StudyEngagement,
  addStudyComment,
  deleteStudyComment,
  getStudyEngagement,
  recordStudyShare,
  toggleStudyLike,
} from "@/src/services/studyEngagementService";
import { recordStudyView } from "@/src/services/studyDiscoveryService";

const EMPTY_ENGAGEMENT: StudyEngagement = {
  likeCount: 0,
  shareCount: 0,
  commentCount: 0,
  likedByMe: false,
  comments: [],
};

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
  const auth = useAuth();
  const [study, setStudy] = useState<Study | null>(null);
  const [loading, setLoading] = useState(true);
  const [shareOpen, setShareOpen] = useState(false);
  const [selectionOpen, setSelectionOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [engagement, setEngagement] = useState<StudyEngagement>(EMPTY_ENGAGEMENT);
  const [engagementBusy, setEngagementBusy] = useState(false);

  const loadEngagement = useCallback(async () => {
    if (!id) return;
    try {
      setEngagement(await getStudyEngagement(id));
    } catch (error) {
      console.warn("Failed to load study engagement:", error);
    }
  }, [id]);

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
          if (data) void recordStudyView(data.id).catch(() => undefined);
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

  useEffect(() => {
    void loadEngagement();
  }, [auth.user?.id, loadEngagement]);

  const openAccount = (reason: string) => Alert.alert(
    "Join the conversation",
    reason,
    [
      { text: "Not now", style: "cancel" },
      { text: "Sign in", onPress: () => router.push("/account") },
    ]
  );

  const handleLike = async () => {
    if (!id) return;
    if (!auth.user) return openAccount("Sign in or create a free account to like this study.");
    setEngagementBusy(true);
    try {
      const result = await toggleStudyLike(id);
      setEngagement((current) => ({ ...current, likedByMe: result.liked, likeCount: Number(result.likeCount) }));
    } catch (error) {
      Alert.alert("Couldn’t update like", (error as Error).message);
    } finally {
      setEngagementBusy(false);
    }
  };

  const handleDeleteComment = (commentId: string) => Alert.alert(
    "Delete comment?",
    "This removes your comment from the conversation.",
    [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        try { await deleteStudyComment(commentId); await loadEngagement(); }
        catch (error) { Alert.alert("Couldn’t delete comment", (error as Error).message); }
      } },
    ]
  );

  const handleTrackedShare = async (kind: "full" | "recommend") => {
    if (!study) return;
    const payload = { id: study.id, title: study.title, subtitle: study.subtitle, category: study.category, author: study.author, content: study.content };
    const shared = kind === "full" ? await shareStudy(payload) : await shareStudyLink(payload);
    if (!shared) return;
    try {
      const total = await recordStudyShare(study.id);
      setEngagement((current) => ({ ...current, shareCount: total || current.shareCount + 1 }));
    } catch (error) {
      console.warn("Share completed but its count could not be updated:", error);
    }
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    reportScroll(offsetY);
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

      <View
        style={[
          styles.headerContainer,
          {
            backgroundColor: colors.card,
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
          <Text style={[styles.studyTitle, { color: colors.text, fontSize: size(15), fontFamily }]} numberOfLines={1}>{study.title}</Text>
          <View style={styles.categoryRow}><View style={[styles.categoryDot, { backgroundColor: color }]} /><Text style={[styles.categoryText, { color: colors.mutedText, fontSize: size(10), fontFamily }]} numberOfLines={1}>{study.category}</Text></View>
        </View>
      </View>

      <ScrollView
        style={[styles.scrollContainer, { backgroundColor: colors.background }]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        <View style={styles.content}>
          {isRichStudyHtml(study.content) ? (
            <StudyRichContent
              html={study.content}
              colors={colors}
              size={size}
              fontFamily={fontFamily}
            />
          ) : (
            renderStudyContent(study.content, colors, size, fontFamily)
          )}

          <View style={[styles.engagementCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.engagementTitle, { color: colors.text, fontFamily, fontSize: size(20) }]}>Continue the conversation</Text>
            <Text style={[styles.engagementSubtitle, { color: colors.mutedText, fontFamily, fontSize: size(13) }]}>Let the community know what spoke to you.</Text>

            <View style={[styles.actionBar, { borderColor: colors.border }]}>
              <Pressable disabled={engagementBusy} onPress={() => void handleLike()} style={styles.engagementAction} accessibilityLabel={engagement.likedByMe ? "Unlike this study" : "Like this study"}>
                <Heart size={size(21)} color={engagement.likedByMe ? "#E5484D" : colors.mutedText} fill={engagement.likedByMe ? "#E5484D" : "transparent"} />
                <Text style={[styles.actionCount, { color: engagement.likedByMe ? "#E5484D" : colors.text, fontFamily }]}>{engagement.likeCount.toLocaleString()}</Text>
                <Text style={[styles.actionLabel, { color: colors.mutedText, fontFamily }]}>Likes</Text>
              </Pressable>
              <View style={[styles.actionDivider, { backgroundColor: colors.border }]} />
              <View style={styles.engagementAction}>
                <MessageCircle size={size(21)} color={colors.mutedText} />
                <Text style={[styles.actionCount, { color: colors.text, fontFamily }]}>{engagement.commentCount.toLocaleString()}</Text>
                <Text style={[styles.actionLabel, { color: colors.mutedText, fontFamily }]}>Comments</Text>
              </View>
              <View style={[styles.actionDivider, { backgroundColor: colors.border }]} />
              <Pressable onPress={() => setShareOpen(true)} style={styles.engagementAction} accessibilityLabel="Share this study">
                <Share2 size={size(21)} color={colors.mutedText} />
                <Text style={[styles.actionCount, { color: colors.text, fontFamily }]}>{engagement.shareCount.toLocaleString()}</Text>
                <Text style={[styles.actionLabel, { color: colors.mutedText, fontFamily }]}>Shares</Text>
              </Pressable>
            </View>

            <View style={styles.commentsHeader}>
              <Text style={[styles.commentsTitle, { color: colors.text, fontFamily, fontSize: size(17) }]}>Reader comments</Text>
              <Text style={[styles.commentsCount, { color: colors.mutedText, fontFamily }]}>{engagement.commentCount}</Text>
            </View>
            <Pressable onPress={() => setCommentsOpen(true)} style={[styles.openComments, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <View style={[styles.commentAvatar, { backgroundColor: `${colors.tint}18` }]}><MessageCircle size={18} color={colors.tint} /></View>
              <View style={{ flex: 1 }}><Text style={[styles.signInPromptTitle, { color: colors.text, fontFamily }]}>Join the discussion</Text><Text style={[styles.signInPromptCopy, { color: colors.mutedText, fontFamily }]}>{engagement.commentCount ? `${engagement.commentCount} thoughtful responses` : "Be the first to comment"}</Text></View>
              <Text style={[styles.signInPromptAction, { color: colors.tint, fontFamily }]}>Open</Text>
            </Pressable>
          </View>

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

      <CommunityCommentsSheet
        visible={commentsOpen}
        title="Study comments"
        comments={engagement.comments}
        currentUserId={auth.user?.id}
        onClose={() => setCommentsOpen(false)}
        onLoad={loadEngagement}
        onPost={async (body) => { if (!id) return; await addStudyComment(id, body); await loadEngagement(); setToast("Comment posted"); }}
        onDelete={(item: CommunityComment) => handleDeleteComment(item.id)}
        onGuidelines={() => { setCommentsOpen(false); router.push("/terms"); }}
      />

      <ShareSheet
        visible={shareOpen}
        onClose={() => setShareOpen(false)}
        title={study.title}
        subtitle={study.category}
        options={[
          {
            key: "exact",
            label: "Choose exact text",
            hint: "Select a sentence, paragraph, or any excerpt",
            icon: Copy,
            onPress: () => setSelectionOpen(true),
          },
          {
            key: "share",
            label: "Share full study",
            hint: "Full text with read more link",
            icon: Share2,
            onPress: () => void handleTrackedShare("full"),
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
            hint: "Preview + link to read more",
            icon: Send,
            onPress: () => void handleTrackedShare("recommend"),
          },
        ]}
      />

      <ScriptureShareEditor
        visible={selectionOpen}
        onClose={() => setSelectionOpen(false)}
        reference={study.title}
        text={stripStudyMarkup(study.content)}
        onCopied={() => setToast("Selected study text copied")}
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
    height: 64,
    paddingHorizontal: 58,
    justifyContent: "center",
    borderBottomWidth: 1,
  },
  backButton: {
    position: "absolute",
    left: 10,
    top: 10,
    zIndex: 1,
    padding: 8,
  },
  shareButton: {
    position: "absolute",
    right: 12,
    top: 14,
    zIndex: 1,
  },
  headerContent: {
    justifyContent: "center",
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
    gap: 6,
  },
  categoryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  categoryText: {
    fontWeight: "600",
  },
  studyTitle: {
    fontWeight: "800",
    lineHeight: 20,
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
    paddingTop: 84,
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
  engagementCard: {
    marginTop: 42,
    borderWidth: 1,
    borderRadius: 22,
    padding: 20,
  },
  engagementTitle: { fontWeight: "800" },
  engagementSubtitle: { marginTop: 5, lineHeight: 19 },
  actionBar: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 16,
    marginTop: 18,
    paddingVertical: 13,
  },
  engagementAction: {
    flex: 1,
    minHeight: 34,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
  },
  actionCount: { fontSize: 14, fontWeight: "800" },
  actionLabel: { width: "100%", textAlign: "center", fontSize: 10, fontWeight: "600" },
  actionDivider: { width: 1, height: 36 },
  commentsHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 25, marginBottom: 12 },
  commentsTitle: { fontWeight: "800" },
  commentsCount: { fontSize: 12, fontWeight: "800" },
  openComments: { minHeight: 66, flexDirection: "row", alignItems: "center", gap: 11, borderWidth: 1, borderRadius: 16, padding: 13 },
  composer: { flexDirection: "row", alignItems: "flex-start", gap: 11, borderWidth: 1, borderRadius: 16, padding: 12 },
  composerBody: { flex: 1 },
  commentAvatar: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  commentAvatarText: { fontSize: 13, fontWeight: "900" },
  commentInput: { minHeight: 54, maxHeight: 140, paddingTop: 1, textAlignVertical: "top", lineHeight: 20 },
  composerFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 7 },
  characterCount: { fontSize: 10 },
  postButton: { minHeight: 34, paddingHorizontal: 14, borderRadius: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  postButtonText: { fontSize: 12, fontWeight: "900" },
  signInPrompt: { flexDirection: "row", alignItems: "center", gap: 11, borderWidth: 1, borderRadius: 15, padding: 14 },
  signInPromptTitle: { fontSize: 13, fontWeight: "800" },
  signInPromptCopy: { fontSize: 11, marginTop: 2 },
  signInPromptAction: { fontSize: 12, fontWeight: "900" },
  commentList: { marginTop: 8 },
  commentRow: { flexDirection: "row", alignItems: "flex-start", gap: 11, borderTopWidth: 1, paddingVertical: 16 },
  commentBody: { flex: 1 },
  commentMeta: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 7 },
  commentAuthor: { fontSize: 13, fontWeight: "800" },
  commentDate: { fontSize: 10 },
  commentText: { lineHeight: 21, marginTop: 5 },
  deleteComment: { padding: 4 },
  emptyComments: { textAlign: "center", fontSize: 12, lineHeight: 18, paddingVertical: 20 },
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
