export const SUPPORT_PROMPT_INTRO_DELAY_DAYS = 21;

const DAY_MS = 24 * 60 * 60 * 1000;

export function supportMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function isSupportPromptIntroComplete(firstUseAt: string | null, date = new Date()) {
  if (!firstUseAt) return false;

  const firstUseTime = Number(firstUseAt);
  if (!Number.isFinite(firstUseTime)) return false;

  return date.getTime() - firstUseTime >= SUPPORT_PROMPT_INTRO_DELAY_DAYS * DAY_MS;
}

export function isSupportPromptContentRoute(pathname: string) {
  return [
    "/songs",
    "/song/",
    "/bible",
    "/studies",
    "/media",
    "/playlists",
    "/notes",
    "/search",
  ].some((prefix) => pathname === prefix || pathname.startsWith(prefix));
}
