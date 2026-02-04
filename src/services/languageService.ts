import { runQuery } from "@/src/db/runQuery";

export type LanguageSummary = {
  value: string;
  code: string;
  name: string;
  total: number;
};

const COLOR_PALETTE = [
  "#3B82F6",
  "#10B981",
  "#8B5CF6",
  "#F59E0B",
  "#EF4444",
  "#14B8A6",
  "#6366F1",
  "#EC4899",
];

function hashCode(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getLanguageColor(value: string) {
  const index = hashCode(value) % COLOR_PALETTE.length;
  return COLOR_PALETTE[index];
}

export function formatLanguageName(value: string) {
  const clean = value.replace(/[_-]+/g, " ").trim();
  if (!clean) return "Unknown";
  const normalized = clean.toLowerCase();
  const knownNames: Record<string, string> = {
    en: "English",
    eng: "English",
    sw: "Swahili",
    swa: "Swahili",
    luo: "Luo",
    ki: "Kikuyu",
  };
  if (knownNames[normalized]) {
    return knownNames[normalized];
  }
  if (clean.length <= 3 && /^[a-z]+$/.test(clean)) {
    return clean.toUpperCase();
  }
  return clean.replace(/\b\w/g, (char) => char.toUpperCase());
}

export function formatLanguageLabel(value: string) {
  const clean = value.replace(/[_-]+/g, " ").trim();
  if (!clean) return "";
  if (clean.length <= 3 && !clean.includes(" ")) {
    return clean.toUpperCase();
  }
  const words = clean.split(/\s+/);
  const initials = words.map((word) => word[0]).join("");
  if (initials.length >= 2 && initials.length <= 4) {
    return initials.toUpperCase();
  }
  return clean.slice(0, 3).toUpperCase();
}

export async function getLanguagesWithCounts(): Promise<LanguageSummary[]> {
  const result = await runQuery(
    `
      SELECT
        s.language as value,
        COALESCE(l.code, s.language) as code,
        COALESCE(l.name, s.language) as name,
        COUNT(*) as total
      FROM songs s
      LEFT JOIN languages l
        ON lower(l.code) = lower(s.language)
      GROUP BY s.language, l.code, l.name
      ORDER BY total DESC, name ASC
    `
  );

  return result.rows._array.map((row) => ({
    value: row.value,
    code: row.code ?? row.value,
    name: row.name ? String(row.name) : formatLanguageName(row.value),
    total: row.total ?? 0,
  }));
}

export async function getLanguageMap() {
  const result = await runQuery(
    `
      SELECT DISTINCT
        s.language as value,
        COALESCE(l.code, s.language) as code,
        COALESCE(l.name, s.language) as name
      FROM songs s
      LEFT JOIN languages l
        ON lower(l.code) = lower(s.language)
    `
  );

  const map: Record<string, { code: string; name: string }> = {};
  for (const row of result.rows._array) {
    map[row.value] = {
      code: row.code ?? row.value,
      name: row.name ? String(row.name) : formatLanguageName(row.value),
    };
  }
  return map;
}
