import type { MediaLayout } from "./types";

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
]);

export function extractYouTubeVideoId(input: string): string | null {
  const value = input.trim();
  if (!value) return null;

  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;

    let candidate: string | null = null;
    const host = url.hostname.toLowerCase();
    if (host === "youtu.be" || host === "www.youtu.be") {
      candidate = url.pathname.split("/").filter(Boolean)[0] ?? null;
    } else if (YOUTUBE_HOSTS.has(host)) {
      if (url.pathname === "/watch") candidate = url.searchParams.get("v");
      else {
        const [kind, id] = url.pathname.split("/").filter(Boolean);
        if (["shorts", "embed", "live"].includes(kind)) candidate = id ?? null;
      }
    }
    return candidate && YOUTUBE_ID.test(candidate) ? candidate : null;
  } catch {
    return null;
  }
}

export function youtubeThumbnail(videoId: string): string {
  if (!YOUTUBE_ID.test(videoId)) throw new Error("Invalid YouTube video ID.");
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

export function getMediaLayout(absoluteIndex: number): MediaLayout {
  if (!Number.isInteger(absoluteIndex) || absoluteIndex < 0) {
    throw new Error("Media feed index must be a non-negative integer.");
  }
  return absoluteIndex % 15 < 10 ? "compact" : "full";
}

export function formatMediaCount(value: number): string {
  const count = Math.max(0, Math.trunc(value || 0));
  if (count < 1_000) return String(count);
  if (count < 1_000_000) return `${(count / 1_000).toFixed(count < 10_000 ? 1 : 0)}K`;
  return `${(count / 1_000_000).toFixed(count < 10_000_000 ? 1 : 0)}M`;
}

export function formatDuration(seconds: number | null): string | null {
  if (seconds == null || seconds < 0) return null;
  const whole = Math.trunc(seconds);
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const remainder = whole % 60;
  return hours
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`
    : `${minutes}:${String(remainder).padStart(2, "0")}`;
}

export function stripUnsafeComment(value: string): string {
  return value.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim().slice(0, 1000);
}
