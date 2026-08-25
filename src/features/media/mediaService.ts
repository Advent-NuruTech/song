import AsyncStorage from "@react-native-async-storage/async-storage";

import { authConfigured, supabase } from "@/src/auth/supabaseClient";
import type { CommentCursor, MediaComment, MediaCursor, MediaItem, MediaType, Page } from "./types";
import { stripUnsafeComment } from "./utils";

const PAGE_SIZE = 24;
const CACHE_PREFIX = "advent-pro:media-cache:v1:";
const SESSION_KEY = "advent-pro:media-session:v1";

type MediaRow = {
  id: string; source_type: "youtube" | "hosted"; youtube_video_id: string; youtube_url: string;
  title: string; description: string; media_type: MediaType; category: string; thumbnail_url: string;
  duration_seconds: number | null; view_count: number | string; like_count: number | string;
  comment_count: number | string; is_published: boolean; is_featured: boolean; sort_order: number;
  published_at: string | null; created_at: string; updated_at: string;
};

type CommentRow = {
  id: string; user_id: string; author_name: string; content: string; created_at: string; updated_at: string;
};

function mapMedia(row: MediaRow): MediaItem {
  return {
    id: row.id, sourceType: row.source_type, youtubeVideoId: row.youtube_video_id,
    youtubeUrl: row.youtube_url, title: row.title, description: row.description ?? "",
    mediaType: row.media_type, category: row.category ?? "", thumbnailUrl: row.thumbnail_url,
    durationSeconds: row.duration_seconds, viewCount: Number(row.view_count ?? 0),
    likeCount: Number(row.like_count ?? 0), commentCount: Number(row.comment_count ?? 0),
    isPublished: row.is_published, isFeatured: row.is_featured, sortOrder: row.sort_order,
    publishedAt: row.published_at ?? row.created_at, createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

export async function listMediaPage(type: MediaType, cursor: MediaCursor | null = null): Promise<Page<MediaItem, MediaCursor>> {
  if (!authConfigured) return { items: [], nextCursor: null };
  const { data, error } = await supabase.rpc("get_media_feed", {
    p_media_type: type,
    p_before_featured: cursor?.featured ?? null,
    p_before_sort: cursor?.sortOrder ?? null,
    p_before_published: cursor?.publishedAt ?? null,
    p_before_id: cursor?.id ?? null,
    p_limit: PAGE_SIZE,
  });
  if (error) throw error;
  const items = ((data ?? []) as MediaRow[]).map(mapMedia);
  if (!cursor && items.length) await AsyncStorage.setItem(`${CACHE_PREFIX}${type}`, JSON.stringify(items.slice(0, PAGE_SIZE)));
  const last = items.at(-1);
  return { items, nextCursor: items.length === PAGE_SIZE && last ? { featured: last.isFeatured, sortOrder: last.sortOrder, publishedAt: last.publishedAt, id: last.id } : null };
}

export async function searchMedia(type: MediaType, query: string): Promise<MediaItem[]> {
  if (!authConfigured) return [];
  const term = query.trim();
  if (!term) return [];
  const { data, error } = await supabase.rpc("search_media", {
    p_media_type: type,
    p_query: term,
    p_limit: 50,
  });
  if (error) throw error;
  return ((data ?? []) as MediaRow[]).map(mapMedia);
}

export async function getCachedMedia(type: MediaType): Promise<MediaItem[]> {
  try {
    const raw = await AsyncStorage.getItem(`${CACHE_PREFIX}${type}`);
    return raw ? (JSON.parse(raw) as MediaItem[]) : [];
  } catch {
    return [];
  }
}

export async function getMedia(id: string): Promise<MediaItem> {
  const { data, error } = await supabase.from("media").select("*").eq("id", id).single();
  if (!error) return mapMedia(data as MediaRow);
  const cached = [...await getCachedMedia("video"), ...await getCachedMedia("short")].find((item) => item.id === id);
  if (cached) return { ...cached, offlineCached: true };
  throw error;
}

export async function getViewerState(mediaId: string): Promise<{ likedByMe: boolean }> {
  const { data, error } = await supabase.rpc("get_media_viewer_state", { p_media_id: mediaId });
  if (error) throw error;
  return { likedByMe: Boolean((data as { likedByMe?: boolean } | null)?.likedByMe) };
}

export async function toggleMediaLike(mediaId: string): Promise<{ liked: boolean; likeCount: number }> {
  const { data, error } = await supabase.rpc("toggle_media_like", { p_media_id: mediaId });
  if (error) throw error;
  const result = data as { liked: boolean; likeCount: number };
  return { liked: Boolean(result.liked), likeCount: Number(result.likeCount) };
}

export async function listMediaComments(mediaId: string, cursor: CommentCursor | null = null): Promise<Page<MediaComment, CommentCursor>> {
  const { data, error } = await supabase.rpc("get_media_comments", {
    p_media_id: mediaId, p_before: cursor?.createdAt ?? null, p_limit: 20,
  });
  if (error) throw error;
  const items = ((data ?? []) as CommentRow[]).map((row) => ({
    id: row.id, userId: row.user_id, authorName: row.author_name, content: row.content,
    createdAt: row.created_at, updatedAt: row.updated_at,
  }));
  const last = items.at(-1);
  return { items, nextCursor: items.length === 20 && last ? { createdAt: last.createdAt } : null };
}

export async function addMediaComment(mediaId: string, value: string): Promise<void> {
  const content = stripUnsafeComment(value);
  if (!content) throw new Error("Write a comment first.");
  const { error } = await supabase.rpc("add_media_comment", { p_media_id: mediaId, p_content: content });
  if (error) throw error;
}

export async function deleteMediaComment(commentId: string): Promise<void> {
  const { error } = await supabase.rpc("delete_media_comment", { p_comment_id: commentId });
  if (error) throw error;
}

export async function reportMediaComment(commentId: string, reason: "spam" | "abuse" | "misinformation" | "other" = "other"): Promise<void> {
  const { error } = await supabase.rpc("report_media_comment", { p_comment_id: commentId, p_reason: reason, p_details: "" });
  if (error) throw error;
}

async function getMediaSessionId(): Promise<string> {
  const existing = await AsyncStorage.getItem(SESSION_KEY);
  if (existing) return existing;
  const created = `media-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  await AsyncStorage.setItem(SESSION_KEY, created);
  return created;
}

export async function recordMediaView(mediaId: string, watchSeconds: number): Promise<{ counted: boolean; viewCount: number }> {
  const sessionId = await getMediaSessionId();
  const { data, error } = await supabase.rpc("record_media_view", {
    p_media_id: mediaId, p_session_id: sessionId, p_watch_seconds: Math.max(1, Math.trunc(watchSeconds)),
  });
  if (error) throw error;
  const result = data as { counted?: boolean; viewCount?: number } | null;
  return { counted: Boolean(result?.counted), viewCount: Number(result?.viewCount ?? 0) };
}
