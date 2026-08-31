export type MediaType = "video" | "short";
/** A Media screen feed. Song videos are regular videos filed under the Songs category. */
export type MediaFeedType = MediaType | "song";
export type MediaLayout = "compact" | "full";

export type MediaItem = {
  id: string;
  sourceType: "youtube" | "hosted";
  youtubeVideoId: string;
  youtubeUrl: string;
  title: string;
  description: string;
  mediaType: MediaType;
  category: string;
  thumbnailUrl: string;
  durationSeconds: number | null;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  isPublished: boolean;
  isFeatured: boolean;
  sortOrder: number;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
  offlineCached?: boolean;
};

export type MediaComment = {
  id: string;
  userId: string;
  authorName: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type MediaCursor = { featured: boolean; sortOrder: number; publishedAt: string; id: string };
export type CommentCursor = { createdAt: string };

export type Page<T, C> = {
  items: T[];
  nextCursor: C | null;
};
