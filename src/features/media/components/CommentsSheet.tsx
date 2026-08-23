import { FlashList } from "@shopify/flash-list";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";

import { useAppTheme } from "@/hooks/use-app-theme";
import { useAuth } from "@/src/auth/AuthContext";
import { addMediaComment, deleteMediaComment, listMediaComments, reportMediaComment } from "../mediaService";
import type { CommentCursor, MediaComment, MediaItem } from "../types";
import { stripUnsafeComment } from "../utils";

export function CommentsSheet({ visible, item, onClose, onCountChange }: { visible: boolean; item: MediaItem; onClose: () => void; onCountChange?: (value: number) => void }) {
  const { colors, fontFamily } = useAppTheme();
  const auth = useAuth();
  const router = useRouter();
  const [comments, setComments] = useState<MediaComment[]>([]);
  const [cursor, setCursor] = useState<CommentCursor | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const page = await listMediaComments(item.id); setComments(page.items); setCursor(page.nextCursor); }
    catch (reason) { Alert.alert("Comments unavailable", (reason as Error)?.message || "Please try again."); }
    finally { setLoading(false); }
  }, [item.id]);

  useEffect(() => { if (visible) void load(); }, [load, visible]);

  const more = async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try { const page = await listMediaComments(item.id, cursor); setComments((current) => [...current, ...page.items]); setCursor(page.nextCursor); }
    finally { setLoadingMore(false); }
  };

  const post = async () => {
    if (!auth.user) { Alert.alert("Sign in required", "Sign in to join the conversation."); return; }
    const clean = stripUnsafeComment(text);
    if (!clean || posting) return;
    setPosting(true);
    try { await addMediaComment(item.id, clean); setText(""); onCountChange?.(item.commentCount + 1); await load(); }
    catch (reason) { Alert.alert("Comment failed", (reason as Error)?.message || "Please try again."); }
    finally { setPosting(false); }
  };

  const remove = (comment: MediaComment) => Alert.alert("Delete comment?", "This cannot be undone.", [
    { text: "Cancel", style: "cancel" },
    { text: "Delete", style: "destructive", onPress: () => void deleteMediaComment(comment.id).then(() => { setComments((all) => all.filter((value) => value.id !== comment.id)); onCountChange?.(Math.max(0, item.commentCount - 1)); }).catch((reason) => Alert.alert("Delete failed", (reason as Error).message)) },
  ]);

  const report = (comment: MediaComment) => Alert.alert("Report comment", "Choose the reason for this report.", [
    { text: "Spam", onPress: () => void reportMediaComment(comment.id, "spam").then(() => Alert.alert("Report received", "Thank you. Our moderators will review it.")) },
    { text: "Abuse", onPress: () => void reportMediaComment(comment.id, "abuse").then(() => Alert.alert("Report received", "Thank you. Our moderators will review it.")) },
    { text: "Cancel", style: "cancel" },
  ]);

  return <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.overlay}>
      <View style={[styles.sheet, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View><Text style={[styles.title, { color: colors.text, fontFamily }]}>Comments</Text><Pressable onPress={() => { onClose(); router.push("/terms" as never); }}><Text style={[styles.guidelines, { color: colors.tint, fontFamily }]}>Community Guidelines</Text></Pressable></View>
          <Pressable accessibilityLabel="Close comments" onPress={onClose}><Ionicons name="close" size={28} color={colors.text} /></Pressable>
        </View>
        {loading ? <ActivityIndicator color={colors.tint} style={styles.loader} /> : <FlashList
          data={comments} keyExtractor={(value) => value.id} onEndReached={() => void more()} onEndReachedThreshold={0.4}
          contentContainerStyle={styles.list}
          renderItem={({ item: comment }) => <View style={[styles.comment, { borderBottomColor: colors.border }]}>
            <View style={[styles.avatar, { backgroundColor: `${colors.tint}20` }]}><Ionicons name="person" size={16} color={colors.tint} /></View>
            <View style={styles.commentCopy}><Text style={[styles.author, { color: colors.text, fontFamily }]}>{comment.authorName}</Text><Text style={[styles.body, { color: colors.text, fontFamily }]}>{comment.content}</Text><Text style={[styles.date, { color: colors.mutedText, fontFamily }]}>{new Date(comment.createdAt).toLocaleDateString()}</Text></View>
            <Pressable accessibilityLabel="Comment options" onPress={() => comment.userId === auth.user?.id ? remove(comment) : report(comment)}><Ionicons name="ellipsis-horizontal" size={20} color={colors.mutedText} /></Pressable>
          </View>}
          ListEmptyComponent={<Text style={[styles.empty, { color: colors.mutedText, fontFamily }]}>No comments yet. Start the conversation.</Text>}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.tint} /> : null}
        />}
        <View style={[styles.composer, { borderTopColor: colors.border }]}>
          <TextInput value={text} onChangeText={setText} maxLength={1000} placeholder={auth.user ? "Add a respectful comment…" : "Sign in to comment"} placeholderTextColor={colors.mutedText} editable={Boolean(auth.user) && !posting} multiline style={[styles.input, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border, fontFamily }]} />
          <Pressable accessibilityLabel="Post comment" onPress={() => void post()} disabled={!stripUnsafeComment(text) || posting} style={[styles.send, { backgroundColor: colors.tint, opacity: !stripUnsafeComment(text) || posting ? 0.45 : 1 }]}>{posting ? <ActivityIndicator color="#fff" /> : <Ionicons name="send" size={19} color="#fff" />}</Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,.5)", justifyContent: "flex-end" }, sheet: { height: "82%", borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, overflow: "hidden" },
  header: { minHeight: 70, paddingHorizontal: 18, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1 }, title: { fontSize: 19, fontWeight: "900" }, guidelines: { fontSize: 11, fontWeight: "700", marginTop: 3 },
  loader: { flex: 1 }, list: { paddingHorizontal: 18 }, comment: { flexDirection: "row", gap: 10, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth }, avatar: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" }, commentCopy: { flex: 1 }, author: { fontSize: 12, fontWeight: "800" }, body: { fontSize: 14, lineHeight: 20, marginTop: 3 }, date: { fontSize: 10, marginTop: 5 }, empty: { paddingVertical: 50, textAlign: "center" },
  composer: { padding: 12, paddingBottom: Platform.OS === "ios" ? 28 : 12, borderTopWidth: 1, flexDirection: "row", alignItems: "flex-end", gap: 8 }, input: { flex: 1, minHeight: 44, maxHeight: 100, borderWidth: 1, borderRadius: 15, paddingHorizontal: 13, paddingVertical: 10 }, send: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
});
