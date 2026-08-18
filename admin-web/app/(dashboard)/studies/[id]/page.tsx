"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabaseClient";
import { makeStudyId } from "@/lib/ids";
import type { Category, Study } from "@/lib/types";

export default function StudyEditor() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const rawId = decodeURIComponent(params.id);
  const isNew = rawId === "new";

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  const [number, setNumber] = useState(1);
  const [category, setCategory] = useState("");
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [content, setContent] = useState("");
  const [author, setAuthor] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);
  const [isPublished, setIsPublished] = useState(false);

  useEffect(() => {
    getSupabase()
      .from("study_categories")
      .select("*")
      .order("sort_order")
      .then(({ data }) => {
        const cats = (data as Category[]) ?? [];
        setCategories(cats);
        if (isNew && cats[0]) setCategory((c) => c || cats[0].display_name);
      });
  }, [isNew]);

  useEffect(() => {
    if (isNew) return;
    getSupabase()
      .from("studies")
      .select("*")
      .eq("id", rawId)
      .single()
      .then(({ data, error }) => {
        if (error) {
          setError(error.message);
        } else if (data) {
          const s = data as Study;
          setCategory(s.category);
          setTitle(s.title);
          setSubtitle(s.subtitle);
          setContent(s.content);
          setAuthor(s.author);
          setIsFeatured(s.is_featured);
          setIsPublished(s.is_published);
        }
        setLoading(false);
      });
  }, [isNew, rawId]);

  const save = async (publish?: boolean) => {
    setSaving(true);
    setError(null);
    try {
      if (!title.trim()) throw new Error("Title is required.");
      if (!content.trim()) throw new Error("Content is required.");

      const id = isNew ? makeStudyId(category, number) : rawId;
      const willPublish = publish ?? isPublished;

      const payload = {
        id,
        category: category.trim(),
        title: title.trim(),
        subtitle: subtitle.trim(),
        content: content.trim(),
        author: author.trim(),
        is_featured: isFeatured,
        is_published: willPublish,
        deleted: false,
        published_at: willPublish ? new Date().toISOString() : null,
      };

      const { error } = await getSupabase()
        .from("studies")
        .upsert(payload, { onConflict: "id" });
      if (error) throw error;

      router.push("/studies");
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  };

  const unpublish = async () => {
    setSaving(true);
    setError(null);
    const { error } = await getSupabase()
      .from("studies")
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
    if (!confirm("Delete this study? It will be removed from the app on next sync.")) return;
    setSaving(true);
    const { error } = await getSupabase()
      .from("studies")
      .update({ is_published: false, deleted: true })
      .eq("id", rawId);
    if (error) {
      setError(error.message);
      setSaving(false);
    } else {
      router.push("/studies");
    }
  };

  if (loading) return <div className="center-screen">Loading…</div>;

  return (
    <div style={{ maxWidth: 820 }}>
      <h1>{isNew ? "New study" : `Edit ${rawId}`}</h1>
      <p className="sub">Content supports Markdown (headings, bold, etc.).</p>

      <div className="card">
        <div className="field-row">
          <div>
            <label>Category</label>
            <input
              list="category-list"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Bible Study"
            />
            <datalist id="category-list">
              {categories.map((c) => (
                <option key={c.name} value={c.display_name} />
              ))}
            </datalist>
          </div>
          {isNew && (
            <div>
              <label>Reference number (builds the ID)</label>
              <input
                type="number"
                value={number}
                onChange={(e) => setNumber(Number(e.target.value))}
              />
            </div>
          )}
        </div>

        <label>Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} />

        <label>Subtitle (optional)</label>
        <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />

        <label>Author (optional)</label>
        <input value={author} onChange={(e) => setAuthor(e.target.value)} />

        <label>Content (Markdown)</label>
        <textarea
          rows={18}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={"# Heading\n\nParagraph text…"}
        />

        <div className="check">
          <input
            id="feat"
            type="checkbox"
            checked={isFeatured}
            onChange={(e) => setIsFeatured(e.target.checked)}
          />
          <label htmlFor="feat" style={{ margin: 0 }}>
            Featured (shown on the app home screen)
          </label>
        </div>

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
