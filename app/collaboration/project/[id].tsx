import { Ionicons } from "@expo/vector-icons";
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useAppTheme } from "@/hooks/use-app-theme";
import { getProject, publishProject, type ProjectDetail } from "@/src/features/collaboration/studyCollaborationService";

const ACTION_LABELS: Record<string,string> = {
  project_started: "started this study project", version_saved: "saved an official version",
  contribution_sent: "sent improvements", changes_requested: "requested changes",
  contribution_declined: "declined a contribution", contribution_accepted: "accepted a contribution",
  published: "published the study",
};

export default function ProjectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(); const router = useRouter();
  const { colors, fontFamily } = useAppTheme();
  const [project, setProject] = useState<ProjectDetail | null>(null); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false);
  const load = useCallback(async () => { if (!id) return; try { setProject(await getProject(String(id))); } catch (error) { Alert.alert("Couldn’t open project", (error as Error).message); } finally { setLoading(false); } }, [id]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const publish = async () => { if (!project) return; setBusy(true); try { const result = await publishProject(project.projectId); Alert.alert("Published", `Version ${result.revisionNumber} is available to everyone.`); await load(); } catch (error) { Alert.alert("Couldn’t publish", (error as Error).message); } finally { setBusy(false); } };
  if (loading) return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator color={colors.tint} /></View>;
  if (!project) return <View style={[styles.center, { backgroundColor: colors.background }]}><Text style={{ color: colors.text }}>Project not found.</Text></View>;
  const pending = project.contributions.filter((item) => item.status === "submitted");
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}><Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}><Pressable onPress={() => router.back()} style={styles.iconButton}><Ionicons name="arrow-back" size={22} color={colors.text} /></Pressable><View style={{ flex: 1 }}><Text style={[styles.headerTitle, { color: colors.text, fontFamily }]}>Study project</Text><Text style={[styles.headerSub, { color: colors.mutedText, fontFamily }]}>Version {project.current.number} · owned by {project.ownerName}</Text></View></View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text, fontFamily }]}>{project.current.title}</Text>
        <View style={[styles.trustCard, { backgroundColor: `${colors.tint}10`, borderColor: `${colors.tint}44` }]}><Ionicons name="shield-checkmark" size={24} color={colors.tint} /><View style={{ flex: 1 }}><Text style={[styles.trustTitle, { color: colors.text, fontFamily }]}>Clear ownership and review</Text><Text style={[styles.trustCopy, { color: colors.mutedText, fontFamily }]}>Only accepted versions become official. Publishing never exposes an unfinished draft.</Text></View></View>

        {project.isOwner && <><View style={styles.sectionRow}><Text style={[styles.sectionTitle, { color: colors.text, fontFamily }]}>Needs your review</Text>{pending.length > 0 && <View style={[styles.count, { backgroundColor: "#F59E0B" }]}><Text style={styles.countText}>{pending.length}</Text></View>}</View>{pending.map((item) => <Pressable key={item.id} onPress={() => router.push(`/collaboration/review/${item.id}` as never)} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={[styles.avatar, { backgroundColor: "#FEF3C7" }]}><Ionicons name="person-outline" size={21} color="#92400E" /></View><View style={{ flex: 1 }}><Text style={[styles.cardTitle, { color: colors.text, fontFamily }]}>{item.authorName}</Text><Text numberOfLines={2} style={[styles.cardCopy, { color: colors.mutedText, fontFamily }]}>{item.message || "Suggested improvements"}</Text><Text style={[styles.date, { color: colors.subtleText, fontFamily }]}>{new Date(item.createdAt).toLocaleDateString()}</Text></View><Ionicons name="chevron-forward" size={19} color={colors.tint} /></Pressable>)}{!pending.length && <Text style={[styles.empty, { color: colors.mutedText, fontFamily }]}>No improvements are waiting for review.</Text>}</>}

        {!project.isOwner && project.contributions.length > 0 && <><Text style={[styles.sectionTitle, { color: colors.text, fontFamily }]}>Your contributions</Text>{project.contributions.map((item) => <Pressable key={item.id} onPress={() => router.push(`/collaboration/review/${item.id}` as never)} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}><Ionicons name={item.status === "accepted" ? "checkmark-circle" : item.status === "submitted" ? "time-outline" : "chatbubble-ellipses-outline"} size={23} color={item.status === "accepted" ? "#16A34A" : colors.tint} /><View style={{ flex: 1 }}><Text style={[styles.cardTitle, { color: colors.text, fontFamily }]}>{item.status.replace("_", " ")}</Text><Text style={[styles.cardCopy, { color: colors.mutedText, fontFamily }]}>{item.reviewMessage || item.message || "Contribution"}</Text></View></Pressable>)}</>}

        <Text style={[styles.sectionTitle, { color: colors.text, fontFamily }]}>History</Text>
        {project.history.map((item, index) => <View key={item.id} style={styles.historyRow}><View style={[styles.timeline, { backgroundColor: index === 0 ? colors.tint : colors.border }]} /><View style={{ flex: 1 }}><Text style={[styles.historyText, { color: colors.text, fontFamily }]}><Text style={{ fontWeight: "900" }}>{item.actorName}</Text> {ACTION_LABELS[item.action] || item.action}</Text>{item.detail ? <Text style={[styles.historyDetail, { color: colors.mutedText, fontFamily }]}>{item.detail}</Text> : null}<Text style={[styles.date, { color: colors.subtleText, fontFamily }]}>{new Date(item.createdAt).toLocaleString()}</Text></View></View>)}

        {project.isOwner && <Pressable disabled={busy} onPress={() => void publish()} style={[styles.publishButton, { backgroundColor: colors.tint }]}><Ionicons name="earth-outline" size={21} color="#fff" /><Text style={styles.publishText}>{project.publishedRevisionId === project.current.id ? "Publish this version again" : project.publishedStudyId ? "Publish update" : "Publish to community"}</Text></Pressable>}
        {project.publishedStudyId && <Pressable onPress={() => router.push({ pathname: "/studies/[id]", params: { id: project.publishedStudyId! } })} style={[styles.viewButton, { borderColor: colors.border }]}><Text style={[styles.viewText, { color: colors.tint }]}>View community study</Text><Ionicons name="arrow-forward" size={18} color={colors.tint} /></Pressable>}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, center: { flex: 1, alignItems: "center", justifyContent: "center" }, header: { minHeight: 62, borderBottomWidth: 1, flexDirection: "row", alignItems: "center", paddingHorizontal: 10, gap: 8 }, iconButton: { width: 42, height: 42, alignItems: "center", justifyContent: "center" }, headerTitle: { fontSize: 15, fontWeight: "900" }, headerSub: { fontSize: 10, fontWeight: "700", marginTop: 2 }, content: { padding: 20, paddingBottom: 60 }, title: { fontSize: 27, lineHeight: 34, fontWeight: "900", marginBottom: 16 },
  trustCard: { borderWidth: 1, borderRadius: 16, padding: 14, flexDirection: "row", gap: 11, alignItems: "center", marginBottom: 22 }, trustTitle: { fontSize: 13, fontWeight: "900" }, trustCopy: { fontSize: 11, lineHeight: 16, marginTop: 3 }, sectionRow: { flexDirection: "row", alignItems: "center", marginTop: 6 }, sectionTitle: { fontSize: 16, fontWeight: "900", marginTop: 15, marginBottom: 10 }, count: { minWidth: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", marginLeft: 8 }, countText: { color: "#fff", fontSize: 11, fontWeight: "900" }, card: { borderWidth: 1, borderRadius: 16, padding: 14, flexDirection: "row", gap: 12, alignItems: "center", marginBottom: 9 }, avatar: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center" }, cardTitle: { fontSize: 14, fontWeight: "900", textTransform: "capitalize" }, cardCopy: { fontSize: 11, lineHeight: 16, marginTop: 3 }, date: { fontSize: 9, fontWeight: "700", marginTop: 5 }, empty: { fontSize: 12, marginBottom: 10 },
  historyRow: { flexDirection: "row", gap: 12, marginBottom: 16 }, timeline: { width: 8, height: 8, borderRadius: 4, marginTop: 5 }, historyText: { fontSize: 12, lineHeight: 17 }, historyDetail: { fontSize: 11, lineHeight: 16, marginTop: 3 }, publishButton: { minHeight: 51, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, marginTop: 20 }, publishText: { color: "#fff", fontWeight: "900" }, viewButton: { minHeight: 49, borderWidth: 1, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 10 }, viewText: { fontWeight: "900" },
});
