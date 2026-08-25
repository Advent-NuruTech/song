export type Song = {
  id: string;
  hymn_number: number;
  title: string;
  language: string;
  author: string;
  stanzas: string[][];
  chorus: string[] | null;
  is_published: boolean;
  deleted: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Study = {
  id: string;
  category: string;
  title: string;
  subtitle: string;
  content: string;
  author: string;
  is_featured: boolean;
  is_published: boolean;
  deleted: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Category = {
  name: string;
  display_name: string;
  color: string;
  icon: string;
  description: string;
  sort_order: number;
  created_at: string;
};

export type Media = {
  id: string;
  source_type: "youtube" | "hosted";
  youtube_video_id: string;
  youtube_url: string;
  title: string;
  description: string;
  media_type: "video" | "short";
  category: string;
  thumbnail_url: string;
  thumbnail_public_id: string | null;
  thumbnail_width: number | null;
  thumbnail_height: number | null;
  thumbnail_bytes: number | null;
  thumbnail_format: string | null;
  duration_seconds: number | null;
  view_count: number;
  like_count: number;
  comment_count: number;
  is_published: boolean;
  is_featured: boolean;
  sort_order: number;
  deleted: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type NewSong = Omit<
  Song,
  "deleted" | "published_at" | "created_at" | "updated_at"
>;

export type NewStudy = Omit<
  Study,
  "deleted" | "published_at" | "created_at" | "updated_at"
>;
