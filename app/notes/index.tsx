import { Ionicons } from "@expo/vector-icons";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { useAppTheme } from "@/hooks/use-app-theme";
import { useAuth } from "@/src/auth/AuthContext";
import { createNote, deleteNote, listNotes, syncPersonalContent, type UserNote } from "@/src/features/personal/personalService";

function relativeTime(timestamp: number) {
  const seconds = Math.max(1, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return new Date(timestamp).toLocaleDateString();
}

export default function NotesScreen() {
  const router = useRouter();
  const auth = useAuth();
  const { colors, size, fontFamily } = useAppTheme();
  const [notes, setNotes] = useState<UserNote[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const rows = await listNotes(auth.user?.id ?? null, query);
    setNotes(rows); setLoading(false);
  }, [auth.user?.id, query]);

  useFocusEffect(useCallback(() => { void (async () => { if (auth.user?.id) await syncPersonalContent(auth.user.id); await load(); })(); }, [auth.user?.id, load]));

  const add = async () => {
    const id = await createNote(auth.user?.id ?? null);
    router.push({ pathname: "/notes/[id]", params: { id } });
  };
  const remove = (note: UserNote) => Alert.alert("Delete note?", `“${note.title}” will be removed from this device and your account.`, [
    { text: "Cancel", style: "cancel" },
    { text: "Delete", style: "destructive", onPress: () => void (async () => { await deleteNote(note.id); if (auth.user?.id) void syncPersonalContent(auth.user.id); await load(); })() },
  ]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.headingRow}>
        <View style={styles.headingCopy}><Text style={[styles.title, { color: colors.text, fontFamily, fontSize: size(28) }]}>My notes</Text><Text style={[styles.subtitle, { color: colors.mutedText, fontFamily }]}>Write offline. Sync everywhere.</Text></View>
        <Pressable accessibilityLabel="Create note" onPress={() => void add()} style={[styles.addButton, { backgroundColor: colors.tint }]}><Ionicons name="add" size={25} color="#fff" /></Pressable>
      </View>
      {!auth.user && <Pressable onPress={() => router.push("/account")} style={[styles.banner, { backgroundColor: `${colors.tint}12`, borderColor: `${colors.tint}55` }]}><Ionicons name="cloud-offline-outline" size={21} color={colors.tint} /><View style={styles.bannerCopy}><Text style={[styles.bannerTitle, { color: colors.text, fontFamily }]}>Saved on this device</Text><Text style={[styles.bannerText, { color: colors.mutedText, fontFamily }]}>Sign in to sync and open your notes anywhere.</Text></View><Ionicons name="chevron-forward" size={18} color={colors.tint} /></Pressable>}
      <View style={[styles.search, { backgroundColor: colors.card, borderColor: colors.border }]}><Ionicons name="search" size={19} color={colors.mutedText} /><TextInput value={query} onChangeText={setQuery} onSubmitEditing={() => void load()} placeholder="Search notes" placeholderTextColor={colors.subtleText} style={[styles.searchInput, { color: colors.text, fontFamily }]} /></View>
      <FlatList
        data={notes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, !notes.length && styles.emptyList]}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => <Pressable onPress={() => router.push({ pathname: "/notes/[id]", params: { id: item.id } })} style={({ pressed }) => [styles.card, { backgroundColor: colors.card, borderColor: colors.border }, pressed && styles.pressed]}>
          <View style={[styles.noteIcon, { backgroundColor: `${colors.tint}12` }]}><Ionicons name="document-text-outline" size={22} color={colors.tint} /></View>
          <View style={styles.noteCopy}><Text numberOfLines={1} style={[styles.noteTitle, { color: colors.text, fontFamily }]}>{item.title}</Text><Text numberOfLines={2} style={[styles.preview, { color: colors.mutedText, fontFamily }]}>{item.plainText.trim() || "Empty note"}</Text><View style={styles.meta}><Text style={[styles.metaText, { color: colors.subtleText, fontFamily }]}>{relativeTime(item.updatedAt)}</Text>{item.syncState === "pending" && <><View style={[styles.dot, { backgroundColor: colors.subtleText }]} /><Text style={[styles.metaText, { color: colors.subtleText, fontFamily }]}>{auth.user ? "Waiting to sync" : "On device"}</Text></>}</View></View>
          <Pressable accessibilityLabel={`Delete ${item.title}`} hitSlop={10} onPress={() => remove(item)} style={styles.more}><Ionicons name="trash-outline" size={19} color={colors.mutedText} /></Pressable>
        </Pressable>}
        ListEmptyComponent={<View style={styles.empty}><View style={[styles.emptyIcon, { backgroundColor: `${colors.tint}10` }]}><Ionicons name="document-text-outline" size={38} color={colors.tint} /></View><Text style={[styles.emptyTitle, { color: colors.text, fontFamily }]}>{loading ? "Loading notes…" : query ? "No matching notes" : "Your first note starts here"}</Text><Text style={[styles.emptyText, { color: colors.mutedText, fontFamily }]}>{query ? "Try a different word." : "Capture sermon points, rehearsals, ideas, and links."}</Text>{!loading && !query && <Pressable onPress={() => void add()} style={[styles.emptyButton, { backgroundColor: colors.tint }]}><Text style={styles.emptyButtonText}>Create a note</Text></Pressable>}</View>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, headingRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingTop: 24, paddingBottom: 16 }, headingCopy: { flex: 1 }, title: { fontWeight: "900" }, subtitle: { fontSize: 13, marginTop: 3 }, addButton: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  banner: { marginHorizontal: 20, marginBottom: 14, borderWidth: 1, borderRadius: 15, padding: 13, flexDirection: "row", alignItems: "center", gap: 11 }, bannerCopy: { flex: 1 }, bannerTitle: { fontSize: 13, fontWeight: "800" }, bannerText: { fontSize: 11, marginTop: 2 },
  search: { marginHorizontal: 20, marginBottom: 16, borderWidth: 1, borderRadius: 15, minHeight: 48, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 10 }, searchInput: { flex: 1, fontSize: 15 }, list: { paddingHorizontal: 20, paddingBottom: 40, gap: 11 }, emptyList: { flexGrow: 1 },
  card: { minHeight: 112, borderWidth: 1, borderRadius: 18, padding: 15, flexDirection: "row", alignItems: "flex-start", gap: 13 }, pressed: { opacity: .72 }, noteIcon: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center" }, noteCopy: { flex: 1 }, noteTitle: { fontSize: 16, fontWeight: "800" }, preview: { fontSize: 13, lineHeight: 18, marginTop: 5 }, meta: { flexDirection: "row", alignItems: "center", marginTop: 7, gap: 6 }, metaText: { fontSize: 10, fontWeight: "600" }, dot: { width: 3, height: 3, borderRadius: 2 }, more: { padding: 4 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 30, paddingBottom: 80 }, emptyIcon: { width: 76, height: 76, borderRadius: 24, alignItems: "center", justifyContent: "center" }, emptyTitle: { fontSize: 19, fontWeight: "900", marginTop: 17, textAlign: "center" }, emptyText: { fontSize: 13, lineHeight: 20, textAlign: "center", marginTop: 7 }, emptyButton: { marginTop: 18, borderRadius: 13, paddingHorizontal: 18, paddingVertical: 12 }, emptyButtonText: { color: "#fff", fontWeight: "800" },
});

