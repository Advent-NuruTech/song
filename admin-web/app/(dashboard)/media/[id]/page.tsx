"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import RichTextEditor, { sanitizeRichTextHtml } from "@/components/RichTextEditor";
import { getSupabase } from "@/lib/supabaseClient";
import type { Media } from "@/lib/types";
import { extractYouTubeVideoId, youtubeThumbnail } from "@/lib/youtube";

const cloudinaryCloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const cloudinaryUploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

type ThumbnailMetadata = {
  url: string;
  publicId: string | null;
  width: number | null;
  height: number | null;
  bytes: number | null;
  format: string | null;
};

function formatCategory(value: string) {
  const normalized = value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
  return normalized ? normalized.charAt(0).toLocaleUpperCase() + normalized.slice(1) : "";
}

async function uploadCloudinaryImage(source: File | string, folder: string): Promise<ThumbnailMetadata> {
  if (!cloudinaryCloudName || !cloudinaryUploadPreset) throw new Error("Cloudinary image storage is not configured.");
  const body = new FormData();
  body.append("file", source);
  body.append("upload_preset", cloudinaryUploadPreset);
  body.append("folder", folder);
  const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudinaryCloudName)}/image/upload`, { method: "POST", body });
  const result = await response.json() as {
    secure_url?: string; public_id?: string; width?: number; height?: number; bytes?: number;
    format?: string; error?: { message?: string };
  };
  if (!response.ok || !result.secure_url) throw new Error(result.error?.message || "Image upload failed.");
  return {
    url: result.secure_url,
    publicId: result.public_id ?? null,
    width: result.width ?? null,
    height: result.height ?? null,
    bytes: result.bytes ?? null,
    format: result.format ?? null,
  };
}

export default function MediaEditor() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = decodeURIComponent(params.id);
  const isNew = id === "new";
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [editorBusy, setEditorBusy] = useState(false);
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [mediaType, setMediaType] = useState<"video" | "short">("video");
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [duration, setDuration] = useState("");
  const [customThumbnail, setCustomThumbnail] = useState("");
  const [thumbnailMetadata, setThumbnailMetadata] = useState<ThumbnailMetadata | null>(null);
  const [featured, setFeatured] = useState(false);
  const [published, setPublished] = useState(false);
  const [sortOrder, setSortOrder] = useState(0);
  const videoId = useMemo(() => extractYouTubeVideoId(youtubeUrl), [youtubeUrl]);
  const thumbnail = customThumbnail.trim() || (videoId ? youtubeThumbnail(videoId) : "");
  const busy = saving || editorBusy || thumbnailUploading;

  useEffect(() => {
    getSupabase().from("media").select("category").eq("deleted", false).order("category").limit(1000)
      .then(({ data }) => {
        const unique = new Map<string, string>();
        for (const row of (data ?? []) as { category: string | null }[]) {
          const value = formatCategory(row.category ?? "");
          if (value) unique.set(value.toLocaleLowerCase(), value);
        }
        setCategories(Array.from(unique.values()).sort((a, b) => a.localeCompare(b)));
      });
  }, []);

  useEffect(() => {
    if (isNew) return;
    getSupabase().from("media").select("*").eq("id", id).single().then(({ data, error }) => {
      if (error) setError(error.message);
      else if (data) {
        const item = data as Media;
        setYoutubeUrl(item.youtube_url);
        setTitle(item.title);
        setDescription(item.description);
        setMediaType(item.media_type);
        setCategory(item.category);
        setDuration(item.duration_seconds == null ? "" : String(item.duration_seconds));
        setCustomThumbnail(item.thumbnail_url === youtubeThumbnail(item.youtube_video_id) ? "" : item.thumbnail_url);
        setThumbnailMetadata(item.thumbnail_public_id ? {
          url: item.thumbnail_url,
          publicId: item.thumbnail_public_id,
          width: item.thumbnail_width,
          height: item.thumbnail_height,
          bytes: item.thumbnail_bytes,
          format: item.thumbnail_format,
        } : null);
        setFeatured(item.is_featured);
        setPublished(item.is_published);
        setSortOrder(item.sort_order);
      }
      setLoading(false);
    });
  }, [id, isNew]);

  const importYouTubeDetails = async () => {
    if (!videoId || importing) return;
    setImporting(true);
    setError(null);
    try {
      const { data } = await getSupabase().auth.getSession();
      const response = await fetch(`/api/youtube-metadata?videoId=${encodeURIComponent(videoId)}`, { headers: { Authorization: `Bearer ${data.session?.access_token || ""}` } });
      const metadata = await response.json() as { error?: string; title?: string; description?: string; durationSeconds?: number | null; thumbnailUrl?: string };
      if (!response.ok) throw new Error(metadata.error || "YouTube details could not be imported.");
      if (metadata.title) setTitle(metadata.title);
      if (metadata.description) setDescription(metadata.description);
      if (metadata.durationSeconds != null) setDuration(String(metadata.durationSeconds));
      if (metadata.thumbnailUrl) { setCustomThumbnail(metadata.thumbnailUrl); setThumbnailMetadata(null); }
    } catch (reason) { setError((reason as Error).message); }
    finally { setImporting(false); }
  };

  const uploadThumbnail = async (file: File) => {
    if (!file.type.startsWith("image/")) { setError("Choose a PNG, JPEG, GIF, or WebP image."); return; }
    setThumbnailUploading(true);
    setError(null);
    try {
      const uploaded = await uploadCloudinaryImage(file, "advent-pro/media/thumbnails");
      setCustomThumbnail(uploaded.url);
      setThumbnailMetadata(uploaded);
    } catch (reason) { setError((reason as Error).message); }
    finally { setThumbnailUploading(false); }
  };

  const normalizeSelectedCategory = () => {
    const typed = formatCategory(category);
    const existing = categories.find((value) => value.toLocaleLowerCase() === typed.toLocaleLowerCase());
    const normalized = existing ?? typed;
    setCategory(normalized);
    return normalized;
  };

  const save = async (publish?: boolean) => {
    if (busy) return;
    setSaving(true);
    setError(null);
    try {
      if (!videoId) throw new Error("Paste a valid YouTube watch, youtu.be, or Shorts URL.");
      if (!title.trim()) throw new Error("Title is required.");
      if (!thumbnail) throw new Error("Upload a thumbnail or import one from YouTube.");
      const seconds = duration.trim() ? Number(duration) : null;
      if (seconds != null && (!Number.isInteger(seconds) || seconds < 0)) throw new Error("Duration must be whole seconds.");
      const isPublished = publish ?? published;
      const payload = {
        source_type: "youtube",
        youtube_video_id: videoId,
        youtube_url: youtubeUrl.trim(),
        title: title.trim(),
        description: sanitizeRichTextHtml(description),
        media_type: mediaType,
        category: normalizeSelectedCategory(),
        thumbnail_url: thumbnail,
        thumbnail_public_id: thumbnailMetadata?.publicId ?? null,
        thumbnail_width: thumbnailMetadata?.width ?? null,
        thumbnail_height: thumbnailMetadata?.height ?? null,
        thumbnail_bytes: thumbnailMetadata?.bytes ?? null,
        thumbnail_format: thumbnailMetadata?.format ?? null,
        duration_seconds: seconds,
        is_featured: featured,
        sort_order: Math.trunc(sortOrder || 0),
        is_published: isPublished,
        deleted: false,
        published_at: isPublished ? new Date().toISOString() : null,
      };
      const query = isNew ? getSupabase().from("media").insert(payload) : getSupabase().from("media").update(payload).eq("id", id);
      const { error } = await query;
      if (error) throw error;
      router.push("/media");
    } catch (reason) { setError((reason as Error).message); setSaving(false); }
  };

  const archive = async () => {
    if (!confirm("Archive this media item? It will disappear from the app.")) return;
    setSaving(true);
    const { error } = await getSupabase().from("media").update({ is_published: false, deleted: true }).eq("id", id);
    if (error) { setError(error.message); setSaving(false); } else router.push("/media");
  };

  if (loading) return <div className="center-screen">Loading…</div>;
  return <div style={{ maxWidth: 820 }}>
    <h1>{isNew ? "Add media" : "Edit media"}</h1>
    <p className="sub">Paste a YouTube URL, format the description, and upload a thumbnail.</p>
    <div className="card">
      <label>YouTube URL *</label><input value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=…" />{youtubeUrl && <div className={videoId ? "meta" : "error"} style={{ marginTop: 6 }}>{videoId ? `Video ID: ${videoId}` : "This is not a supported YouTube URL."}</div>}
      {videoId && <div className="row" style={{ marginTop: 10 }}><button className="btn" type="button" disabled={importing} onClick={() => void importYouTubeDetails()}>{importing ? "Importing…" : "Import title, description & duration"}</button></div>}
      <label>Title *</label><input value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} />
      <label>Description</label>
      <RichTextEditor value={description} onChange={setDescription} placeholder="Write the video description…" minHeight={260} ariaLabel="Media description" uploadImage={cloudinaryCloudName && cloudinaryUploadPreset ? async (source) => (await uploadCloudinaryImage(source, "advent-pro/media/descriptions")).url : undefined} onBusyChange={setEditorBusy} />
      <div className="field-row"><div><label>Media type *</label><select value={mediaType} onChange={(e) => setMediaType(e.target.value as typeof mediaType)}><option value="video">Video</option><option value="short">Short</option></select></div><div><label>Category</label><input list="media-category-list" value={category} maxLength={100} onChange={(e) => setCategory(e.target.value)} onBlur={normalizeSelectedCategory} placeholder="Search or add a category" /><datalist id="media-category-list">{categories.map((value) => <option key={value} value={value} />)}</datalist><div className="meta" style={{ marginTop: 6 }}>Choose an existing category when available. New categories are saved in sentence case.</div></div></div>
      <div className="field-row"><div><label>Duration (seconds, optional)</label><input type="number" min="0" value={duration} onChange={(e) => setDuration(e.target.value)} /></div><div><label>Sort order</label><input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} /></div></div>
      <label>Thumbnail image *</label>
      <input type="file" accept="image/png,image/jpeg,image/gif,image/webp" disabled={thumbnailUploading} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadThumbnail(file); event.target.value = ""; }} />
      <div className="meta" style={{ marginTop: 6 }}>{thumbnailUploading ? "Uploading thumbnail to Cloudinary…" : thumbnailMetadata?.publicId ? "Stored in Cloudinary; image metadata will be saved in Supabase." : "Upload a custom image, or use the imported YouTube thumbnail."}</div>
      {thumbnail && <div style={{ marginTop: 12 }}><img src={thumbnail} alt="Thumbnail preview" style={{ width: "100%", maxWidth: 360, aspectRatio: "16 / 9", objectFit: "cover", borderRadius: 12 }} />{customThumbnail && videoId && <div style={{ marginTop: 8 }}><button type="button" className="btn" onClick={() => { setCustomThumbnail(""); setThumbnailMetadata(null); }}>Use YouTube thumbnail</button></div>}</div>}
      {videoId && <div style={{ margin: "16px 0" }}><div className="meta" style={{ marginBottom: 8 }}>Preview (YouTube embedded playback)</div><div style={{ position: "relative", maxWidth: 560, aspectRatio: "16 / 9" }}><iframe title="Media preview" src={`https://www.youtube-nocookie.com/embed/${videoId}`} allow="accelerometer; autoplay; encrypted-media; picture-in-picture" allowFullScreen style={{ width: "100%", height: "100%", border: 0, borderRadius: 12 }} /></div></div>}
      <div className="check"><input id="featured" type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} /><label htmlFor="featured" style={{ margin: 0 }}>Featured / pinned</label></div>
      {!isNew && <div className="check"><input id="published" type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} /><label htmlFor="published" style={{ margin: 0 }}>Published</label></div>}
      {error && <div className="error">{error}</div>}
      <div className="row wrap" style={{ marginTop: 20, gap: 10 }}><button className="btn" disabled={busy} onClick={() => void save(false)}>Save draft</button><button className="btn primary" disabled={busy} onClick={() => void save(true)}>{editorBusy ? "Uploading description images…" : thumbnailUploading ? "Uploading thumbnail…" : saving ? "Saving…" : "Save & publish"}</button>{!isNew && published && <button className="btn" disabled={busy} onClick={() => void save(false)}>Unpublish</button>}{!isNew && <button className="btn danger" disabled={busy} onClick={() => void archive()}>Archive</button>}</div>
    </div>
  </div>;
}
