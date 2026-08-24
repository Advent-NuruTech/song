import { Ionicons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { useAppTheme } from "@/hooks/use-app-theme";

export type CommunityComment = { id: string; userId: string; authorName: string; body: string; createdAt: string };

export function CommunityCommentsSheet({ visible, comments, currentUserId, loading, loadingMore, title = "Comments", onClose, onLoad, onLoadMore, onPost, onDelete, onReport, onGuidelines }: {
  visible: boolean; comments: CommunityComment[]; currentUserId?: string; loading?: boolean; loadingMore?: boolean; title?: string;
  onClose: () => void; onLoad: () => void | Promise<void>; onLoadMore?: () => void | Promise<void>;
  onPost: (body: string) => Promise<void>; onDelete: (comment: CommunityComment) => void; onReport?: (comment: CommunityComment) => void; onGuidelines?: () => void;
}) {
  const { colors, fontFamily } = useAppTheme();
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);
  useEffect(() => { if (visible) void onLoad(); }, [visible, onLoad]);

  const post = async () => {
    const clean = text.replace(/<[^>]*>/g, "").trim();
    if (!clean || posting) return;
    if (!currentUserId) { Alert.alert("Sign in required", "Sign in to join the conversation."); return; }
    setPosting(true);
    try { await onPost(clean); setText(""); } catch (error) { Alert.alert("Comment failed", (error as Error)?.message || "Please try again."); } finally { setPosting(false); }
  };

  return <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.overlay}>
      <View style={[styles.sheet, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View><Text style={[styles.title, { color: colors.text, fontFamily }]}>{title}</Text>{onGuidelines ? <Pressable onPress={onGuidelines}><Text style={[styles.guidelines, { color: colors.tint, fontFamily }]}>Community Guidelines</Text></Pressable> : null}</View>
          <Pressable accessibilityLabel="Close comments" onPress={onClose} hitSlop={8}><Ionicons name="close" size={28} color={colors.text} /></Pressable>
        </View>
        {loading ? <ActivityIndicator color={colors.tint} style={styles.loader} /> : <FlashList
          data={comments} keyExtractor={(value) => value.id} onEndReached={() => void onLoadMore?.()} onEndReachedThreshold={.4} contentContainerStyle={styles.list}
          renderItem={({ item }) => <View style={[styles.comment, { borderBottomColor: colors.border }]}>
            <View style={[styles.avatar, { backgroundColor: `${colors.tint}20` }]}><Text style={[styles.avatarText, { color: colors.tint, fontFamily }]}>{item.authorName.trim().charAt(0).toUpperCase() || "A"}</Text></View>
            <View style={styles.commentCopy}><Text style={[styles.author, { color: colors.text, fontFamily }]}>{item.authorName}</Text><Text style={[styles.body, { color: colors.text, fontFamily }]}>{item.body}</Text><Text style={[styles.date, { color: colors.mutedText, fontFamily }]}>{new Date(item.createdAt).toLocaleDateString()}</Text></View>
            <Pressable accessibilityLabel="Comment options" hitSlop={8} onPress={() => item.userId === currentUserId ? onDelete(item) : onReport?.(item)}><Ionicons name="ellipsis-horizontal" size={20} color={colors.mutedText} /></Pressable>
          </View>}
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="chatbubbles-outline" size={34} color={colors.mutedText} /><Text style={[styles.emptyTitle, { color: colors.text, fontFamily }]}>Start the conversation</Text><Text style={[styles.emptyCopy, { color: colors.mutedText, fontFamily }]}>Share a thoughtful and respectful response.</Text></View>}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.tint} /> : null}
        />}
        <View style={[styles.composer, { borderTopColor: colors.border }]}>
          <TextInput value={text} onChangeText={setText} maxLength={1000} placeholder={currentUserId ? "Add a respectful comment…" : "Sign in to comment"} placeholderTextColor={colors.mutedText} editable={Boolean(currentUserId) && !posting} multiline style={[styles.input, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border, fontFamily }]} />
          <Pressable accessibilityLabel="Post comment" onPress={() => void post()} disabled={!text.trim() || posting} style={[styles.send, { backgroundColor: colors.tint, opacity: !text.trim() || posting ? .45 : 1 }]}>{posting ? <ActivityIndicator color="#fff" /> : <Ionicons name="send" size={19} color="#fff" />}</Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,.55)", justifyContent: "flex-end" }, sheet: { height: "82%", borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, overflow: "hidden" },
  header: { minHeight: 70, paddingHorizontal: 18, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1 }, title: { fontSize: 19, fontWeight: "900" }, guidelines: { fontSize: 11, fontWeight: "700", marginTop: 3 }, loader: { flex: 1 }, list: { paddingHorizontal: 18 },
  comment: { flexDirection: "row", gap: 10, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth }, avatar: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" }, avatarText: { fontSize: 13, fontWeight: "900" }, commentCopy: { flex: 1 }, author: { fontSize: 12, fontWeight: "800" }, body: { fontSize: 14, lineHeight: 20, marginTop: 3 }, date: { fontSize: 10, marginTop: 5 },
  empty: { paddingVertical: 55, alignItems: "center" }, emptyTitle: { fontSize: 15, fontWeight: "900", marginTop: 10 }, emptyCopy: { fontSize: 11, marginTop: 4 },
  composer: { padding: 12, paddingBottom: Platform.OS === "ios" ? 28 : 12, borderTopWidth: 1, flexDirection: "row", alignItems: "flex-end", gap: 8 }, input: { flex: 1, minHeight: 44, maxHeight: 100, borderWidth: 1, borderRadius: 15, paddingHorizontal: 13, paddingVertical: 10 }, send: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
});
