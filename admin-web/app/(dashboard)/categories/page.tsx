"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabaseClient";
import type { Category } from "@/lib/types";

const BLANK = { content_type: "study" as "song" | "study", name: "", display_name: "", color: "#0B4AA6", icon: "folder-outline", description: "", sort_order: 100 };
type Form = typeof BLANK;

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<Form>({ ...BLANK });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const all: Category[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await getSupabase().from("content_categories").select("*").order("content_type").order("sort_order").range(from, from + 999);
      if (error) { setError(error.message); return; }
      const page = (data as Category[]) ?? [];
      all.push(...page);
      if (page.length < 1000) break;
    }
    setCategories(all);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  const save = async () => {
    setSaving(true); setError(null);
    try {
      const name = (form.name || slugify(form.display_name)).trim();
      if (!name) throw new Error("Name (or display name) is required.");
      const payload = { ...form, name, display_name: form.display_name.trim() || name, icon: form.icon.trim() || "folder-outline", sort_order: Number(form.sort_order) || 0 };
      const { error } = await getSupabase().from("content_categories").upsert(payload, { onConflict: "content_type,name" });
      if (error) throw error;
      setForm({ ...BLANK }); await load();
    } catch (e) { setError((e as Error).message); } finally { setSaving(false); }
  };
  const edit = (item: Category) => setForm({ content_type: item.content_type, name: item.name, display_name: item.display_name, color: item.color, icon: item.icon, description: item.description ?? "", sort_order: item.sort_order });
  const remove = async (item: Category) => {
    if (!confirm(`Delete ${item.content_type} category "${item.display_name}"? Assigned categories cannot be deleted.`)) return;
    const { error } = await getSupabase().from("content_categories").delete().eq("content_type", item.content_type).eq("name", item.name);
    if (error) setError(error.message); else void load();
  };

  return <div style={{ maxWidth: 820 }}>
    <h1>Content categories</h1>
    <p className="sub">Create unlimited song and study categories. Editors use them immediately; no app release is needed.</p>
    <div className="card" style={{ marginBottom: 24 }}>
      <label>Content type</label>
      <select value={form.content_type} onChange={(e) => setForm({ ...form, content_type: e.target.value as Form["content_type"] })}><option value="study">Study</option><option value="song">Song</option></select>
      <div className="field-row"><div><label>Display name</label><input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} placeholder="Worship" /></div><div><label>Stable key</label><input value={form.name} onChange={(e) => setForm({ ...form, name: slugify(e.target.value) })} placeholder="worship" disabled={categories.some((item) => item.content_type === form.content_type && item.name === form.name)} /></div></div>
      <div className="field-row"><div><label>Color</label><input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} /></div><div><label>Icon (Ionicons)</label><input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} /></div></div>
      <label>Description</label><textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      <label>Sort order</label><input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
      {error && <div className="error">{error}</div>}
      <div className="row" style={{ marginTop: 18, gap: 10 }}><button className="btn primary" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save category"}</button><button className="btn" onClick={() => setForm({ ...BLANK })}>Clear</button></div>
    </div>
    <div className="list">{categories.length === 0 && <div className="list-item">No categories yet.</div>}{categories.map((item) => <div key={`${item.content_type}:${item.name}`} className="list-item"><span style={{ width: 14, height: 14, borderRadius: 999, background: item.color, display: "inline-block" }} /><div className="grow"><div className="title">{item.display_name}</div><div className="meta">{item.content_type} · {item.name} · order {item.sort_order}</div></div><button className="btn" onClick={() => edit(item)}>Edit</button><button className="btn danger" onClick={() => void remove(item)}>Delete</button></div>)}</div>
  </div>;
}
