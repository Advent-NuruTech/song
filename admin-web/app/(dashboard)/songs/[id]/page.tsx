"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabaseClient";
import {
  chorusToText,
  makeSongId,
  parseChorus,
  parseStanzas,
  stanzasToText,
} from "@/lib/ids";
import type { Song } from "@/lib/types";

export default function SongEditor() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const rawId = decodeURIComponent(params.id);
  const isNew = rawId === "new";

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [hymnNumber, setHymnNumber] = useState(0);
  const [title, setTitle] = useState("");
  const [language, setLanguage] = useState("");
  const [author, setAuthor] = useState("");
  const [stanzasText, setStanzasText] = useState("");
  const [chorusText, setChorusText] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [existingLanguages, setExistingLanguages] = useState<string[]>([]);

  useEffect(() => {
    getSupabase()
      .from("songs")
      .select("language")
      .eq("deleted", false)
      .then(({ data }) => {
        if (data) {
          const langs = [...new Set(data.map((r: { language: string }) => r.language))].sort();
          setExistingLanguages(langs);
        }
      });
  }, []);

  useEffect(() => {
    if (isNew) return;
    getSupabase()
      .from("songs")
      .select("*")
      .eq("id", rawId)
      .single()
      .then(({ data, error }) => {
        if (error) {
          setError(error.message);
        } else if (data) {
          const s = data as Song;
          setHymnNumber(s.hymn_number);
          setTitle(s.title);
          setLanguage(s.language);
          setAuthor(s.author);
          setStanzasText(stanzasToText(s.stanzas));
          setChorusText(chorusToText(s.chorus));
          setIsPublished(s.is_published);
        }
        setLoading(false);
      });
  }, [isNew, rawId]);

  const save = async (publish?: boolean) => {
    setSaving(true);
    setError(null);
    try {
      const stanzas = parseStanzas(stanzasText);
      if (!title.trim()) throw new Error("Title is required.");
      if (!stanzas.length) throw new Error("Add at least one stanza.");

      const id = isNew ? makeSongId(language, hymnNumber) : rawId;
      const willPublish = publish ?? isPublished;

      const payload = {
        id,
        hymn_number: Number(hymnNumber) || 0,
        title: title.trim(),
        language: language.trim().toLowerCase(),
        author: author.trim(),
        stanzas,
        chorus: parseChorus(chorusText),
        is_published: willPublish,
        deleted: false,
        published_at: willPublish ? new Date().toISOString() : null,
      };

      const { error } = await getSupabase()
        .from("songs")
        .upsert(payload, { onConflict: "id" });
      if (error) throw error;

      router.push("/songs");
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  };

  // Unpublish = tombstone so the app removes it; keeps the draft editable here.
  const unpublish = async () => {
    setSaving(true);
    setError(null);
    const { error } = await getSupabase()
      .from("songs")
      .update({ is_published: false, deleted: true })
      .eq("id", rawId);
    if (error) {
      setError(error.message);
      setSaving(false);
    } else {
      setIsPublished(false);
    }
  };

  const remove = async () => {
    if (!confirm("Delete this song? It will be removed from the app on next sync.")) return;
    setSaving(true);
    const { error } = await getSupabase()
      .from("songs")
      .update({ is_published: false, deleted: true })
      .eq("id", rawId);
    if (error) {
      setError(error.message);
      setSaving(false);
    } else {
      router.push("/songs");
    }
  };

  if (loading) return <div className="center-screen">Loading…</div>;

  return (
    <div style={{ maxWidth: 760 }}>
      <h1>{isNew ? "New song" : `Edit ${rawId}`}</h1>
      <p className="sub">
        Stanzas: one line per line, blank line between stanzas. Chorus: one line
        per line.
      </p>

      <div className="card">
        <div className="field-row">
          <div>
            <label>Hymn number</label>
            <input
              type="number"
              value={hymnNumber}
              onChange={(e) => setHymnNumber(Number(e.target.value))}
            />
          </div>
          <div>
            <label>Language</label>
            <input
              list="editor-lang-options"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              placeholder="e.g. english, swahili, kikuyu"
            />
            <datalist id="editor-lang-options">
              {existingLanguages.map((l) => (
                <option key={l} value={l} />
              ))}
            </datalist>
          </div>
        </div>

        <label>Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} />

        <label>Author (optional)</label>
        <input value={author} onChange={(e) => setAuthor(e.target.value)} />

        <label>Stanzas</label>
        <textarea
          rows={12}
          value={stanzasText}
          onChange={(e) => setStanzasText(e.target.value)}
          placeholder={"Line one\nLine two\n\nNext stanza line one\nNext stanza line two"}
        />

        <label>Chorus (optional)</label>
        <textarea
          rows={4}
          value={chorusText}
          onChange={(e) => setChorusText(e.target.value)}
        />

        {!isNew && (
          <div className="check">
            <input
              id="pub"
              type="checkbox"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
            />
            <label htmlFor="pub" style={{ margin: 0 }}>
              Published (visible in the app)
            </label>
          </div>
        )}

        {error && <div className="error">{error}</div>}

        <div className="row wrap" style={{ marginTop: 20, gap: 10 }}>
          <button className="btn" onClick={() => save(false)} disabled={saving}>
            Save draft
          </button>
          <button className="btn primary" onClick={() => save(true)} disabled={saving}>
            {saving ? "Saving…" : "Save & publish"}
          </button>
          {!isNew && isPublished && (
            <button className="btn" onClick={unpublish} disabled={saving}>
              Unpublish
            </button>
          )}
          {!isNew && (
            <button className="btn danger" onClick={remove} disabled={saving}>
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
