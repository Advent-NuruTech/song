import { Share } from "react-native";
import * as Clipboard from "expo-clipboard";

const APP_NAME = "Advent Pro";
const DOWNLOAD_URL = "https://play.google.com/store/apps/details?id=com.adventpro";

/** Compact attribution footer appended to shared content. */
function buildFooter() {
  return [`— Shared from ${APP_NAME}`, DOWNLOAD_URL].join("\n");
}

/** Build a deep link that opens the content directly in the app. */
function buildDeepLink(path: string) {
  return `adventpro://${path}`;
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
    const result = await Share.share({ title, message: message.trim() });
    return result.action === Share.sharedAction;
  } catch (error) {
    console.error("Share failed:", error);
    return false;
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
  id: string;
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
  text = `${text}\n\n${buildDeepLink(`song/${song.id}`)}`;
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

// ---------------------------------------------------------------------------
// Songs — share a single STANZA or CHORUS
// ---------------------------------------------------------------------------

/** Format a single stanza with identifying header. */
export function formatStanzaText(
  song: ShareableSong,
  stanzaIndex: number,
  withFooter = true
): string {
  const headerBits: string[] = [];
  if (song.hymnNumber != null) headerBits.push(`Hymn #${song.hymnNumber}`);
  const lang = prettyLanguage(song.language);
  if (lang) headerBits.push(lang);

  const parts: string[] = [`🎵 ${song.title}`];
  if (headerBits.length) parts.push(headerBits.join(" · "));
  parts.push(`Stanza ${stanzaIndex + 1}`);
  parts.push("");

  const stanza = song.stanzas[stanzaIndex];
  if (stanza) {
    const lines = stanza.map((l) => l.trim()).filter(Boolean);
    parts.push(lines.join("\n"));
  }

  let text = tidy(parts.join("\n"));
  text = `${text}\n\n${buildDeepLink(`song/${song.id}`)}`;
  if (withFooter) text = `${text}\n\n${buildFooter()}`;
  return text;
}

export async function shareStanza(song: ShareableSong, stanzaIndex: number) {
  await shareText(
    formatStanzaText(song, stanzaIndex),
    `${song.title} — Stanza ${stanzaIndex + 1} — ${APP_NAME}`
  );
}

export async function copyStanza(
  song: ShareableSong,
  stanzaIndex: number
): Promise<boolean> {
  return copyText(formatStanzaText(song, stanzaIndex, false));
}

/** Format just the chorus with identifying header. */
export function formatChorusText(
  song: ShareableSong,
  withFooter = true
): string {
  const headerBits: string[] = [];
  if (song.hymnNumber != null) headerBits.push(`Hymn #${song.hymnNumber}`);
  const lang = prettyLanguage(song.language);
  if (lang) headerBits.push(lang);

  const parts: string[] = [`🎵 ${song.title}`];
  if (headerBits.length) parts.push(headerBits.join(" · "));
  parts.push("Chorus");
  parts.push("");

  if (song.chorus.length) {
    parts.push(song.chorus.join("\n"));
  }

  let text = tidy(parts.join("\n"));
  text = `${text}\n\n${buildDeepLink(`song/${song.id}`)}`;
  if (withFooter) text = `${text}\n\n${buildFooter()}`;
  return text;
}

export async function shareChorus(song: ShareableSong) {
  await shareText(
    formatChorusText(song),
    `${song.title} — Chorus — ${APP_NAME}`
  );
}

export async function copyChorus(song: ShareableSong): Promise<boolean> {
  return copyText(formatChorusText(song, false));
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

/** Share an exact, user-selected portion of scripture. */
export async function shareScriptureExcerpt(reference: string, excerpt: string) {
  const message = tidy([reference, "", excerpt, "", buildFooter()].join("\n")).slice(0, 4000);
  await shareText(message, `${reference} — ${APP_NAME}`);
}

/** Copy an exact scripture excerpt without promotional text. */
export async function copyScriptureExcerpt(
  reference: string,
  excerpt: string
): Promise<boolean> {
  return copyText(tidy([reference, "", excerpt].join("\n")));
}

// ---------------------------------------------------------------------------
// Studies — share the full reading, stripped of editor markup
// ---------------------------------------------------------------------------

export type ShareableStudy = {
  id: string;
  title: string;
  subtitle?: string | null;
  category?: string | null;
  author?: string | null;
  content: string;
};

/** Convert rich HTML or legacy lightweight markup to clean, paste-ready text. */
export function stripStudyMarkup(content: string): string {
  return content
    .replace(/<\s*br\s*\/?\s*>/gi, "\n")
    .replace(/<\s*\/\s*(p|div|h[1-6]|blockquote|pre|figcaption|tr)\s*>/gi, "\n")
    .replace(/<\s*li\b[^>]*>/gi, "• ")
    .replace(/<\s*\/\s*li\s*>/gi, "\n")
    .replace(/<\s*img\b[^>]*\balt=(?:"([^"]*)"|'([^']*)')[^>]*>/gi, (_match, doubleQuoted, singleQuoted) => doubleQuoted || singleQuoted || "")
    .replace(/<[^>]+>/g, "")
    .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_match, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\[color=[^\]]+\]([\s\S]*?)\[\/color\]/g, "$1") // color tags
    .replace(/\*\*(.+?)\*\*/g, "$1") // bold
    .replace(/^#{2,3}\s+/gm, "") // heading markers
    .replace(/^\s*[-*]\s+/gm, "• ") // bullets
    .replace(/^\s*(\d+)\.\s+/gm, "$1. ") // numbered lists
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function formatStudyText(study: ShareableStudy, withFooter = true): string {
  const meta = [study.category, study.author ? `by ${study.author}` : null]
    .filter(Boolean)
    .join(" · ");

  const parts: string[] = [study.title];
  if (study.subtitle) parts.push(study.subtitle);
  if (meta) parts.push(meta);
  parts.push("");

  const stripped = stripStudyMarkup(study.content);
  parts.push(stripped);

  const deepLink = buildDeepLink(`studies/${study.id}`);
  parts.push("");
  parts.push(`Read more in ${APP_NAME}: ${deepLink}`);

  const text = tidy(parts.join("\n"));
  return withFooter ? `${text}\n\n${buildFooter()}` : text;
}

export async function shareStudy(study: ShareableStudy) {
  return shareText(formatStudyText(study), `${study.title} — ${APP_NAME}`);
}

export async function copyStudy(study: ShareableStudy): Promise<boolean> {
  return copyText(formatStudyText(study, false));
}

/** Share just the title/metadata of a study with a content snippet preview. */
export async function shareStudyLink(study: {
  id: string;
  title: string;
  subtitle?: string | null;
  category?: string | null;
  author?: string | null;
  content?: string | null;
}) {
  const meta = [study.category, study.author ? `by ${study.author}` : null]
    .filter(Boolean)
    .join(" · ");

  const parts: string[] = [`I'm reading "${study.title}" on ${APP_NAME}.`];
  if (meta) parts.push(meta);

  if (study.content) {
    const snippet = stripStudyMarkup(study.content)
      .replace(/\n{2,}/g, " ")
      .trim()
      .slice(0, 200);
    if (snippet.length > 0) {
      parts.push("");
      parts.push(snippet.length < study.content.length ? `${snippet}...` : snippet);
    }
  }

  parts.push("");
  parts.push(buildDeepLink(`studies/${study.id}`));
  parts.push("");
  parts.push(buildFooter());

  const message = tidy(parts.join("\n"));
  return shareText(message, `${APP_NAME} Study`);
}

// ---------------------------------------------------------------------------
// Media — always share the Advent Pro destination, never the YouTube source
// ---------------------------------------------------------------------------

export async function shareMediaLink(media: {
  id: string;
  title: string;
  description?: string | null;
  mediaType?: "video" | "short";
}) {
  const preview = tidy(media.description || "").replace(/\n+/g, " ").slice(0, 180);
  const parts = [
    media.mediaType === "short"
      ? `Watch “${media.title}” in Advent Pro Shorts.`
      : `Watch “${media.title}” on Advent Pro.`,
  ];
  if (preview) parts.push("", `${preview}${(media.description?.length || 0) > preview.length ? "…" : ""}`);
  parts.push("", buildDeepLink(`media/${media.id}`), "", buildFooter());
  return shareText(tidy(parts.join("\n")), `${media.title} — ${APP_NAME}`);
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
