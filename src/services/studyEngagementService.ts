import { authConfigured, supabase } from "@/src/auth/supabaseClient";

export type StudyComment = {
  id: string;
  userId: string;
  authorName: string;
  body: string;
  createdAt: string;
  updatedAt: string;
};

export type StudyEngagement = {
  likeCount: number;
  shareCount: number;
  commentCount: number;
  likedByMe: boolean;
  comments: StudyComment[];
};

const EMPTY_ENGAGEMENT: StudyEngagement = {
  likeCount: 0,
  shareCount: 0,
  commentCount: 0,
  likedByMe: false,
  comments: [],
};

export async function getStudyEngagement(studyId: string): Promise<StudyEngagement> {
  if (!authConfigured) return EMPTY_ENGAGEMENT;
  const { data, error } = await supabase.rpc("get_study_engagement", { p_study_id: studyId });
  if (error) throw error;
  const value = (data ?? {}) as Partial<StudyEngagement>;
  return {
    likeCount: Number(value.likeCount ?? 0),
    shareCount: Number(value.shareCount ?? 0),
    commentCount: Number(value.commentCount ?? 0),
    likedByMe: Boolean(value.likedByMe),
    comments: Array.isArray(value.comments) ? value.comments : [],
  };
}

export async function toggleStudyLike(studyId: string) {
  const { data, error } = await supabase.rpc("toggle_study_like", { p_study_id: studyId });
  if (error) throw error;
  return data as { liked: boolean; likeCount: number };
}

export async function addStudyComment(studyId: string, body: string) {
  const { error } = await supabase.rpc("add_study_comment", {
    p_study_id: studyId,
    p_body: body,
  });
  if (error) throw error;
}

export async function deleteStudyComment(commentId: string) {
  const { error } = await supabase.from("study_comments").delete().eq("id", commentId);
  if (error) throw error;
}

export async function recordStudyShare(studyId: string): Promise<number> {
  if (!authConfigured) return 0;
  const { data, error } = await supabase.rpc("record_study_share", { p_study_id: studyId });
  if (error) throw error;
  return Number(data ?? 0);
}
