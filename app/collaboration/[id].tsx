import { Ionicons } from "@expo/vector-icons";
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import RichNoteEditor from "@/components/rich-note-editor";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useAuth } from "@/src/auth/AuthContext";
import {
  connectWorkingCopy, getProject, getWorkingCopy, publishProject, refreshWorkingCopy,
  reconcileWorkingCopy, saveWorkingCopy, sendWorkingCopy, type ProjectDetail, type WorkingCopy,
} from "@/src/features/collaboration/studyCollaborationService";

export default function WorkingCopyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter(); const auth = useAuth();
  const { colors, fontFamily, darkMode } = useAppTheme();
  const [copy, setCopy] = useState<WorkingCopy | null>(null);
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false); const [summary, setSummary] = useState("");
  const latest = useRef({ title: "", subtitle: "", category: "Bible Study", html: "<p></p>", plainText: "" });
  const dirty = useRef(false);

  const load = useCallback(async () => {
    if (!id) return;
    let row = await getWorkingCopy(String(id), auth.user?.id ?? null);
    if (row && auth.user?.id && !row.projectId) {
      try { await connectWorkingCopy(row.id, auth.user.id); row = await getWorkingCopy(row.id, auth.user.id); } catch { /* remain offline */ }
    }
    setCopy(row); dirty.current = Boolean(row?.dirty);
    if (row) latest.current = { title: row.title, subtitle: row.subtitle, category: row.category, html: row.contentHtml, plainText: row.plainText };
    if (row?.projectId && auth.user) {
      try {
        const nextProject = await getProject(row.projectId);
        setProject(nextProject);
        row = await reconcileWorkingCopy(row.id, nextProject, auth.user.id) ?? row;
        setCopy(row);
      } catch { setProject(null); }
    }
    setLoading(false);
  }, [auth.user, id]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const persist = useCallback(async () => {
    if (!copy || !dirty.current) return;
    await saveWorkingCopy(copy.id, { title: latest.current.title, subtitle: latest.current.subtitle, category: latest.current.category, contentHtml: latest.current.html, plainText: latest.current.plainText });
    dirty.current = false;
    setCopy((current) => current ? { ...current, ...latest.current, contentHtml: latest.current.html, dirty: 1, syncState: current.projectId ? "pending" : "local" } as WorkingCopy : current);
  }, [copy]);
  useEffect(() => { if (!copy || !dirty.current) return; const timer = setTimeout(() => void persist(), 700); return () => clearTimeout(timer); }, [copy, persist, latest.current.title, latest.current.subtitle, latest.current.category, latest.current.html]);

  const changeField = (key: "title"|"subtitle"|"category", value: string) => { dirty.current = true; latest.current[key] = value; setCopy((current) => current ? { ...current, [key]: value, dirty: 1 } : current); };
  const changeBody = (html: string, plainText: string) => {
    if (html === latest.current.html && plainText === latest.current.plainText) return;
    dirty.current = true; latest.current.html = html; latest.current.plainText = plainText;
    setCopy((current) => current ? { ...current, contentHtml: html, plainText, dirty: 1 } : current);
  };

  const send = async () => {
    if (!copy || !auth.user?.id) return;
    setBusy(true);
    try {
      await persist();
      const result = await sendWorkingCopy(copy.id, auth.user.id, summary.trim() || (copy.isOwner ? "Improved the official study" : "Suggested improvements"));
      setSummaryOpen(false); setSummary("");
      Alert.alert(result.ownerSaved ? "Official version saved" : "Improvements sent", result.ownerSaved ? "Your new version is ready to publish." : "The author can now review exactly what you changed.");
      await load();
    } catch (error) { Alert.alert("Couldn’t send changes", (error as Error).message); }
    finally { setBusy(false); }
  };
  const publish = async () => {
    if (!copy?.projectId) return;
    setBusy(true); try { const result = await publishProject(copy.projectId); Alert.alert("Published", `Version ${result.revisionNumber} is now available to the community.`); await load(); }
    catch (error) { Alert.alert("Couldn’t publish", (error as Error).message); } finally { setBusy(false); }
  };
  const update = async () => {
    if (!copy || !auth.user?.id) return;
    try { await refreshWorkingCopy(copy.id, auth.user.id); await load(); }
    catch (error) { Alert.alert("Your draft is protected", (error as Error).message); }
  };

  if (loading) return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator color={colors.tint} /></View>;
  if (!copy) return <View style={[styles.center, { backgroundColor: colors.background }]}><Text style={{ color: colors.text }}>Study copy not found.</Text></View>;
  const updateAvailable = Boolean(project && project.current.id !== copy.baseRevisionId);
  const hasChanges = Boolean(copy.dirty || dirty.current);

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.background }]} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => { void persist(); router.back(); }} style={styles.iconButton}><Ionicons name="arrow-back" size={22} color={colors.text} /></Pressable>
        <View style={{ flex: 1 }}><Text numberOfLines={1} style={[styles.headerTitle, { color: colors.text, fontFamily }]}>My working copy</Text><Text style={[styles.headerStatus, { color: colors.mutedText, fontFamily }]}>{hasChanges ? "Saved on this device" : copy.submissionStatus === "submitted" ? "Waiting for review" : `Based on version ${copy.baseRevisionNumber || 1}`}</Text></View>
        {copy.projectId && <Pressable accessibilityLabel="Open project activity and reviews" onPress={() => router.push(`/collaboration/project/${copy.projectId}` as never)} style={[styles.iconButton, { borderColor: colors.border }]}><Ionicons name="people-outline" size={21} color={colors.tint} /></Pressable>}
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {updateAvailable && <View style={[styles.banner, { backgroundColor: "#FEF3C7", borderColor: "#F59E0B" }]}><Ionicons name="arrow-down-circle-outline" size={23} color="#92400E" /><View style={{ flex: 1 }}><Text style={styles.bannerTitle}>A newer official version is available</Text><Text style={styles.bannerCopy}>{hasChanges ? "Your draft is protected. Send it before updating." : "Bring the accepted improvements into this copy."}</Text></View><Pressable disabled={hasChanges} onPress={() => void update()}><Text style={[styles.updateAction, hasChanges && { opacity: .4 }]}>Update</Text></Pressable></View>}
        {!auth.user && <Pressable onPress={() => router.push("/account")} style={[styles.banner, { backgroundColor: `${colors.tint}12`, borderColor: `${colors.tint}55` }]}><Ionicons name="cloud-offline-outline" size={23} color={colors.tint} /><View style={{ flex: 1 }}><Text style={[styles.bannerTitle, { color: colors.text }]}>Editing offline</Text><Text style={[styles.bannerCopy, { color: colors.mutedText }]}>Sign in when you want to send improvements.</Text></View><Text style={[styles.updateAction, { color: colors.tint }]}>Sign in</Text></Pressable>}

        <TextInput value={copy.title} onChangeText={(value) => changeField("title", value)} placeholder="Study title" placeholderTextColor={colors.subtleText} multiline style={[styles.titleInput, { color: colors.text, fontFamily }]} />
        <TextInput value={copy.subtitle} onChangeText={(value) => changeField("subtitle", value)} placeholder="Short description (optional)" placeholderTextColor={colors.subtleText} style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card, fontFamily }]} />
        <TextInput value={copy.category} onChangeText={(value) => changeField("category", value)} placeholder="Category" placeholderTextColor={colors.subtleText} style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card, fontFamily }]} />
        <RichNoteEditor key={`${copy.id}-${copy.baseRevisionId}`} initialHtml={copy.contentHtml} onChange={changeBody} darkMode={darkMode} tint={colors.tint} textColor={colors.text} borderColor={colors.border} cardColor={colors.card} />

        <View style={[styles.truthCard, { borderColor: colors.border, backgroundColor: colors.card }]}><Ionicons name="shield-checkmark-outline" size={22} color={colors.tint} /><Text style={[styles.truthCopy, { color: colors.mutedText, fontFamily }]}>Your changes stay in this copy until you send them. The official study never changes without an accepted version.</Text></View>
        {auth.user && <Pressable disabled={!hasChanges || busy || copy.submissionStatus === "submitted"} onPress={() => setSummaryOpen(true)} style={[styles.primaryButton, { backgroundColor: colors.tint }, (!hasChanges || busy || copy.submissionStatus === "submitted") && { opacity: .45 }]}><Ionicons name={copy.isOwner ? "checkmark-circle-outline" : "send-outline"} size={20} color="#fff" /><Text style={styles.primaryText}>{copy.isOwner ? "Save official version" : copy.submissionStatus === "submitted" ? "Waiting for review" : "Send improvements"}</Text></Pressable>}
        {copy.isOwner && copy.projectId && <Pressable disabled={hasChanges || busy} onPress={() => void publish()} style={[styles.secondaryButton, { borderColor: colors.tint }, hasChanges && { opacity: .45 }]}><Ionicons name="earth-outline" size={20} color={colors.tint} /><Text style={[styles.secondaryText, { color: colors.tint }]}>Publish accepted version</Text></Pressable>}
      </ScrollView>

      <Modal visible={summaryOpen} transparent animationType="fade" onRequestClose={() => setSummaryOpen(false)}><Pressable style={styles.backdrop} onPress={() => setSummaryOpen(false)}><Pressable style={[styles.dialog, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={(e) => e.stopPropagation()}><Text style={[styles.dialogTitle, { color: colors.text, fontFamily }]}>{copy.isOwner ? "Describe this version" : "Tell the author what improved"}</Text><Text style={[styles.dialogCopy, { color: colors.mutedText, fontFamily }]}>A short note makes the history easy to trust.</Text><TextInput autoFocus value={summary} onChangeText={setSummary} multiline maxLength={500} placeholder="Example: Added Daniel 6:10 and clarified the conclusion" placeholderTextColor={colors.subtleText} style={[styles.summaryInput, { color: colors.text, borderColor: colors.border }]} /><View style={styles.dialogActions}><Pressable onPress={() => setSummaryOpen(false)} style={styles.dialogButton}><Text style={{ color: colors.text }}>Cancel</Text></Pressable><Pressable disabled={busy} onPress={() => void send()} style={[styles.dialogButton, { backgroundColor: colors.tint }]}><Text style={styles.primaryText}>{copy.isOwner ? "Save version" : "Send"}</Text></Pressable></View></Pressable></Pressable></Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, center: { flex: 1, alignItems: "center", justifyContent: "center" }, header: { minHeight: 62, borderBottomWidth: 1, flexDirection: "row", alignItems: "center", paddingHorizontal: 10, gap: 8 }, iconButton: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 0 }, headerTitle: { fontSize: 14, fontWeight: "900" }, headerStatus: { fontSize: 10, fontWeight: "700", marginTop: 2 }, content: { padding: 20, paddingBottom: 60 },
  banner: { borderWidth: 1, borderRadius: 15, padding: 13, marginBottom: 16, flexDirection: "row", gap: 11, alignItems: "center" }, bannerTitle: { color: "#78350F", fontSize: 13, fontWeight: "900" }, bannerCopy: { color: "#92400E", fontSize: 11, lineHeight: 16, marginTop: 2 }, updateAction: { color: "#92400E", fontSize: 12, fontWeight: "900" },
  titleInput: { fontSize: 29, lineHeight: 36, fontWeight: "900", padding: 0, marginBottom: 10 }, input: { minHeight: 47, borderWidth: 1, borderRadius: 12, paddingHorizontal: 13, marginBottom: 10 }, truthCard: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 14, padding: 13, marginTop: 14 }, truthCopy: { flex: 1, fontSize: 11, lineHeight: 16 },
  primaryButton: { minHeight: 50, borderRadius: 14, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", marginTop: 16 }, primaryText: { color: "#fff", fontWeight: "900" }, secondaryButton: { minHeight: 49, borderWidth: 1, borderRadius: 14, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", marginTop: 10 }, secondaryText: { fontWeight: "900" },
  backdrop: { flex: 1, backgroundColor: "rgba(2,6,23,.58)", justifyContent: "center", padding: 22 }, dialog: { borderWidth: 1, borderRadius: 20, padding: 18 }, dialogTitle: { fontSize: 20, fontWeight: "900" }, dialogCopy: { fontSize: 12, lineHeight: 18, marginTop: 5 }, summaryInput: { minHeight: 110, borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 14, textAlignVertical: "top" }, dialogActions: { flexDirection: "row", justifyContent: "flex-end", gap: 9, marginTop: 15 }, dialogButton: { minHeight: 43, borderRadius: 11, paddingHorizontal: 16, alignItems: "center", justifyContent: "center" },
});
