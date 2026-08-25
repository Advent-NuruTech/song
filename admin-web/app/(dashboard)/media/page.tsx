"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabaseClient";
import type { Media } from "@/lib/types";

export default function MediaPage() {
  const [items, setItems] = useState<Media[]>([]);
  const [search, setSearch] = useState("");
  const [type, setType] = useState<"all" | "video" | "short">("all");
  const [status, setStatus] = useState<"all" | "published" | "draft">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const supabase = getSupabase();
      const { data: allowed } = await supabase.rpc("has_permission", { requested: "media.manage" });
      if (!allowed) throw new Error("You do not have permission to manage media.");
      let query = supabase.from("media").select("*").eq("deleted", false).order("updated_at", { ascending: false }).limit(100);
      if (search.trim()) {
        const safeSearch = search.trim().replace(/[,%()]/g, " ");
        query = query.or(`title.ilike.%${safeSearch}%,category.ilike.%${safeSearch}%`);
      }
      if (type !== "all") query = query.eq("media_type", type);
      if (status !== "all") query = query.eq("is_published", status === "published");
      const { data, error } = await query; if (error) throw error;
      setItems((data as Media[]) ?? []);
    } catch (reason) { setError((reason as Error).message); }
    finally { setLoading(false); }
  }, [search, status, type]);

  useEffect(() => { const timer = setTimeout(() => void load(), 250); return () => clearTimeout(timer); }, [load]);

  return <div>
    <div className="row between" style={{ marginBottom: 16 }}><div><h1>Media</h1><p className="sub" style={{ margin: 0 }}>Curate Videos and Shorts. Card layout is assigned automatically in the app.</p></div><div className="row wrap" style={{ gap: 8 }}><Link className="btn" href="/media/moderation">Moderate comments</Link><Link className="btn primary" href="/media/new">+ Add media</Link></div></div>
    <div className="toolbar"><input placeholder="Search title or category…" value={search} onChange={(e) => setSearch(e.target.value)} /><select value={type} onChange={(e) => setType(e.target.value as typeof type)}><option value="all">All types</option><option value="video">Videos</option><option value="short">Shorts</option></select><select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}><option value="all">All statuses</option><option value="published">Published</option><option value="draft">Draft</option></select></div>
    {error && <div className="error">{error}</div>}
    <div className="list">{loading && <div className="list-item">Loading…</div>}{!loading && !items.length && <div className="list-item">No media found.</div>}{items.map((item) => <Link key={item.id} href={`/media/${item.id}`} className="list-item"><img src={item.thumbnail_url} alt="" width={104} height={59} style={{ objectFit: "cover", borderRadius: 8, marginRight: 12 }} /><div className="grow"><div className="title">{item.title}</div><div className="meta">{item.media_type === "short" ? "Short" : "Video"}{item.category ? ` · ${item.category}` : ""} · {item.view_count} views · {item.like_count} likes{item.is_featured ? " · ★ pinned" : ""}</div></div><span className={`badge ${item.is_published ? "published" : "draft"}`}>{item.is_published ? "Published" : "Draft"}</span></Link>)}</div>
  </div>;
}
