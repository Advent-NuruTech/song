import { Ionicons } from "@expo/vector-icons";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useAppTheme } from "@/hooks/use-app-theme";
import { useAuth } from "@/src/auth/AuthContext";
import {
  claimLocalCopies, getMyProjects, listWorkingCopies, openProjectLocally,
  type ProjectSummary, type WorkingCopy,
} from "@/src/features/collaboration/studyCollaborationService";

function statusLabel(copy: WorkingCopy) {
  if (copy.submissionStatus === "submitted") return "Waiting for review";
  if (copy.submissionStatus === "changes_requested") return "Changes requested";
  if (copy.dirty) return "Draft changes on this device";
  if (!copy.projectId) return "Saved offline";
  return copy.isOwner ? "Official copy" : "Ready to improve";
}

export default function StudyWorkshopScreen() {
  const router = useRouter();
  const auth = useAuth();
  const { colors, fontFamily } = useAppTheme();
  const [copies, setCopies] = useState<WorkingCopy[]>([]);
  const [remote, setRemote] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (auth.user?.id) await claimLocalCopies(auth.user.id);
    const local = await listWorkingCopies(auth.user?.id ?? null);
    setCopies(local);
    if (auth.user?.id) {
      try { setRemote(await getMyProjects()); } catch { setRemote([]); }
    } else setRemote([]);
    setLoading(false);
  }, [auth.user?.id]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const localProjects = new Set(copies.map((copy) => copy.projectId).filter(Boolean));
  const remoteOnly = remote.filter((project) => !localProjects.has(project.projectId));
  const reviewCount = remote.reduce((sum, project) => sum + Number(project.pendingReviews || 0), 0);

  const openRemote = async (project: ProjectSummary) => {
    if (!auth.user?.id) return;
    const id = await openProjectLocally(project.projectId, auth.user.id);
    router.push(`/collaboration/${id}` as never);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headingRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.text, fontFamily }]}>Study Workshop</Text>
            <Text style={[styles.subtitle, { color: colors.mutedText, fontFamily }]}>Your offline copies, improvements, reviews, and published studies.</Text>
          </View>
          {reviewCount > 0 && <View style={[styles.reviewBadge, { backgroundColor: colors.tint }]}><Text style={styles.reviewBadgeText}>{reviewCount}</Text></View>}
        </View>

        {!auth.user && (
          <Pressable onPress={() => router.push("/account")} style={[styles.signInCard, { backgroundColor: `${colors.tint}12`, borderColor: `${colors.tint}55` }]}>
            <Ionicons name="cloud-offline-outline" size={25} color={colors.tint} />
            <View style={{ flex: 1 }}><Text style={[styles.cardTitle, { color: colors.text, fontFamily }]}>Your studies work offline</Text><Text style={[styles.cardCopy, { color: colors.mutedText, fontFamily }]}>Sign in only when you are ready to send improvements or publish.</Text></View>
            <Ionicons name="chevron-forward" size={19} color={colors.tint} />
          </Pressable>
        )}

        {loading ? <ActivityIndicator color={colors.tint} style={{ marginTop: 60 }} /> : (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text, fontFamily }]}>On this device</Text>
            {copies.map((copy) => (
              <Pressable key={copy.id} onPress={() => router.push(`/collaboration/${copy.id}` as never)} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.icon, { backgroundColor: `${colors.tint}12` }]}><Ionicons name="create-outline" size={23} color={colors.tint} /></View>
                <View style={{ flex: 1 }}><Text numberOfLines={1} style={[styles.cardTitle, { color: colors.text, fontFamily }]}>{copy.title}</Text><Text style={[styles.status, { color: copy.dirty ? "#B45309" : colors.mutedText, fontFamily }]}>{statusLabel(copy)}</Text></View>
                <Ionicons name="chevron-forward" size={19} color={colors.subtleText} />
              </Pressable>
            ))}
            {!copies.length && <View style={styles.empty}><Ionicons name="library-outline" size={45} color={colors.tint} /><Text style={[styles.emptyTitle, { color: colors.text, fontFamily }]}>Save a study to begin</Text><Text style={[styles.emptyCopy, { color: colors.mutedText, fontFamily }]}>Open any community study and tap “Save and improve.”</Text><Pressable onPress={() => router.push("/studies")} style={[styles.primaryButton, { backgroundColor: colors.tint }]}><Text style={styles.primaryText}>Browse studies</Text></Pressable></View>}

            {remoteOnly.length > 0 && <Text style={[styles.sectionTitle, { color: colors.text, fontFamily }]}>From your account</Text>}
            {remoteOnly.map((project) => (
              <Pressable key={project.projectId} onPress={() => void openRemote(project)} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.icon, { backgroundColor: project.pendingReviews ? "#FEF3C7" : `${colors.tint}12` }]}><Ionicons name={project.pendingReviews ? "git-pull-request-outline" : "cloud-download-outline"} size={23} color={project.pendingReviews ? "#B45309" : colors.tint} /></View>
                <View style={{ flex: 1 }}><Text numberOfLines={1} style={[styles.cardTitle, { color: colors.text, fontFamily }]}>{project.title}</Text><Text style={[styles.status, { color: colors.mutedText, fontFamily }]}>{project.pendingReviews ? `${project.pendingReviews} waiting for your review` : "Download to this device"}</Text></View>
                <Ionicons name="download-outline" size={19} color={colors.tint} />
              </Pressable>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, content: { padding: 20, paddingBottom: 60 }, headingRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 18 },
  title: { fontSize: 29, fontWeight: "900" }, subtitle: { fontSize: 13, lineHeight: 19, marginTop: 5, maxWidth: 560 }, reviewBadge: { minWidth: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" }, reviewBadgeText: { color: "#fff", fontWeight: "900" },
  signInCard: { borderWidth: 1, borderRadius: 17, padding: 14, flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 22 },
  sectionTitle: { fontSize: 15, fontWeight: "900", marginTop: 10, marginBottom: 10 }, card: { borderWidth: 1, borderRadius: 17, padding: 14, flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 }, icon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" }, cardTitle: { fontSize: 15, fontWeight: "800" }, cardCopy: { fontSize: 12, lineHeight: 18, marginTop: 3 }, status: { fontSize: 11, fontWeight: "700", marginTop: 4 },
  empty: { alignItems: "center", paddingVertical: 58, paddingHorizontal: 24 }, emptyTitle: { fontSize: 19, fontWeight: "900", marginTop: 15 }, emptyCopy: { fontSize: 13, lineHeight: 19, textAlign: "center", marginTop: 7 }, primaryButton: { borderRadius: 13, paddingHorizontal: 18, paddingVertical: 12, marginTop: 17 }, primaryText: { color: "#fff", fontWeight: "800" },
});
