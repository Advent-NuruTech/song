/** ID + parsing helpers that mirror the conventions used by the bundled JSON. */

const LANG_PREFIX: Record<string, string> = {
  english: "ENG",
  swahili: "SWA",
  luo: "LUO",
  kikuyu: "KKY",
  kisii: "KSI",
  french: "FRN",
};

/** Song id like ENG_006 (zero-padded to 3). Falls back to language code. */
export function makeSongId(language: string, hymnNumber: number): string {
  const lang = (language || "unknown").toLowerCase().trim();
  const prefix = LANG_PREFIX[lang] || lang.slice(0, 3).toUpperCase() || "SNG";
  const num = String(Math.max(0, Math.floor(hymnNumber || 0))).padStart(3, "0");
  return `${prefix}_${num}`;
}

/** Study id like BIBLE_STUDY_003 from a category + sequence number. */
export function makeStudyId(category: string, seq: number): string {
  const base = (category || "study")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  const num = String(Math.max(0, Math.floor(seq || 0))).padStart(3, "0");
  return `${base}_${num}`;
}

/** Parse the "stanzas" textarea (blank line between stanzas) into string[][]. */
export function parseStanzas(text: string): string[][] {
  return text
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((block) =>
      block
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0)
    )
    .filter((stanza) => stanza.length > 0);
}

/** Serialize string[][] back into editable textarea text. */
export function stanzasToText(stanzas: string[][] | null | undefined): string {
  if (!stanzas || !stanzas.length) return "";
  return stanzas.map((stanza) => stanza.join("\n")).join("\n\n");
}

/** Parse a chorus textarea into string[] | null. */
export function parseChorus(text: string): string[] | null {
  const lines = text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  return lines.length ? lines : null;
}

export function chorusToText(chorus: string[] | null | undefined): string {
  return chorus && chorus.length ? chorus.join("\n") : "";
}
