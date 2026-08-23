"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabaseClient";
import type { Media } from "@/lib/types";
import { extractYouTubeVideoId, youtubeThumbnail } from "@/lib/youtube";

export default function MediaEditor() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = decodeURIComponent(params.id);
  const isNew = id === "new";
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [mediaType, setMediaType] = useState<"video" | "short">("video");
  const [category, setCategory] = useState("");
  const [duration, setDuration] = useState("");
  const [customThumbnail, setCustomThumbnail] = useState("");
  const [featured, setFeatured] = useState(false);
  const [published, setPublished] = useState(false);
  const [sortOrder, setSortOrder] = useState(0);
  const videoId = useMemo(() => extractYouTubeVideoId(youtubeUrl), [youtubeUrl]);
  const thumbnail = customThumbnail.trim() || (videoId ? youtubeThumbnail(videoId) : "");

  useEffect(() => {
    if (isNew) return;
    getSupabase().from("media").select("*").eq("id", id).single().then(({ data, error }) => {
      if (error) setError(error.message);
      else if (data) { const item = data as Media; setYoutubeUrl(item.youtube_url); setTitle(item.title); setDescription(item.description); setMediaType(item.media_type); setCategory(item.category); setDuration(item.duration_seconds == null ? "" : String(item.duration_seconds)); setCustomThumbnail(item.thumbnail_url === youtubeThumbnail(item.youtube_video_id) ? "" : item.thumbnail_url); setFeatured(item.is_featured); setPublished(item.is_published); setSortOrder(item.sort_order); }
      setLoading(false);
    });
  }, [id, isNew]);

  const save = async (publish?: boolean) => {
    setSaving(true); setError(null);
    try {
      if (!videoId) throw new Error("Paste a valid YouTube watch, youtu.be, or Shorts URL.");
      if (!title.trim()) throw new Error("Title is required.");
      const seconds = duration.trim() ? Number(duration) : null;
      if (seconds != null && (!Number.isInteger(seconds) || seconds < 0)) throw new Error("Duration must be whole seconds.");
      const isPublished = publish ?? published;
      const payload = { source_type: "youtube", youtube_video_id: videoId, youtube_url: youtubeUrl.trim(), title: title.trim(), description: description.trim(), media_type: mediaType, category: category.trim(), thumbnail_url: thumbnail, duration_seconds: seconds, is_featured: featured, sort_order: Math.trunc(sortOrder || 0), is_published: isPublished, deleted: false, published_at: isPublished ? new Date().toISOString() : null };
      const query = isNew ? getSupabase().from("media").insert(payload) : getSupabase().from("media").update(payload).eq("id", id);
      const { error } = await query; if (error) throw error;
      router.push("/media");
    } catch (reason) { setError((reason as Error).message); setSaving(false); }
  };

  const archive = async () => {
    if (!confirm("Archive this media item? It will disappear from the app.")) return;
    setSaving(true); const { error } = await getSupabase().from("media").update({ is_published: false, deleted: true }).eq("id", id);
    if (error) { setError(error.message); setSaving(false); } else router.push("/media");
  };

  if (loading) return <div className="center-screen">Loading…</div>;
  return <div style={{ maxWidth: 820 }}><h1>{isNew ? "Add media" : "Edit media"}</h1><p className="sub">Paste a normal YouTube URL. Advent Pro extracts and validates the video ID automatically.</p><div className="card">
    <label>YouTube URL *</label><input value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=…" />{youtubeUrl && <div className={videoId ? "meta" : "error"} style={{ marginTop: 6 }}>{videoId ? `Video ID: ${videoId}` : "This is not a supported YouTube URL."}</div>}
    <label>Title *</label><input value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} />
    <label>Description</label><textarea value={description} maxLength={5000} rows={6} onChange={(e) => setDescription(e.target.value)} />
    <div className="field-row"><div><label>Media type *</label><select value={mediaType} onChange={(e) => setMediaType(e.target.value as typeof mediaType)}><option value="video">Video</option><option value="short">Short</option></select></div><div><label>Category</label><input value={category} maxLength={100} onChange={(e) => setCategory(e.target.value)} /></div></div>
    <div className="field-row"><div><label>Duration (seconds, optional)</label><input type="number" min="0" value={duration} onChange={(e) => setDuration(e.target.value)} /></div><div><label>Sort order</label><input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} /></div></div>
    <label>Custom thumbnail URL (optional)</label><input value={customThumbnail} onChange={(e) => setCustomThumbnail(e.target.value)} placeholder="Generated automatically when empty" />
    {videoId && <div style={{ margin: "16px 0" }}><div className="meta" style={{ marginBottom: 8 }}>Preview (YouTube embedded playback)</div><div style={{ position: "relative", maxWidth: 560, aspectRatio: "16 / 9" }}><iframe title="Media preview" src={`https://www.youtube-nocookie.com/embed/${videoId}`} allow="accelerometer; autoplay; encrypted-media; picture-in-picture" allowFullScreen style={{ width: "100%", height: "100%", border: 0, borderRadius: 12 }} /></div></div>}
    <div className="check"><input id="featured" type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} /><label htmlFor="featured" style={{ margin: 0 }}>Featured / pinned</label></div>
    {!isNew && <div className="check"><input id="published" type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} /><label htmlFor="published" style={{ margin: 0 }}>Published</label></div>}
    {error && <div className="error">{error}</div>}
    <div className="row wrap" style={{ marginTop: 20, gap: 10 }}><button className="btn" disabled={saving} onClick={() => void save(false)}>Save draft</button><button className="btn primary" disabled={saving} onClick={() => void save(true)}>{saving ? "Saving…" : "Save & publish"}</button>{!isNew && published && <button className="btn" disabled={saving} onClick={() => void save(false)}>Unpublish</button>}{!isNew && <button className="btn danger" disabled={saving} onClick={() => void archive()}>Archive</button>}</div>
  </div></div>;
}
