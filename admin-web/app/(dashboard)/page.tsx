"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabaseClient";

type Counts = {
  songs: number;
  publishedSongs: number;
  studies: number;
  publishedStudies: number;
  categories: number;
  media: number;
};

export default function DashboardHome() {
  const [counts, setCounts] = useState<Counts | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabase();
    const head = { count: "exact" as const, head: true };

    Promise.all([
      supabase.from("songs").select("*", head).eq("deleted", false),
      supabase.from("songs").select("*", head).eq("deleted", false).eq("is_published", true),
      supabase.from("studies").select("*", head).eq("deleted", false),
      supabase.from("studies").select("*", head).eq("deleted", false).eq("is_published", true),
      supabase.from("study_categories").select("*", head),
      supabase.from("media").select("*", head).eq("deleted", false),
    ])
      .then((res) => {
        const err = res.find((r) => r.error)?.error;
        if (err) throw err;
        setCounts({
          songs: res[0].count ?? 0,
          publishedSongs: res[1].count ?? 0,
          studies: res[2].count ?? 0,
          publishedStudies: res[3].count ?? 0,
          categories: res[4].count ?? 0,
          media: res[5].count ?? 0,
        });
      })
      .catch((e) => setError((e as Error).message));
  }, []);

  return (
    <div>
      <h1>Dashboard</h1>
      <p className="sub">
        Create and publish songs &amp; studies. Published content syncs to the app
        automatically — no app update needed.
      </p>

      {error && <div className="error">{error}</div>}

      <div className="grid-cards">
        <div className="card stat">
          <div className="num">{counts ? counts.publishedSongs : "—"}</div>
          <div className="label">Published songs</div>
          <div className="meta" style={{ color: "var(--muted)", fontSize: 12, marginTop: 4 }}>
            {counts ? `${counts.songs} total` : ""}
          </div>
        </div>
        <div className="card stat">
          <div className="num">{counts ? counts.media : "—"}</div>
          <div className="label">Media items</div>
        </div>
        <div className="card stat">
          <div className="num">{counts ? counts.publishedStudies : "—"}</div>
          <div className="label">Published studies</div>
          <div className="meta" style={{ color: "var(--muted)", fontSize: 12, marginTop: 4 }}>
            {counts ? `${counts.studies} total` : ""}
          </div>
        </div>
        <div className="card stat">
          <div className="num">{counts ? counts.categories : "—"}</div>
          <div className="label">Categories</div>
        </div>
      </div>

      <div className="row wrap" style={{ gap: 12 }}>
        <Link className="btn primary" href="/songs/new">
          + New song
        </Link>
        <Link className="btn primary" href="/studies/new">
          + New study
        </Link>
        <Link className="btn" href="/songs">
          Manage songs
        </Link>
        <Link className="btn" href="/studies">
          Manage studies
        </Link>
        <Link className="btn" href="/media">
          Manage media
        </Link>
      </div>
    </div>
  );
}
