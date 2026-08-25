import type { BibleBook, BibleVerse } from "@/src/services/bibleService";

export type TextSelection = { start: number; end: number };

export type ParsedBibleReference = {
  book: BibleBook;
  chapter: number;
  startVerse?: number;
  endVerse?: number;
};

export type FormattedScripture = {
  plainText: string;
  html: string;
  reference: string;
  selectedText: string;
};

type VerseSpan = BibleVerse & { start: number; end: number };

const normalize = (value: string) => value
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/gi, " ")
  .trim()
  .toLocaleLowerCase();

export function parseBibleReference(query: string, books: BibleBook[]): ParsedBibleReference | null {
  const match = query.trim().match(/^(.+?)\s+(\d+)(?:\s*:\s*(\d+)(?:\s*[-\u2013\u2014]\s*(\d+))?)?$/);
  if (!match) return null;

  const requestedBook = normalize(match[1]);
  const book = books.find((item) => normalize(item.book) === requestedBook)
    ?? books.find((item) => normalize(item.book).startsWith(requestedBook));
  if (!book) return null;

  const chapter = Number(match[2]);
  if (!Number.isInteger(chapter) || chapter < 1 || chapter > book.chapterCount) return null;

  const startVerse = match[3] ? Number(match[3]) : undefined;
  const endVerse = match[4] ? Number(match[4]) : startVerse;
  if (startVerse !== undefined && (!Number.isInteger(startVerse) || startVerse < 1)) return null;
  if (endVerse !== undefined && (!Number.isInteger(endVerse) || endVerse < (startVerse ?? 1))) return null;

  return { book, chapter, startVerse, endVerse };
}

export function buildVerseText(verses: BibleVerse[]): { text: string; spans: VerseSpan[] } {
  let text = "";
  const spans: VerseSpan[] = [];
  verses.forEach((verse, index) => {
    if (index) text += " ";
    const start = text.length;
    text += verse.text.trim();
    spans.push({ ...verse, start, end: text.length });
  });
  return { text, spans };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function clampSelection(selection: TextSelection | undefined, length: number): TextSelection {
  if (!selection || selection.start === selection.end) return { start: 0, end: length };
  const start = Math.max(0, Math.min(selection.start, selection.end, length));
  const end = Math.max(start, Math.min(Math.max(selection.start, selection.end), length));
  return { start, end };
}

export function formatScriptureSelection(options: {
  book: string;
  chapter: number;
  verses: BibleVerse[];
  versionLabel: string;
  selection?: TextSelection;
  entireChapter?: boolean;
}): FormattedScripture | null {
  if (!options.verses.length) return null;
  const { text, spans } = buildVerseText(options.verses);
  const selection = clampSelection(options.selection, text.length);

  let selectionStart = selection.start;
  let selectionEnd = selection.end;
  while (selectionStart < selectionEnd && /\s/.test(text[selectionStart])) selectionStart += 1;
  while (selectionEnd > selectionStart && /\s/.test(text[selectionEnd - 1])) selectionEnd -= 1;
  if (selectionStart === selectionEnd) return null;

  const included = spans.filter((span) => span.end > selectionStart && span.start < selectionEnd);
  if (!included.length) return null;

  const first = included[0];
  const startsMidPassage = selectionStart > 0;
  const endsMidPassage = selectionEnd < text.length;
  const excerpt = `${startsMidPassage ? "…" : ""}${text.slice(selectionStart, selectionEnd)}${endsMidPassage ? "…" : ""}`;
  const verseParts: string[] = [];
  let rangeStart = first.verse;
  let previous = first.verse;
  const flushRange = () => verseParts.push(rangeStart === previous ? String(rangeStart) : `${rangeStart}–${previous}`);
  for (const span of included.slice(1)) {
    if (span.verse === previous + 1) {
      previous = span.verse;
      continue;
    }
    flushRange();
    rangeStart = span.verse;
    previous = span.verse;
  }
  flushRange();
  const verseReference = `${options.book} ${options.chapter}:${verseParts.join(", ")}`;
  const reference = options.entireChapter && selectionStart === 0 && selectionEnd === text.length
    ? `${options.book} ${options.chapter}`
    : verseReference;
  const citation = `${reference} (${options.versionLabel})`;
  const plainText = `“${excerpt}” — ${citation}`;

  return {
    plainText,
    html: `<span class="scripture-quote">“${escapeHtml(excerpt)}” — <strong>${escapeHtml(citation)}</strong></span>`,
    reference,
    selectedText: text.slice(selectionStart, selectionEnd),
  };
}

export function findBibleSlashCommand(value: string, cursor: number): TextSelection | null {
  const beforeCursor = value.slice(0, Math.max(0, cursor));
  const match = beforeCursor.match(/(?:^|\s)(\/bible)$/i);
  if (!match) return null;
  return { start: cursor - match[1].length, end: cursor };
}

export function replaceTextSelection(value: string, selection: TextSelection, insertion: string): {
  value: string;
  selection: TextSelection;
} {
  const start = Math.max(0, Math.min(selection.start, selection.end, value.length));
  const end = Math.max(start, Math.min(Math.max(selection.start, selection.end), value.length));
  const next = `${value.slice(0, start)}${insertion}${value.slice(end)}`;
  const cursor = start + insertion.length;
  return { value: next, selection: { start: cursor, end: cursor } };
}
