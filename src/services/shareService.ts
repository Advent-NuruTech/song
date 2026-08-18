import { Share } from "react-native";
import * as Clipboard from "expo-clipboard";

const APP_NAME = "Advent Pro";
const DOWNLOAD_URL = "https://play.google.com/store/apps/details?id=com.adventpro";

/** Compact attribution footer appended to shared content. */
function buildFooter() {
  return [`— Shared from ${APP_NAME}`, DOWNLOAD_URL].join("\n");
}

/** Collapse 3+ blank lines into a single blank line and trim ends. */
function tidy(text: string) {
  return text.replace(/\n{3,}/g, "\n\n").replace(/[ \t]+\n/g, "\n").trim();
}

function prettyLanguage(language?: string | null) {
  if (!language) return "";
  return language.charAt(0).toUpperCase() + language.slice(1);
}

// ---------------------------------------------------------------------------
// Low-level actions (share / copy)
// ---------------------------------------------------------------------------

/** Open the OS share sheet with the given message. */
export async function shareText(message: string, title: string) {
  try {
    await Share.share({ title, message: message.trim() });
  } catch (error) {
    console.error("Share failed:", error);
  }
}

/** Copy text to the clipboard. Returns true on success. */
export async function copyText(message: string): Promise<boolean> {
  try {
    await Clipboard.setStringAsync(message.trim());
    return true;
  } catch (error) {
    console.error("Copy failed:", error);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Songs — share the FULL hymn (great for WhatsApp status)
// ---------------------------------------------------------------------------

export type ShareableSong = {
  title: string;
  hymnNumber?: number | null;
  language?: string | null;
  author?: string | null;
  stanzas: string[][];
  chorus: string[];
};

/**
 * Render a hymn as clean, readable text: numbered stanzas with the chorus
 * shown once after the first stanza. Optimised for messaging / status posts.
 */
export function formatSongText(song: ShareableSong, withFooter = true): string {
  const headerBits: string[] = [];
  if (song.hymnNumber != null) headerBits.push(`Hymn #${song.hymnNumber}`);
  const lang = prettyLanguage(song.language);
  if (lang) headerBits.push(lang);

  const parts: string[] = [];
  parts.push(`🎵 ${song.title}`);
  if (headerBits.length) parts.push(headerBits.join(" · "));
  parts.push("");

  const chorusBlock = song.chorus.length
    ? ["[Chorus]", ...song.chorus].join("\n")
    : "";

  song.stanzas.forEach((stanza, index) => {
    const lines = stanza.map((line) => line.trim()).filter(Boolean);
    if (!lines.length) return;
    parts.push(`${index + 1}.`);
    parts.push(lines.join("\n"));
    parts.push("");
    // Echo the chorus after the first stanza so the song reads as sung.
    if (index === 0 && chorusBlock) {
      parts.push(chorusBlock);
      parts.push("");
    }
  });

  if (song.author) parts.push(`Author: ${song.author}`);

  let text = tidy(parts.join("\n"));
  if (withFooter) text = `${text}\n\n${buildFooter()}`;
  return text;
}

export async function shareSong(song: ShareableSong) {
  await shareText(formatSongText(song), `${song.title} — ${APP_NAME}`);
}

export async function copySong(song: ShareableSong): Promise<boolean> {
  // Copy without the promo footer so the lyrics paste cleanly.
  return copyText(formatSongText(song, false));
}

/**
 * Lightweight share for list/search rows where the full lyrics aren't loaded —
 * shares the title + number rather than the whole hymn.
 */
export async function shareSongLink(params: {
  title: string;
  hymnNumber?: number | null;
  language?: string | null;
}) {
  const bits = [`"${params.title}"`];
  if (params.hymnNumber != null) bits.push(`#${params.hymnNumber}`);
  const lang = prettyLanguage(params.language);
  if (lang) bits.push(lang);
  const message = tidy(
    [
      `I'm singing ${bits.join(" · ")} on ${APP_NAME}.`,
      "",
      buildFooter(),
    ].join("\n")
  );
  await shareText(message, `${APP_NAME} Song`);
}

// ---------------------------------------------------------------------------
// Scripture — whole chapter or a selection of verses
// ---------------------------------------------------------------------------

export type ShareVerse = { verse: number; text: string };

/** Build a reference like "John 3" or "John 3:16" / "John 3:16-18". */
export function verseReference(
  book: string,
  chapter: number,
  verses?: ShareVerse[]
): string {
  if (!verses || !verses.length) return `${book} ${chapter}`;
  const nums = verses.map((v) => v.verse).sort((a, b) => a - b);
  // Compress a contiguous run into "a-b"; otherwise list with commas.
  const ranges: string[] = [];
  let start = nums[0];
  let prev = nums[0];
  for (let i = 1; i < nums.length; i += 1) {
    if (nums[i] === prev + 1) {
      prev = nums[i];
      continue;
    }
    ranges.push(start === prev ? `${start}` : `${start}-${prev}`);
    start = nums[i];
    prev = nums[i];
  }
  ranges.push(start === prev ? `${start}` : `${start}-${prev}`);
  return `${book} ${chapter}:${ranges.join(",")}`;
}

export function formatScriptureText(
  reference: string,
  verses: ShareVerse[],
  withFooter = true
): string {
  const body = verses.map((v) => `${v.verse}. ${v.text.trim()}`).join("\n");
  const text = tidy([reference, "", body].join("\n"));
  return withFooter ? `${text}\n\n${buildFooter()}` : text;
}

export async function shareScripture(reference: string, verses: ShareVerse[]) {
  const message = formatScriptureText(reference, verses).slice(0, 4000);
  await shareText(message, `${reference} — ${APP_NAME}`);
}

export async function copyScripture(
  reference: string,
  verses: ShareVerse[]
): Promise<boolean> {
  return copyText(formatScriptureText(reference, verses, false));
}

// ---------------------------------------------------------------------------
// Studies — share the full reading, stripped of editor markup
// ---------------------------------------------------------------------------

export type ShareableStudy = {
  title: string;
  subtitle?: string | null;
  category?: string | null;
  author?: string | null;
  content: string;
};

/** Convert the study's lightweight markup to clean, paste-ready plain text. */
export function stripStudyMarkup(content: string): string {
  return content
    .replace(/\[color=[^\]]+\]([\s\S]*?)\[\/color\]/g, "$1") // color tags
    .replace(/\*\*(.+?)\*\*/g, "$1") // bold
    .replace(/^#{2,3}\s+/gm, "") // heading markers
    .replace(/^\s*[-*]\s+/gm, "• ") // bullets
    .replace(/^\s*(\d+)\.\s+/gm, "$1. "); // numbered lists
}

export function formatStudyText(study: ShareableStudy, withFooter = true): string {
  const meta = [study.category, study.author ? `by ${study.author}` : null]
    .filter(Boolean)
    .join(" · ");

  const parts: string[] = [study.title];
  if (study.subtitle) parts.push(study.subtitle);
  if (meta) parts.push(meta);
  parts.push("");
  parts.push(stripStudyMarkup(study.content));

  const text = tidy(parts.join("\n"));
  return withFooter ? `${text}\n\n${buildFooter()}` : text;
}

export async function shareStudy(study: ShareableStudy) {
  await shareText(formatStudyText(study), `${study.title} — ${APP_NAME}`);
}

export async function copyStudy(study: ShareableStudy): Promise<boolean> {
  return copyText(formatStudyText(study, false));
}

/** Share just the title/metadata of a study (a quick "recommend this read"). */
export async function shareStudyLink(study: {
  title: string;
  category?: string | null;
  author?: string | null;
}) {
  const meta = [study.category, study.author ? `by ${study.author}` : null]
    .filter(Boolean)
    .join(" · ");
  const message = tidy(
    [
      `I'm reading "${study.title}" on ${APP_NAME}.`,
      meta,
      "",
      buildFooter(),
    ].join("\n")
  );
  await shareText(message, `${APP_NAME} Study`);
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

export async function shareApp() {
  const message = tidy(
    [
      "Discover Advent Pro: songs, hymns, and Bible studies in one place.",
      "",
      buildFooter(),
    ].join("\n")
  );
  await shareText(message, `${APP_NAME} App`);
}
