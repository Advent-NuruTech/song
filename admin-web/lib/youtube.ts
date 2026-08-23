const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com", "youtube-nocookie.com", "www.youtube-nocookie.com"]);

export function extractYouTubeVideoId(input: string): string | null {
  try {
    const url = new URL(input.trim());
    if (!/^https?:$/.test(url.protocol)) return null;
    const host = url.hostname.toLowerCase();
    let value: string | null = null;
    if (host === "youtu.be" || host === "www.youtu.be") value = url.pathname.split("/").filter(Boolean)[0] ?? null;
    else if (HOSTS.has(host)) {
      if (url.pathname === "/watch") value = url.searchParams.get("v");
      else {
        const [kind, id] = url.pathname.split("/").filter(Boolean);
        if (["shorts", "embed", "live"].includes(kind)) value = id ?? null;
      }
    }
    return value && VIDEO_ID.test(value) ? value : null;
  } catch { return null; }
}

export const youtubeThumbnail = (id: string) => `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
