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

export type NewSong = Omit<
  Song,
  "deleted" | "published_at" | "created_at" | "updated_at"
>;

export type NewStudy = Omit<
  Study,
  "deleted" | "published_at" | "created_at" | "updated_at"
>;
