"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabaseClient";
import type { Study } from "@/lib/types";

const PAGE_SIZE = 50;

export default function StudiesPage() {
  const [studies, setStudies] = useState<Study[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let q = getSupabase()
        .from("studies")
        .select("*")
        .eq("deleted", false)
        .order("updated_at", { ascending: false })
        .limit(PAGE_SIZE);

      if (search.trim()) q = q.ilike("title", `%${search.trim()}%`);

      const { data, error } = await q;
      if (error) throw error;
      setStudies((data as Study[]) ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <div>
      <div className="row between" style={{ marginBottom: 16 }}>
        <div>
          <h1>Studies</h1>
          <p className="sub" style={{ margin: 0 }}>
            Showing up to {PAGE_SIZE}, newest first.
          </p>
        </div>
        <Link className="btn primary" href="/studies/new">
          + New study
        </Link>
      </div>

      <div className="toolbar">
        <input
          placeholder="Search by title…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && <div className="error">{error}</div>}

      <div className="list">
        {loading && <div className="list-item">Loading…</div>}
        {!loading && studies.length === 0 && (
          <div className="list-item">No studies found.</div>
        )}
        {studies.map((s) => (
          <Link
            key={s.id}
            href={`/studies/${encodeURIComponent(s.id)}`}
            className="list-item"
          >
            <div className="grow">
              <div className="title">{s.title || "(untitled)"}</div>
              <div className="meta">
                {s.category || "Uncategorized"}
                {s.is_featured ? " · ★ featured" : ""} · {s.id}
              </div>
            </div>
            <span className={`badge ${s.is_published ? "published" : "draft"}`}>
              {s.is_published ? "Published" : "Draft"}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
