import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { useAppTheme } from "@/hooks/use-app-theme";
import { useAuth } from "@/src/auth/AuthContext";
import { addSongToPlaylist, createPlaylist, listPlaylists, syncPersonalContent, type SongPlaylist } from "@/src/features/personal/personalService";

export function AddToPlaylistSheet({ visible, songId, songTitle, onClose, onAdded }: { visible: boolean; songId: string; songTitle: string; onClose: () => void; onAdded?: (title: string) => void }) {
  const auth = useAuth();
  const { colors, fontFamily } = useAppTheme();
  const [playlists, setPlaylists] = useState<SongPlaylist[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (visible) void listPlaylists(auth.user?.id ?? null).then(setPlaylists); }, [auth.user?.id, visible]);
  const add = async (playlist: SongPlaylist) => {
    setBusy(true); await addSongToPlaylist(playlist.id, songId); if (auth.user?.id) void syncPersonalContent(auth.user.id); setBusy(false); onClose(); onAdded?.(playlist.title);
  };
  const createAndAdd = async () => {
    if (!newTitle.trim()) return;
    setBusy(true); const id = await createPlaylist(auth.user?.id ?? null, newTitle); await addSongToPlaylist(id, songId); if (auth.user?.id) void syncPersonalContent(auth.user.id); const title = newTitle.trim(); setNewTitle(""); setBusy(false); onClose(); onAdded?.(title);
  };

  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <Pressable style={styles.backdrop} onPress={onClose}><Pressable style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={(event) => event.stopPropagation()}>
      <View style={[styles.handle, { backgroundColor: colors.border }]} />
      <View style={styles.sheetHeader}><View style={styles.headerCopy}><Text style={[styles.title, { color: colors.text, fontFamily }]}>Add to playlist</Text><Text numberOfLines={1} style={[styles.song, { color: colors.mutedText, fontFamily }]}>{songTitle}</Text></View><Pressable onPress={onClose} style={styles.close}><Ionicons name="close" size={22} color={colors.text} /></Pressable></View>
      <View style={[styles.createRow, { borderColor: colors.border }]}><TextInput value={newTitle} onChangeText={setNewTitle} placeholder="New playlist title" placeholderTextColor={colors.subtleText} style={[styles.input, { color: colors.text, fontFamily }]} /><Pressable disabled={busy || !newTitle.trim()} onPress={() => void createAndAdd()} style={[styles.createButton, { backgroundColor: colors.tint, opacity: newTitle.trim() ? 1 : .45 }]}><Ionicons name="add" size={21} color="#fff" /><Text style={styles.createText}>Create</Text></Pressable></View>
      <ScrollView contentContainerStyle={styles.list}>{playlists.map((playlist) => <Pressable disabled={busy} key={playlist.id} onPress={() => void add(playlist)} style={({ pressed }) => [styles.row, { borderColor: colors.border }, pressed && { opacity: .65 }]}><View style={[styles.icon, { backgroundColor: `${colors.tint}12` }]}><Ionicons name="musical-notes" size={21} color={colors.tint} /></View><View style={styles.rowCopy}><Text style={[styles.rowTitle, { color: colors.text, fontFamily }]}>{playlist.title}</Text><Text style={[styles.count, { color: colors.mutedText, fontFamily }]}>{playlist.songCount} {playlist.songCount === 1 ? "song" : "songs"}</Text></View><Ionicons name="add-circle-outline" size={23} color={colors.tint} /></Pressable>)}{!playlists.length && <Text style={[styles.empty, { color: colors.mutedText, fontFamily }]}>No playlists yet. Name one above to create it.</Text>}</ScrollView>
      {busy && <ActivityIndicator style={styles.busy} color={colors.tint} />}
    </Pressable></Pressable>
  </Modal>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(2,6,23,.5)", justifyContent: "flex-end" }, sheet: { maxHeight: "78%", minHeight: 360, borderWidth: 1, borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 18 }, handle: { width: 38, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 15 }, sheetHeader: { flexDirection: "row", alignItems: "center", marginBottom: 15 }, headerCopy: { flex: 1 }, title: { fontSize: 21, fontWeight: "900" }, song: { fontSize: 12, marginTop: 3 }, close: { width: 38, height: 38, alignItems: "center", justifyContent: "center" }, createRow: { minHeight: 50, borderWidth: 1, borderRadius: 14, flexDirection: "row", alignItems: "center", paddingLeft: 12, overflow: "hidden", marginBottom: 13 }, input: { flex: 1, fontSize: 14 }, createButton: { alignSelf: "stretch", paddingHorizontal: 13, flexDirection: "row", alignItems: "center", gap: 4 }, createText: { color: "#fff", fontWeight: "800", fontSize: 12 }, list: { gap: 9, paddingBottom: 20 }, row: { minHeight: 66, borderWidth: 1, borderRadius: 15, flexDirection: "row", alignItems: "center", padding: 11, gap: 11 }, icon: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center" }, rowCopy: { flex: 1 }, rowTitle: { fontSize: 15, fontWeight: "800" }, count: { fontSize: 11, marginTop: 3 }, empty: { textAlign: "center", marginTop: 24, fontSize: 13 }, busy: { position: "absolute", top: 22, right: 62 },
});

