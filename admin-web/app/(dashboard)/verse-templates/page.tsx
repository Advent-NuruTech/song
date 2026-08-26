"use client";

import { useCallback, useEffect, useState } from "react";

import { getSupabase } from "@/lib/supabaseClient";
import type { DailyVerseTemplate } from "@/lib/types";

const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

type CloudinaryResult = {
  secure_url?: string;
  public_id?: string;
  width?: number;
  height?: number;
  error?: { message?: string };
};

export default function VerseTemplatesPage() {
  const [items, setItems] = useState<DailyVerseTemplate[]>([]);
  const [name, setName] = useState("");
  const [sortOrder, setSortOrder] = useState(100);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const supabase = getSupabase();
    const { data: allowed } = await supabase.rpc("has_permission", { requested: "content.edit" });
    if (!allowed) {
      setError("You do not have permission to manage verse templates.");
      return;
    }
    const { data, error } = await supabase
      .from("daily_verse_templates")
      .select("*")
      .order("is_default", { ascending: false })
      .order("sort_order", { ascending: true });
    if (error) setError(error.message);
    else setItems((data as DailyVerseTemplate[]) ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const upload = async (file: File) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (!cloudName || !uploadPreset) throw new Error("Cloudinary image storage is not configured.");
      if (!file.type.startsWith("image/")) throw new Error("Choose a PNG, JPG, or WebP image.");

      const body = new FormData();
      body.append("file", file);
      body.append("upload_preset", uploadPreset);
      body.append("folder", "advent-pro/daily-verse-templates");
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`,
        { method: "POST", body }
      );
      const result = (await response.json()) as CloudinaryResult;
      if (!response.ok || !result.secure_url) {
        throw new Error(result.error?.message || "Template upload failed.");
      }
      if (result.width && result.height && Math.abs(result.width / result.height - 1) > 0.03) {
        throw new Error("Verse templates must be square so they display and share correctly.");
      }

      const { error } = await getSupabase().from("daily_verse_templates").insert({
        name: name.trim() || file.name.replace(/\.[^.]+$/, ""),
        image_url: result.secure_url,
        image_public_id: result.public_id ?? null,
        is_active: true,
        is_default: items.length === 0,
        sort_order: Number(sortOrder) || 100,
      });
      if (error) throw error;
      setName("");
      setSortOrder(100);
      setNotice(items.length === 0 ? "Uploaded and selected for the app." : "Template uploaded. Select it below when ready.");
      await load();
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const selectForApp = async (id: string) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const supabase = getSupabase();
      const { error: clearError } = await supabase
        .from("daily_verse_templates")
        .update({ is_default: false })
        .neq("id", id);
      if (clearError) throw clearError;
      const { error: selectError } = await supabase
        .from("daily_verse_templates")
        .update({ is_default: true, is_active: true })
        .eq("id", id);
      if (selectError) throw selectError;
      setNotice("This template is now shown in the app and used for sharing.");
      await load();
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const toggleVisibility = async (item: DailyVerseTemplate) => {
    if (item.is_default && item.is_active) {
      setError("Select another template before hiding the one currently shown in the app.");
      return;
    }
    setBusy(true);
    setError(null);
    const { error } = await getSupabase()
      .from("daily_verse_templates")
      .update({ is_active: !item.is_active })
      .eq("id", item.id);
    if (error) setError(error.message);
    await load();
    setBusy(false);
  };

  const remove = async (item: DailyVerseTemplate) => {
    if (!confirm(`Delete template “${item.name}”?`)) return;
    setBusy(true);
    setError(null);
    const { error } = await getSupabase().from("daily_verse_templates").delete().eq("id", item.id);
    if (error) setError(error.message);
    else setNotice("Template removed. Its Cloudinary file was left intact for safe recovery.");
    await load();
    setBusy(false);
  };

  return (
    <div>
      <h1>Verse templates</h1>
      <p className="sub">
        Upload as many square backgrounds as you need, then choose which one appears to users and in shared images.
        If none is available, the blue template bundled with the app is used automatically.
      </p>

      <div className="card" style={{ marginBottom: 24, maxWidth: 720 }}>
        <div className="field-row">
          <div>
            <label>Template name</label>
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Blue Bible template" />
          </div>
          <div>
            <label>Sort order</label>
            <input type="number" value={sortOrder} onChange={(event) => setSortOrder(Number(event.target.value))} />
          </div>
        </div>
        <label>Square background image</label>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={busy}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
            event.target.value = "";
          }}
        />
        <div className="meta" style={{ marginTop: 7, color: "var(--muted)", fontSize: 12 }}>
          Use a 1:1 image with an open center for the verse and room near the bottom-left for its reference.
        </div>
      </div>

      {error && <div className="error" style={{ marginBottom: 14 }}>{error}</div>}
      {notice && <div className="notice" style={{ marginBottom: 14 }}>{notice}</div>}

      <div className="grid-cards" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))" }}>
        {items.map((item) => (
          <div className="card" key={item.id} style={{ padding: 12 }}>
            <img
              src={item.image_url}
              alt={item.name}
              style={{ display: "block", width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 10 }}
            />
            <div className="row between" style={{ marginTop: 12, alignItems: "flex-start" }}>
              <div>
                <div style={{ fontWeight: 800 }}>{item.name}</div>
                <div className="meta" style={{ color: "var(--muted)", fontSize: 12, marginTop: 3 }}>
                  Order {item.sort_order} · {item.is_active ? "Visible" : "Hidden"}
                </div>
              </div>
              {item.is_default && <span className="badge published">In app</span>}
            </div>
            <div className="row wrap" style={{ marginTop: 12, gap: 8 }}>
              {!item.is_default && (
                <button className="btn primary" disabled={busy} onClick={() => void selectForApp(item.id)}>
                  Use in app
                </button>
              )}
              <button className="btn" disabled={busy} onClick={() => void toggleVisibility(item)}>
                {item.is_active ? "Hide" : "Show"}
              </button>
              <button className="btn danger" disabled={busy} onClick={() => void remove(item)}>
                Delete
              </button>
            </div>
          </div>
        ))}
        {!items.length && <div className="card">No uploaded templates yet. The bundled blue fallback remains active.</div>}
      </div>
    </div>
  );
}
