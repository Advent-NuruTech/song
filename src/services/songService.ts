import { runQuery } from "../db/queries";
import { Song } from "../models/song";

export async function getSongsByLanguage(lang: string) {
  const result: any = await runQuery(
    "SELECT * FROM songs WHERE language = ? ORDER BY hymnNumber ASC",
    [lang]
  );
  return result.rows._array as Song[];
}

export async function getSongById(id: string) {
  const result: any = await runQuery(
    "SELECT * FROM songs WHERE id = ?",
    [id]
  );
  return result.rows._array[0] as Song;
}
