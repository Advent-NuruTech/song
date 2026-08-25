import assert from "node:assert/strict";
import test from "node:test";

import {
  findBibleSlashCommand,
  formatScriptureSelection,
  parseBibleReference,
  replaceTextSelection,
} from "../src/features/scripture/scriptureFormatting.ts";

const books = [
  { book: "John", bookOrder: 43, chapterCount: 21 },
  { book: "Romans", bookOrder: 45, chapterCount: 16 },
];

test("parses chapter, verse, and verse-range references", () => {
  assert.deepEqual(parseBibleReference("John 3:16-18", books), {
    book: books[0], chapter: 3, startVerse: 16, endVerse: 18,
  });
  assert.deepEqual(parseBibleReference("Romans 8", books), {
    book: books[1], chapter: 8, startVerse: undefined, endVerse: undefined,
  });
  assert.equal(parseBibleReference("John 99", books), null);
});

test("finds /bible only at a command boundary and replaces its exact range", () => {
  const value = "My thought /bible continues";
  const range = findBibleSlashCommand(value, 17);
  assert.deepEqual(range, { start: 11, end: 17 });
  assert.deepEqual(replaceTextSelection(value, range, "SCRIPTURE"), {
    value: "My thought SCRIPTURE continues",
    selection: { start: 20, end: 20 },
  });
  assert.equal(findBibleSlashCommand("not/bible", 9), null);
});

test("adds ellipses around an exact partial-verse selection", () => {
  const text = "For God so loved the world, that he gave his only begotten Son";
  const start = text.indexOf("loved");
  const end = text.indexOf(", that");
  const result = formatScriptureSelection({
    book: "John", chapter: 3, verses: [{ verse: 16, text }], versionLabel: "KJV", selection: { start, end },
  });
  assert.equal(result?.plainText, "“…loved the world…” — John 3:16 (KJV)");
});

test("uses a chapter citation for a complete chapter", () => {
  const result = formatScriptureSelection({
    book: "John", chapter: 3, versionLabel: "KJV", entireChapter: true,
    verses: [{ verse: 1, text: "First." }, { verse: 2, text: "Second." }],
  });
  assert.equal(result?.reference, "John 3");
});

test("does not misrepresent non-contiguous verses as one range", () => {
  const result = formatScriptureSelection({
    book: "John", chapter: 3, versionLabel: "KJV",
    verses: [{ verse: 1, text: "First." }, { verse: 3, text: "Third." }, { verse: 4, text: "Fourth." }],
  });
  assert.equal(result?.reference, "John 3:1, 3–4");
});

test("keeps the verse order supplied by the picker", () => {
  const result = formatScriptureSelection({
    book: "John", chapter: 3, versionLabel: "KJV",
    verses: [{ verse: 5, text: "Fifth." }, { verse: 2, text: "Second." }, { verse: 4, text: "Fourth." }],
  });
  assert.equal(result?.selectedText, "Fifth. Second. Fourth.");
  assert.equal(result?.reference, "John 3:5, 2, 4");
});
