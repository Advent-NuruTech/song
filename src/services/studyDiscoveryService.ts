import AsyncStorage from "@react-native-async-storage/async-storage";

import { authConfigured, supabase } from "@/src/auth/supabaseClient";
import { getStudySummaries, type StudySummary } from "./studiesService";

const SESSION_KEY = "advent-pro:study-session:v1";

async function sessionId() {
  const existing = await AsyncStorage.getItem(SESSION_KEY);
  if (existing) return existing;
  const created = `study-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  await AsyncStorage.setItem(SESSION_KEY, created);
  return created;
}

export async function recordStudyView(studyId: string) {
  if (!authConfigured) return;
  const { error } = await supabase.rpc("record_study_view", { p_study_id: studyId, p_session_id: await sessionId() });
  if (error && error.code !== "PGRST202") throw error;
}

export async function getStudyDiscovery(mode: "popular" | "for_you", limit = 8): Promise<StudySummary[]> {
  const local = await getStudySummaries({ limit: 200 });
  if (!authConfigured) return fallback(local, mode, limit);
  const { data, error } = await supabase.rpc("get_study_discovery", { p_mode: mode, p_limit: limit });
  if (error || !Array.isArray(data)) return fallback(local, mode, limit);
  const byId = new Map(local.map((study) => [study.id, study]));
  const ranked = (data as { id: string }[]).map(({ id }) => byId.get(id)).filter((study): study is StudySummary => Boolean(study));
  return ranked.length ? ranked.slice(0, limit) : fallback(local, mode, limit);
}

function fallback(studies: StudySummary[], mode: "popular" | "for_you", limit: number) {
  const ranked = [...studies].sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured) || (mode === "for_you" ? a.category.localeCompare(b.category) : b.wordCount - a.wordCount));
  return ranked.slice(0, limit);
}
