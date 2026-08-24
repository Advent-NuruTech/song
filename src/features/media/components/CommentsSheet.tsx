import { useCallback, useState } from "react";
import { Alert } from "react-native";
import { useRouter } from "expo-router";

import { CommunityCommentsSheet, type CommunityComment } from "@/components/community-comments-sheet";
import { useAuth } from "@/src/auth/AuthContext";
import { addMediaComment, deleteMediaComment, listMediaComments, reportMediaComment } from "../mediaService";
import type { CommentCursor, MediaComment, MediaItem } from "../types";

export function CommentsSheet({ visible, item, onClose, onCountChange }: { visible: boolean; item: MediaItem; onClose: () => void; onCountChange?: (value: number) => void }) {
  const auth = useAuth();
  const router = useRouter();
  const [comments, setComments] = useState<MediaComment[]>([]);
  const [cursor, setCursor] = useState<CommentCursor | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const page = await listMediaComments(item.id); setComments(page.items); setCursor(page.nextCursor); }
    catch (error) { Alert.alert("Comments unavailable", (error as Error)?.message || "Please try again."); }
    finally { setLoading(false); }
  }, [item.id]);

  const more = async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try { const page = await listMediaComments(item.id, cursor); setComments((current) => [...current, ...page.items]); setCursor(page.nextCursor); } finally { setLoadingMore(false); }
  };

  const remove = (comment: CommunityComment) => Alert.alert("Delete comment?", "This cannot be undone.", [
    { text: "Cancel", style: "cancel" },
    { text: "Delete", style: "destructive", onPress: () => void deleteMediaComment(comment.id).then(() => { setComments((all) => all.filter((value) => value.id !== comment.id)); onCountChange?.(Math.max(0, item.commentCount - 1)); }) },
  ]);
  const report = (comment: CommunityComment) => Alert.alert("Report comment", "Choose the reason for this report.", [
    { text: "Spam", onPress: () => void reportMediaComment(comment.id, "spam").then(() => Alert.alert("Report received", "Our moderators will review it.")) },
    { text: "Abuse", onPress: () => void reportMediaComment(comment.id, "abuse").then(() => Alert.alert("Report received", "Our moderators will review it.")) },
    { text: "Cancel", style: "cancel" },
  ]);

  return <CommunityCommentsSheet
    visible={visible} comments={comments.map((comment) => ({ ...comment, body: comment.content }))} currentUserId={auth.user?.id}
    loading={loading} loadingMore={loadingMore} onClose={onClose} onLoad={load} onLoadMore={more}
    onPost={async (body) => { await addMediaComment(item.id, body); onCountChange?.(item.commentCount + 1); await load(); }}
    onDelete={remove} onReport={report} onGuidelines={() => { onClose(); router.push("/terms" as never); }}
  />;
}
