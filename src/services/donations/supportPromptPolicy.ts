export function supportMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
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
