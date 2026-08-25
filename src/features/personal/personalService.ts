import { Platform } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

import { supabase } from "@/src/auth/supabaseClient";
import { db } from "@/src/db/database";

export type UserNote = {
  id: string;
  ownerId: string | null;
  title: string;
  contentHtml: string;
  plainText: string;
  createdAt: number;
  updatedAt: number;
  deleted: number;
  syncState: "pending" | "synced";
};

export type SongPlaylist = {
  id: string;
  ownerId: string | null;
  title: string;
  songCount: number;
  createdAt: number;
  updatedAt: number;
  deleted: number;
  syncState: "pending" | "synced";
};

export type PlaylistSong = {
  id: string;
  title: string;
  hymnNumber: number;
  language: string;
  position: number;
};

function uuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function ownerWhere(userId: string | null) {
  return userId ? { clause: "(ownerId = ? OR ownerId IS NULL)", args: [userId] } : { clause: "ownerId IS NULL", args: [] };
}

export async function listNotes(userId: string | null, query = ""): Promise<UserNote[]> {
  const owner = ownerWhere(userId);
  const needle = query.trim();
  return db.getAllAsync<UserNote>(
    `SELECT * FROM user_notes WHERE deleted = 0 AND ${owner.clause}
     ${needle ? "AND (title LIKE ? OR plainText LIKE ?)" : ""}
     ORDER BY updatedAt DESC`,
    [...owner.args, ...(needle ? [`%${needle}%`, `%${needle}%`] : [])]
  );
}

export async function getNote(id: string, userId: string | null): Promise<UserNote | null> {
  const owner = ownerWhere(userId);
  return db.getFirstAsync<UserNote>(
    `SELECT * FROM user_notes WHERE id = ? AND deleted = 0 AND ${owner.clause} LIMIT 1`,
    [id, ...owner.args]
  );
}

export async function createNote(userId: string | null) {
  const id = uuid();
  const now = Date.now();
  await db.runAsync(
    `INSERT INTO user_notes (id, ownerId, title, contentHtml, plainText, createdAt, updatedAt, deleted, syncState)
     VALUES (?, ?, 'Untitled note', '<p></p>', '', ?, ?, 0, 'pending')`,
    [id, userId, now, now]
  );
  return id;
}

export async function saveNote(id: string, userId: string | null, title: string, contentHtml: string, plainText: string) {
  const cleanTitle = title.trim() || "Untitled note";
  await db.runAsync(
    `UPDATE user_notes SET ownerId = COALESCE(ownerId, ?), title = ?, contentHtml = ?, plainText = ?,
     updatedAt = ?, syncState = 'pending' WHERE id = ?`,
    [userId, cleanTitle, contentHtml || "<p></p>", plainText, Date.now(), id]
  );
}

export async function deleteNote(id: string) {
  await db.runAsync(
    `UPDATE user_notes SET deleted = 1, updatedAt = ?, syncState = 'pending' WHERE id = ?`,
    [Date.now(), id]
  );
}

export async function listPlaylists(userId: string | null): Promise<SongPlaylist[]> {
  const owner = ownerWhere(userId);
  return db.getAllAsync<SongPlaylist>(
    `SELECT p.*, COUNT(i.songId) AS songCount
     FROM song_playlists p LEFT JOIN song_playlist_items i ON i.playlistId = p.id
     WHERE p.deleted = 0 AND ${owner.clause}
     GROUP BY p.id ORDER BY p.updatedAt DESC`,
    owner.args
  );
}

export async function getPlaylist(id: string, userId: string | null): Promise<SongPlaylist | null> {
  const owner = ownerWhere(userId);
  return db.getFirstAsync<SongPlaylist>(
    `SELECT p.*, COUNT(i.songId) AS songCount
     FROM song_playlists p LEFT JOIN song_playlist_items i ON i.playlistId = p.id
     WHERE p.id = ? AND p.deleted = 0 AND ${owner.clause} GROUP BY p.id LIMIT 1`,
    [id, ...owner.args]
  );
}

export async function createPlaylist(userId: string | null, title: string) {
  const cleanTitle = title.trim();
  if (!cleanTitle) throw new Error("Give the playlist a title.");
  const id = uuid();
  const now = Date.now();
  await db.runAsync(
    `INSERT INTO song_playlists (id, ownerId, title, createdAt, updatedAt, deleted, syncState)
     VALUES (?, ?, ?, ?, ?, 0, 'pending')`,
    [id, userId, cleanTitle, now, now]
  );
  return id;
}

export async function renamePlaylist(id: string, title: string) {
  const cleanTitle = title.trim();
  if (!cleanTitle) throw new Error("Give the playlist a title.");
  await db.runAsync(
    `UPDATE song_playlists SET title = ?, updatedAt = ?, syncState = 'pending' WHERE id = ?`,
    [cleanTitle, Date.now(), id]
  );
}

export async function deletePlaylist(id: string) {
  await db.runAsync(
    `UPDATE song_playlists SET deleted = 1, updatedAt = ?, syncState = 'pending' WHERE id = ?`,
    [Date.now(), id]
  );
}

export async function listPlaylistSongs(playlistId: string): Promise<PlaylistSong[]> {
  return db.getAllAsync<PlaylistSong>(
    `SELECT s.id, s.title, s.hymnNumber, s.language, i.position
     FROM song_playlist_items i JOIN songs s ON s.id = i.songId
     WHERE i.playlistId = ? ORDER BY i.position ASC`,
    [playlistId]
  );
}

export async function addSongToPlaylist(playlistId: string, songId: string) {
  const row = await db.getFirstAsync<{ nextPosition: number }>(
    `SELECT COALESCE(MAX(position), -1) + 1 AS nextPosition FROM song_playlist_items WHERE playlistId = ?`,
    [playlistId]
  );
  await db.runAsync(
    `INSERT OR IGNORE INTO song_playlist_items (playlistId, songId, position, addedAt) VALUES (?, ?, ?, ?)`,
    [playlistId, songId, row?.nextPosition ?? 0, Date.now()]
  );
  await db.runAsync(
    `UPDATE song_playlists SET updatedAt = ?, syncState = 'pending' WHERE id = ?`,
    [Date.now(), playlistId]
  );
}

export async function removeSongFromPlaylist(playlistId: string, songId: string) {
  await db.withTransactionAsync(async () => {
    await db.runAsync(`DELETE FROM song_playlist_items WHERE playlistId = ? AND songId = ?`, [playlistId, songId]);
    const items = await db.getAllAsync<{ songId: string }>(
      `SELECT songId FROM song_playlist_items WHERE playlistId = ? ORDER BY position`,
      [playlistId]
    );
    for (let position = 0; position < items.length; position += 1) {
      await db.runAsync(
        `UPDATE song_playlist_items SET position = ? WHERE playlistId = ? AND songId = ?`,
        [position, playlistId, items[position].songId]
      );
    }
    await db.runAsync(
      `UPDATE song_playlists SET updatedAt = ?, syncState = 'pending' WHERE id = ?`,
      [Date.now(), playlistId]
    );
  });
}

export async function getPlaylistNeighbors(playlistId: string, songId: string) {
  const songs = await listPlaylistSongs(playlistId);
  const index = songs.findIndex((song) => song.id === songId);
  return {
    index,
    count: songs.length,
    previousId: index > 0 ? songs[index - 1].id : null,
    nextId: index >= 0 && index < songs.length - 1 ? songs[index + 1].id : null,
  };
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#39;");
}

function safeDocumentHtml(note: Pick<UserNote, "title" | "contentHtml">) {
  const body = note.contentHtml
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+\s*=\s*(?:\"[^\"]*\"|'[^']*')/gi, "");
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    @page { margin: 22mm 19mm 20mm; } body { color:#172033; font-family: Arial, Helvetica, sans-serif; font-size: 11.5pt; line-height:1.65; }
    h1.title { font-size:25pt; line-height:1.15; margin:0 0 8mm; color:#0f172a; } h1,h2,h3 { page-break-after:avoid; color:#0f172a; }
    p { margin:0 0 10pt; } a { color:#075985; text-decoration:underline; } img { display:block; max-width:100%; height:auto; margin:14pt auto; page-break-inside:avoid; }
    blockquote { border-left:3px solid #0a7ea4; margin:14pt 0; padding:2pt 0 2pt 12pt; color:#475569; } ul,ol { padding-left:22pt; }
    footer { position:fixed; bottom:-12mm; left:0; right:0; color:#94a3b8; font-size:8pt; text-align:center; }
  </style></head><body><h1 class="title">${escapeHtml(note.title)}</h1>${body}<footer>Exported from Advent Pro Notes</footer></body></html>`;
}

export async function exportNotePdf(note: Pick<UserNote, "title" | "contentHtml">) {
  const html = safeDocumentHtml(note);
  if (Platform.OS === "web") {
    await Print.printAsync({ html });
    return;
  }
  const result = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(result.uri, {
      mimeType: "application/pdf",
      dialogTitle: `Save ${note.title} as PDF`,
      UTI: "com.adobe.pdf",
    });
  }
}

type RemoteNote = { id: string; user_id: string; title: string; content_html: string; plain_text: string; created_at: string; updated_at: string; deleted: boolean };
type RemotePlaylist = { id: string; user_id: string; title: string; created_at: string; updated_at: string; deleted: boolean };
type RemoteItem = { playlist_id: string; song_id: string; position: number; added_at: string };

export async function syncPersonalContent(userId: string) {
  // Notes or playlists first created while signed out belong to the first account that syncs them.
  await db.runAsync(`UPDATE user_notes SET ownerId = ? WHERE ownerId IS NULL`, [userId]);
  await db.runAsync(`UPDATE song_playlists SET ownerId = ? WHERE ownerId IS NULL`, [userId]);

  const pendingNotes = await db.getAllAsync<UserNote>(
    `SELECT * FROM user_notes WHERE ownerId = ? AND syncState = 'pending'`, [userId]
  );
  for (const note of pendingNotes) {
    const { error } = await supabase.from("user_notes").upsert({
      id: note.id, user_id: userId, title: note.title, content_html: note.contentHtml,
      plain_text: note.plainText, created_at: new Date(note.createdAt).toISOString(),
      updated_at: new Date(note.updatedAt).toISOString(), deleted: Boolean(note.deleted),
    });
    if (!error) await db.runAsync(`UPDATE user_notes SET syncState = 'synced' WHERE id = ?`, [note.id]);
  }

  const pendingPlaylists = await db.getAllAsync<SongPlaylist>(
    `SELECT p.*, 0 AS songCount FROM song_playlists p WHERE ownerId = ? AND syncState = 'pending'`, [userId]
  );
  for (const playlist of pendingPlaylists) {
    const { error } = await supabase.from("song_playlists").upsert({
      id: playlist.id, user_id: userId, title: playlist.title,
      created_at: new Date(playlist.createdAt).toISOString(), updated_at: new Date(playlist.updatedAt).toISOString(),
      deleted: Boolean(playlist.deleted),
    });
    if (error) continue;
    if (!playlist.deleted) {
      const items = await db.getAllAsync<{ playlistId: string; songId: string; position: number; addedAt: number }>(
        `SELECT * FROM song_playlist_items WHERE playlistId = ? ORDER BY position`, [playlist.id]
      );
      const { error: deleteError } = await supabase.from("song_playlist_items").delete().eq("playlist_id", playlist.id);
      if (deleteError) continue;
      if (items.length) {
        const { error: itemError } = await supabase.from("song_playlist_items").insert(items.map((item) => ({
          playlist_id: playlist.id, song_id: item.songId, position: item.position,
          added_at: new Date(item.addedAt).toISOString(),
        })));
        if (itemError) continue;
      }
    }
    await db.runAsync(`UPDATE song_playlists SET syncState = 'synced' WHERE id = ?`, [playlist.id]);
  }

  const [{ data: noteRows, error: notesError }, { data: playlistRows, error: playlistsError }] = await Promise.all([
    supabase.from("user_notes").select("*").eq("user_id", userId),
    supabase.from("song_playlists").select("*").eq("user_id", userId),
  ]);
  if (!notesError) {
    for (const remote of (noteRows ?? []) as RemoteNote[]) {
      const local = await db.getFirstAsync<UserNote>(`SELECT * FROM user_notes WHERE id = ?`, [remote.id]);
      const remoteUpdated = Date.parse(remote.updated_at);
      if (local?.syncState === "pending" && local.updatedAt > remoteUpdated) continue;
      await db.runAsync(
        `INSERT INTO user_notes (id, ownerId, title, contentHtml, plainText, createdAt, updatedAt, deleted, syncState)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'synced')
         ON CONFLICT(id) DO UPDATE SET ownerId=excluded.ownerId,title=excluded.title,contentHtml=excluded.contentHtml,
         plainText=excluded.plainText,createdAt=excluded.createdAt,updatedAt=excluded.updatedAt,deleted=excluded.deleted,syncState='synced'`,
        [remote.id, userId, remote.title, remote.content_html, remote.plain_text, Date.parse(remote.created_at), remoteUpdated, remote.deleted ? 1 : 0]
      );
    }
  }
  if (!playlistsError) {
    for (const remote of (playlistRows ?? []) as RemotePlaylist[]) {
      const local = await db.getFirstAsync<SongPlaylist>(`SELECT p.*, 0 AS songCount FROM song_playlists p WHERE id = ?`, [remote.id]);
      const remoteUpdated = Date.parse(remote.updated_at);
      if (local?.syncState === "pending" && local.updatedAt > remoteUpdated) continue;
      await db.runAsync(
        `INSERT INTO song_playlists (id, ownerId, title, createdAt, updatedAt, deleted, syncState)
         VALUES (?, ?, ?, ?, ?, ?, 'synced')
         ON CONFLICT(id) DO UPDATE SET ownerId=excluded.ownerId,title=excluded.title,createdAt=excluded.createdAt,
         updatedAt=excluded.updatedAt,deleted=excluded.deleted,syncState='synced'`,
        [remote.id, userId, remote.title, Date.parse(remote.created_at), remoteUpdated, remote.deleted ? 1 : 0]
      );
      if (!remote.deleted) {
        const { data: remoteItems, error: itemError } = await supabase
          .from("song_playlist_items").select("*").eq("playlist_id", remote.id).order("position");
        if (!itemError) {
          await db.withTransactionAsync(async () => {
            await db.runAsync(`DELETE FROM song_playlist_items WHERE playlistId = ?`, [remote.id]);
            for (const item of (remoteItems ?? []) as RemoteItem[]) {
              await db.runAsync(
                `INSERT INTO song_playlist_items (playlistId, songId, position, addedAt) VALUES (?, ?, ?, ?)`,
                [item.playlist_id, item.song_id, item.position, Date.parse(item.added_at)]
              );
            }
          });
        }
      }
    }
  }
}

