"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./BibleInsertDialog.module.css";

type Version = { id: string; name: string; abbreviation?: string };
type Book = { book: string; chapterCount: number };
type Verse = { verse: number; text: string };
type Hit = Verse & { book: string; chapter: number };

const escapeHtml = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export default function BibleInsertDialog({ open, onClose, onInsert }: { open: boolean; onClose: () => void; onInsert: (html: string) => void }) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [versionId, setVersionId] = useState("");
  const [books, setBooks] = useState<Book[]>([]);
  const [book, setBook] = useState("");
  const [chapter, setChapter] = useState(1);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const sequence = useRef(0);

  useEffect(() => {
    if (!open) return;
    setLoading(true); setError("");
    void fetch("/api/bible?action=catalog").then(async (response) => {
      if (!response.ok) throw new Error("Could not load Bible versions.");
      const payload = await response.json() as { versions: Version[] };
      setVersions(payload.versions);
      setVersionId((current) => current || payload.versions[0]?.id || "");
    }).catch((reason) => setError(reason.message)).finally(() => setLoading(false));
  }, [open]);

  useEffect(() => {
    if (!open || !versionId) return;
    setLoading(true); setError(""); setBook(""); setVerses([]); setSelected(new Set());
    void fetch(`/api/bible?action=books&version=${encodeURIComponent(versionId)}`).then(async (response) => {
      if (!response.ok) throw new Error("Could not load Bible books.");
      const payload = await response.json() as { books: Book[] };
      setBooks(payload.books);
      setBook(payload.books[0]?.book || "");
      setChapter(1);
    }).catch((reason) => setError(reason.message)).finally(() => setLoading(false));
  }, [open, versionId]);

  useEffect(() => {
    if (!open || !versionId || !book || query) return;
    const current = ++sequence.current;
    setLoading(true); setError("");
    void fetch(`/api/bible?action=chapter&version=${encodeURIComponent(versionId)}&book=${encodeURIComponent(book)}&chapter=${chapter}`).then(async (response) => {
      if (!response.ok) throw new Error("Could not load this chapter.");
      const payload = await response.json() as { verses: Verse[] };
      if (current === sequence.current) { setVerses(payload.verses); setSelected(new Set()); }
    }).catch((reason) => setError(reason.message)).finally(() => setLoading(false));
  }, [book, chapter, open, query, versionId]);

  useEffect(() => {
    if (!open || !versionId || !query.trim()) { setHits([]); return; }
    const current = ++sequence.current;
    const timer = window.setTimeout(() => {
      setLoading(true); setError("");
      void fetch(`/api/bible?action=search&version=${encodeURIComponent(versionId)}&q=${encodeURIComponent(query.trim())}`).then(async (response) => {
        if (!response.ok) throw new Error("Bible search failed.");
        const payload = await response.json() as { hits: Hit[] };
        if (current === sequence.current) setHits(payload.hits);
      }).catch((reason) => setError(reason.message)).finally(() => setLoading(false));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [open, query, versionId]);

  useEffect(() => {
    const listener = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    if (open) document.addEventListener("keydown", listener);
    return () => document.removeEventListener("keydown", listener);
  }, [onClose, open]);

  const selectedRows = useMemo(() => verses.filter((item) => selected.has(item.verse)), [selected, verses]);
  const preview = useMemo(() => selectedRows.map((item) => item.text.trim()).join(" "), [selectedRows]);
  useEffect(() => setSelection({ start: 0, end: preview.length }), [preview]);
  const currentBook = books.find((item) => item.book === book);

  const chooseHit = (hit: Hit) => {
    const directReference = query.trim().match(/^(.+?)\s+(\d+)(?:\s*:\s*(\d+)(?:\s*[-\u2013\u2014]\s*(\d+))?)?$/);
    setQuery(""); setBook(hit.book); setChapter(hit.chapter);
    const current = ++sequence.current;
    setLoading(true);
    void fetch(`/api/bible?action=chapter&version=${encodeURIComponent(versionId)}&book=${encodeURIComponent(hit.book)}&chapter=${hit.chapter}`).then(async (response) => {
      const payload = await response.json() as { verses: Verse[] };
      if (current === sequence.current) {
        setVerses(payload.verses);
        const start = directReference?.[3] ? Number(directReference[3]) : undefined;
        const end = directReference?.[4] ? Number(directReference[4]) : start;
        setSelected(new Set(directReference
          ? payload.verses.filter((item) => start === undefined || (item.verse >= start && item.verse <= (end ?? start))).map((item) => item.verse)
          : [hit.verse]));
      }
    }).catch((reason) => setError(reason.message)).finally(() => setLoading(false));
  };

  const insert = () => {
    if (!preview || !selectedRows.length) return;
    let start = selection.start === selection.end ? 0 : Math.min(selection.start, selection.end);
    let end = selection.start === selection.end ? preview.length : Math.max(selection.start, selection.end);
    while (start < end && /\s/.test(preview[start])) start++;
    while (end > start && /\s/.test(preview[end - 1])) end--;
    const excerpt = `${start > 0 ? "…" : ""}${preview.slice(start, end)}${end < preview.length ? "…" : ""}`;
    const numbers = selectedRows.map((item) => item.verse);
    const parts: string[] = [];
    let rangeStart = numbers[0], previous = numbers[0];
    const flush = () => parts.push(rangeStart === previous ? String(rangeStart) : `${rangeStart}–${previous}`);
    numbers.slice(1).forEach((number) => { if (number === previous + 1) previous = number; else { flush(); rangeStart = previous = number; } });
    flush();
    const fullChapter = selectedRows.length === verses.length && start === 0 && end === preview.length;
    const reference = fullChapter ? `${book} ${chapter}` : `${book} ${chapter}:${parts.join(", ")}`;
    const version = versions.find((item) => item.id === versionId);
    const citation = `${reference} (${version?.abbreviation || version?.name || versionId})`;
    onInsert(`<span class="scripture-quote">“${escapeHtml(excerpt)}” — <strong>${escapeHtml(citation)}</strong></span>&nbsp;`);
    onClose();
  };

  if (!open) return null;
  return <div className={styles.backdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="bible-dialog-title">
      <header className={styles.header}><div className={styles.heading}><h2 id="bible-dialog-title">Insert Scripture</h2><p>Search a reference or verse text, then select exact words.</p></div><button type="button" className={styles.close} aria-label="Close Bible picker" onClick={onClose}>×</button></header>
      <div className={styles.controls}>
        <select className={styles.control} aria-label="Bible version" value={versionId} onChange={(event) => setVersionId(event.target.value)}>{versions.map((item) => <option key={item.id} value={item.id}>{item.abbreviation || item.name}</option>)}</select>
        <select className={styles.control} aria-label="Bible book" value={book} onChange={(event) => { setBook(event.target.value); setChapter(1); setQuery(""); }}>{books.map((item) => <option key={item.book} value={item.book}>{item.book}</option>)}</select>
        <select className={styles.control} aria-label="Bible chapter" value={chapter} onChange={(event) => { setChapter(Number(event.target.value)); setQuery(""); }}>{Array.from({ length: currentBook?.chapterCount || 0 }, (_, index) => index + 1).map((number) => <option key={number}>{number}</option>)}</select>
      </div>
      <input className={styles.search} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="John 3:16 or search verse text" aria-label="Search Bible" autoFocus />
      <div className={styles.body}>{error ? <div className={styles.status} role="alert">{error}</div> : loading && !(query ? hits : verses).length ? <div className={styles.status}>Loading Scripture…</div> : query ? hits.length ? hits.map((hit) => <button type="button" key={`${hit.book}-${hit.chapter}-${hit.verse}`} className={styles.verse} onClick={() => chooseHit(hit)}><span className={styles.number}>{hit.verse}</span><span><span className={styles.resultRef}>{hit.book} {hit.chapter}:{hit.verse}</span><span className={styles.resultText}>{hit.text}</span></span></button>) : <div className={styles.status}>No verses found.</div> : verses.map((verse) => <button type="button" key={verse.verse} className={`${styles.verse} ${selected.has(verse.verse) ? styles.selected : ""}`} aria-pressed={selected.has(verse.verse)} onClick={() => setSelected((current) => { const next = new Set(current); if (next.has(verse.verse)) next.delete(verse.verse); else next.add(verse.verse); return next; })}><span className={styles.number}>{verse.verse}</span><span>{verse.text}</span></button>)}</div>
      {selectedRows.length ? <footer className={styles.preview}><div className={styles.previewTop}><strong>Exact text</strong><span>Long-press and drag the selection handles to choose an excerpt.</span></div><textarea className={styles.exact} readOnly value={preview} onSelect={(event) => setSelection({ start: event.currentTarget.selectionStart, end: event.currentTarget.selectionEnd })} /><div className={styles.actions}><button type="button" className={styles.secondary} onClick={() => setSelected(new Set(verses.map((item) => item.verse)))}>Select chapter</button><button type="button" className={styles.primary} disabled={!preview} onClick={insert}>Insert at cursor</button></div></footer> : null}
    </section>
  </div>;
}
