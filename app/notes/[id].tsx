import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";

import RichTextEditor from "@/components/rich-text-editor";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useAuth } from "@/src/auth/AuthContext";
import { exportNotePdf, getNote, saveNote, syncPersonalContent, type UserNote } from "@/src/features/personal/personalService";

export default function NoteEditorScreen() {
  const router = useRouter();
  const { height: windowHeight } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const auth = useAuth();
  const { colors, fontFamily, darkMode } = useAppTheme();
  const [note, setNote] = useState<UserNote | null>(null);
  const [title, setTitle] = useState("");
  const [html, setHtml] = useState("<p></p>");
  const [plainText, setPlainText] = useState("");
  const [state, setState] = useState<"loading" | "saved" | "saving" | "error">("loading");
  const dirty = useRef(false);
  const latest = useRef({ title: "", html: "<p></p>", plainText: "" });

  useEffect(() => { let active = true; void (async () => { if (!id) return; const row = await getNote(String(id), auth.user?.id ?? null); if (!active) return; setNote(row); setTitle(row?.title ?? ""); setHtml(row?.contentHtml ?? "<p></p>"); setPlainText(row?.plainText ?? ""); latest.current = { title: row?.title ?? "", html: row?.contentHtml ?? "<p></p>", plainText: row?.plainText ?? "" }; setState("saved"); })(); return () => { active = false; }; }, [auth.user?.id, id]);

  const persist = useCallback(async () => {
    if (!note) return;
    try {
      const value = latest.current;
      await saveNote(note.id, auth.user?.id ?? null, value.title, value.html, value.plainText);
      dirty.current = false; setState("saved");
      if (auth.user?.id) void syncPersonalContent(auth.user.id);
    } catch { setState("error"); }
  }, [auth.user?.id, note]);

  useEffect(() => {
    if (!note || !dirty.current) return;
    setState("saving");
    const timer = setTimeout(() => void persist(), 700);
    return () => clearTimeout(timer);
  }, [title, html, plainText, note, persist]);
  const updateTitle = (value: string) => { dirty.current = true; latest.current.title = value; setTitle(value); };
  const updateBody = (nextHtml: string, text: string) => { dirty.current = true; latest.current.html = nextHtml; latest.current.plainText = text; setHtml(nextHtml); setPlainText(text); };
  const download = async () => { if (!note) return; await persist(); try { await exportNotePdf({ title: latest.current.title.trim() || "Untitled note", contentHtml: latest.current.html }); } catch (error) { Alert.alert("PDF export failed", (error as Error)?.message || "Please try again."); } };

  if (state === "loading") return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator color={colors.tint} /></View>;
  if (!note) return <View style={[styles.center, { backgroundColor: colors.background }]}><Text style={{ color: colors.text }}>Note not found.</Text></View>;

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.background }]} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <Pressable accessibilityLabel="Back to notes" onPress={() => { void persist(); router.back(); }} style={styles.iconButton}><Ionicons name="arrow-back" size={22} color={colors.text} /></Pressable>
        <View style={styles.saveState}><View style={[styles.stateDot, { backgroundColor: state === "error" ? "#DC2626" : state === "saved" ? "#16A34A" : colors.subtleText }]} /><Text style={[styles.stateText, { color: colors.mutedText, fontFamily }]}>{state === "saving" ? "Saving…" : state === "error" ? "Saved locally" : auth.user ? "Saved · syncing" : "Saved on device"}</Text></View>
        <Pressable accessibilityLabel="Download note as PDF" onPress={() => void download()} style={[styles.pdfButton, { borderColor: colors.border }]}><Ionicons name="download-outline" size={18} color={colors.tint} /><Text style={[styles.pdfText, { color: colors.tint, fontFamily }]}>PDF</Text></Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TextInput value={title} onChangeText={updateTitle} placeholder="Note title" placeholderTextColor={colors.subtleText} multiline style={[styles.titleInput, { color: colors.text, fontFamily }]} />
        <Text style={[styles.help, { color: colors.mutedText, fontFamily }]}>Type /bible to insert Scripture at the cursor. Select words before tapping the link button to create named links.</Text>
        <RichTextEditor key={note.id} initialHtml={note.contentHtml} onChange={updateBody} darkMode={darkMode} tint={colors.tint} textColor={colors.text} borderColor={colors.border} cardColor={colors.background} minHeight={Math.max(420, windowHeight - 300)} seamless />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, center: { flex: 1, alignItems: "center", justifyContent: "center" }, header: { minHeight: 58, paddingHorizontal: 12, borderBottomWidth: 1, flexDirection: "row", alignItems: "center" }, iconButton: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" }, saveState: { flex: 1, flexDirection: "row", alignItems: "center", gap: 7, marginLeft: 4 }, stateDot: { width: 7, height: 7, borderRadius: 4 }, stateText: { fontSize: 11, fontWeight: "700" }, pdfButton: { minHeight: 40, borderWidth: 1, borderRadius: 12, paddingHorizontal: 11, flexDirection: "row", gap: 6, alignItems: "center" }, pdfText: { fontSize: 12, fontWeight: "800" },
  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 50 }, titleInput: { fontSize: 29, lineHeight: 36, fontWeight: "900", padding: 0, marginBottom: 7 }, help: { fontSize: 11, lineHeight: 16, marginBottom: 14 },
});
