import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

function isoDurationSeconds(value: string) {
  const match = value.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) return null;
  return Number(match[1] || 0) * 3600 + Number(match[2] || 0) * 60 + Number(match[3] || 0);
}

export async function GET(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const apiKey = process.env.YOUTUBE_API_KEY || "";
  if (!token || !url || !anon) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const client = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: { user } } = await client.auth.getUser(token);
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const { data: allowed } = await client.rpc("has_permission", { requested: "media.manage" });
  if (!allowed) return NextResponse.json({ error: "Media management permission required" }, { status: 403 });
  if (!apiKey) return NextResponse.json({ error: "YouTube API is not configured" }, { status: 503 });

  const videoId = request.nextUrl.searchParams.get("videoId") || "";
  if (!VIDEO_ID.test(videoId)) return NextResponse.json({ error: "Invalid video ID" }, { status: 400 });
  const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,status&id=${encodeURIComponent(videoId)}&key=${encodeURIComponent(apiKey)}`, { cache: "no-store" });
  if (!response.ok) return NextResponse.json({ error: "YouTube metadata could not be loaded" }, { status: 502 });
  const payload = await response.json() as { items?: { snippet?: { title?: string; description?: string; categoryId?: string; thumbnails?: Record<string, { url: string }> }; contentDetails?: { duration?: string }; status?: { embeddable?: boolean; privacyStatus?: string } }[] };
  const item = payload.items?.[0];
  if (!item) return NextResponse.json({ error: "Video not found" }, { status: 404 });
  if (item.status?.embeddable === false) return NextResponse.json({ error: "This video does not allow embedded playback" }, { status: 422 });
  const thumbnails = item.snippet?.thumbnails || {};
  return NextResponse.json({ title: item.snippet?.title || "", description: item.snippet?.description || "", durationSeconds: isoDurationSeconds(item.contentDetails?.duration || ""), thumbnailUrl: thumbnails.maxres?.url || thumbnails.standard?.url || thumbnails.high?.url || "", privacyStatus: item.status?.privacyStatus || "" });
}
