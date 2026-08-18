"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabaseClient";
import type { Song } from "@/lib/types";

const PAGE_SIZE = 50;

export default function SongsPage() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [search, setSearch] = useState("");
  const [language, setLanguage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let q = getSupabase()
        .from("songs")
        .select("*")
        .eq("deleted", false)
        .order("language", { ascending: true })
        .order("hymn_number", { ascending: true })
        .limit(PAGE_SIZE);

      if (search.trim()) q = q.ilike("title", `%${search.trim()}%`);
      if (language) q = q.eq("language", language);

      const { data, error } = await q;
      if (error) throw error;
      setSongs((data as Song[]) ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [search, language]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <div>
      <div className="row between" style={{ marginBottom: 16 }}>
        <div>
          <h1>Songs</h1>
          <p className="sub" style={{ margin: 0 }}>
            Showing up to {PAGE_SIZE}. Filter to narrow down.
          </p>
        </div>
        <Link className="btn primary" href="/songs/new">
          + New song
        </Link>
      </div>

      <div className="toolbar">
        <input
          placeholder="Search by title…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={language} onChange={(e) => setLanguage(e.target.value)}>
          <option value="">All languages</option>
          <option value="english">English</option>
          <option value="swahili">Swahili</option>
          <option value="luo">Luo</option>
        </select>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="list">
        {loading && <div className="list-item">Loading…</div>}
        {!loading && songs.length === 0 && (
          <div className="list-item">No songs found.</div>
        )}
        {songs.map((s) => (
          <Link key={s.id} href={`/songs/${encodeURIComponent(s.id)}`} className="list-item">
            <div className="grow">
              <div className="title">
                #{s.hymn_number} · {s.title || "(untitled)"}
              </div>
              <div className="meta">
                {s.language} · {s.id}
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
