import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type VersionMeta = { id: string; file: string; name: string; abbreviation?: string; language?: string };
type BibleData = Record<string, Record<string, Record<string, string>>>;

let catalogPromise: Promise<VersionMeta[]> | null = null;
const versionCache = new Map<string, Promise<BibleData>>();

function contentPath(...parts: string[]) {
  return resolve(process.cwd(), "..", "content", "bible", ...parts);
}

function catalog() {
  catalogPromise ??= readFile(contentPath("index.json"), "utf8")
    .then((value) => (JSON.parse(value) as { versions?: VersionMeta[] }).versions ?? []);
  return catalogPromise;
}

async function versionData(versionId: string) {
  const versions = await catalog();
  const version = versions.find((item) => item.id === versionId);
  if (!version?.file || !/^[a-z0-9_.-]+\.json$/i.test(version.file)) return null;
  let pending = versionCache.get(version.id);
  if (!pending) {
    pending = readFile(contentPath("versions", version.file), "utf8").then((value) => JSON.parse(value) as BibleData);
    versionCache.set(version.id, pending);
  }
  return { version, data: await pending };
}

const normalize = (value: string) => value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();

export async function GET(request: NextRequest) {
  try {
    const action = request.nextUrl.searchParams.get("action") ?? "catalog";
    if (action === "catalog") return NextResponse.json({ versions: await catalog() });

    const versionId = request.nextUrl.searchParams.get("version") ?? "";
    const loaded = await versionData(versionId);
    if (!loaded) return NextResponse.json({ error: "Unknown Bible version." }, { status: 404 });

    if (action === "books") {
      const books = Object.entries(loaded.data).map(([book, chapters]) => ({
        book,
        chapterCount: Math.max(0, ...Object.keys(chapters).map(Number).filter(Number.isFinite)),
      }));
      return NextResponse.json({ books });
    }

    if (action === "chapter") {
      const book = request.nextUrl.searchParams.get("book") ?? "";
      const chapter = Number(request.nextUrl.searchParams.get("chapter"));
      const source = loaded.data[book]?.[String(chapter)];
      if (!source) return NextResponse.json({ error: "Chapter not found." }, { status: 404 });
      const verses = Object.entries(source).map(([verse, text]) => ({ verse: Number(verse), text })).sort((a, b) => a.verse - b.verse);
      return NextResponse.json({ verses });
    }

    if (action === "search") {
      const query = (request.nextUrl.searchParams.get("q") ?? "").trim();
      if (!query) return NextResponse.json({ hits: [] });
      const books = Object.keys(loaded.data);
      const reference = query.match(/^(.+?)\s+(\d+)(?:\s*:\s*(\d+)(?:\s*[-\u2013\u2014]\s*(\d+))?)?$/);
      const hits: { book: string; chapter: number; verse: number; text: string }[] = [];
      if (reference) {
        const requested = normalize(reference[1]);
        const book = books.find((item) => normalize(item) === requested) ?? books.find((item) => normalize(item).startsWith(requested));
        const chapter = Number(reference[2]);
        const start = reference[3] ? Number(reference[3]) : 1;
        const end = reference[4] ? Number(reference[4]) : reference[3] ? start : Number.MAX_SAFE_INTEGER;
        const source = book ? loaded.data[book]?.[String(chapter)] : undefined;
        if (book && source) {
          Object.entries(source).forEach(([verse, text]) => {
            const number = Number(verse);
            if (number >= start && number <= end) hits.push({ book, chapter, verse: number, text });
          });
        }
      } else {
        const needle = normalize(query);
        outer: for (const [book, chapters] of Object.entries(loaded.data)) {
          for (const [chapter, verses] of Object.entries(chapters)) {
            for (const [verse, text] of Object.entries(verses)) {
              if (normalize(text).includes(needle)) hits.push({ book, chapter: Number(chapter), verse: Number(verse), text });
              if (hits.length >= 60) break outer;
            }
          }
        }
      }
      return NextResponse.json({ hits: hits.slice(0, 60) });
    }

    return NextResponse.json({ error: "Unsupported Bible request." }, { status: 400 });
  } catch (error) {
    console.error("Bible editor API failed", error);
    return NextResponse.json({ error: "Bible content is temporarily unavailable." }, { status: 500 });
  }
}
