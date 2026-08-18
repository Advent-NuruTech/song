import { ContentConfig } from "./config";

/** fetch JSON with a timeout. Returns null on any failure (offline-tolerant). */
export async function fetchJson<T>(
  url: string,
  timeoutMs: number = ContentConfig.fetchTimeoutMs
): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
