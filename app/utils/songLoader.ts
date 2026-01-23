import songsEn from "@/assets/languages/english.json";
import songsLuo from "@/assets/languages/luo.json";
import songsSw from "@/assets/languages/swahili.json";

export type SongsJson = Record<
  string,
  {
    hymnNumber: number;
    language: string;
    title: string;
    stanzas: string[][];
    chorus: string[] | null;
  }
>;

export const SONGS_BY_LANG: Record<string, SongsJson> = {
  en: songsEn as SongsJson,
  sw: songsSw as SongsJson,
  luo: songsLuo as SongsJson,
};

export function getSongCount(lang: string) {
  const songs = SONGS_BY_LANG[lang];
  if (!songs) return 0;
  return Object.keys(songs).length;
}
