"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabaseClient";
import type { Category } from "@/lib/types";

const BLANK = {
  name: "",
  display_name: "",
  color: "#0B4AA6",
  icon: "book-outline",
  sort_order: 100,
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState({ ...BLANK });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await getSupabase()
      .from("study_categories")
      .select("*")
      .order("sort_order");
    if (error) setError(error.message);
    else setCategories((data as Category[]) ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const slugify = (s: string) =>
    s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const name = (form.name || slugify(form.display_name)).trim();
      if (!name) throw new Error("Name (or display name) is required.");
      const payload = {
        name,
        display_name: form.display_name.trim() || name,
        color: form.color,
        icon: form.icon.trim() || "book-outline",
        sort_order: Number(form.sort_order) || 0,
      };
      const { error } = await getSupabase()
        .from("study_categories")
        .upsert(payload, { onConflict: "name" });
      if (error) throw error;
      setForm({ ...BLANK });
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const edit = (c: Category) =>
    setForm({
      name: c.name,
      display_name: c.display_name,
      color: c.color,
      icon: c.icon,
      sort_order: c.sort_order,
    });

  const remove = async (name: string) => {
    if (!confirm(`Delete category "${name}"?`)) return;
    const { error } = await getSupabase()
      .from("study_categories")
      .delete()
      .eq("name", name);
    if (error) setError(error.message);
    else load();
  };

  return (
    <div style={{ maxWidth: 820 }}>
      <h1>Categories</h1>
      <p className="sub">Used to group studies. Editing reuses the same name.</p>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="field-row">
          <div>
            <label>Display name</label>
            <input
              value={form.display_name}
              onChange={(e) => setForm({ ...form, display_name: e.target.value })}
              placeholder="Bible Study"
            />
          </div>
          <div>
            <label>Key (auto from display name if blank)</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="bible_study"
            />
          </div>
        </div>
        <div className="field-row">
          <div>
            <label>Color</label>
            <input
              value={form.color}
              onChange={(e) => setForm({ ...form, color: e.target.value })}
            />
          </div>
          <div>
            <label>Icon (Ionicons name)</label>
            <input
              value={form.icon}
              onChange={(e) => setForm({ ...form, icon: e.target.value })}
            />
          </div>
        </div>
        <label>Sort order</label>
        <input
          type="number"
          value={form.sort_order}
          onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
        />

        {error && <div className="error">{error}</div>}

        <div className="row" style={{ marginTop: 18, gap: 10 }}>
          <button className="btn primary" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save category"}
          </button>
          {(form.name || form.display_name) && (
            <button className="btn" onClick={() => setForm({ ...BLANK })}>
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="list">
        {categories.length === 0 && <div className="list-item">No categories yet.</div>}
        {categories.map((c) => (
          <div key={c.name} className="list-item">
            <span
              style={{
                width: 14,
                height: 14,
                borderRadius: 999,
                background: c.color,
                display: "inline-block",
              }}
            />
            <div className="grow">
              <div className="title">{c.display_name}</div>
              <div className="meta">
                {c.name} · {c.icon} · order {c.sort_order}
              </div>
            </div>
            <button className="btn" onClick={() => edit(c)}>
              Edit
            </button>
            <button className="btn danger" onClick={() => remove(c.name)}>
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
