"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabaseClient";

type QueueItem = { id: string; media_id: string; media_title: string; author_name: string; content: string; status: "visible" | "hidden" | "deleted"; report_count: number; created_at: string };

export default function MediaModerationPage() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [status, setStatus] = useState<"all" | QueueItem["status"]>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => { setLoading(true); const { data, error } = await getSupabase().rpc("get_media_moderation_queue", { p_status: status === "all" ? null : status, p_limit: 100 }); if (error) setError(error.message); else { setError(null); setItems((data as QueueItem[]) ?? []); } setLoading(false); }, [status]);
  useEffect(() => { void load(); }, [load]);
  const moderate = async (id: string, action: QueueItem["status"]) => { const { error } = await getSupabase().rpc("moderate_media_comment", { p_comment_id: id, p_action: action }); if (error) setError(error.message); else void load(); };
  return <div><div className="row between"><div><h1>Comment moderation</h1><p className="sub">Reported comments appear first. Hiding or deleting updates the public comment total safely.</p></div><select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}><option value="all">All statuses</option><option value="visible">Visible</option><option value="hidden">Hidden</option><option value="deleted">Deleted</option></select></div>{error && <div className="error">{error}</div>}<div className="list">{loading && <div className="list-item">Loading…</div>}{!loading && !items.length && <div className="list-item">No comments found.</div>}{items.map((item) => <div className="list-item" key={item.id}><div className="grow"><div className="title">{item.author_name} on {item.media_title}</div><div style={{ margin: "6px 0" }}>{item.content}</div><div className="meta">{new Date(item.created_at).toLocaleString()} · {item.report_count} open report{item.report_count === 1 ? "" : "s"} · {item.status}</div></div><div className="row wrap" style={{ gap: 6 }}><button className="btn" onClick={() => void moderate(item.id, "visible")}>Show</button><button className="btn" onClick={() => void moderate(item.id, "hidden")}>Hide</button><button className="btn danger" onClick={() => void moderate(item.id, "deleted")}>Delete</button></div></div>)}</div></div>;
}
