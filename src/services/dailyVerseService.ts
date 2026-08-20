import AsyncStorage from "@react-native-async-storage/async-storage";

export type DailyVerse = {
  id: string;
  reference: string;
  text: string;
  expiresAt: number;
};

type DailyVerseDismissal = {
  id: string;
  expiresAt: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const DISMISSAL_KEY = "@home/dailyVerseDismissal";

// A compact, bundled collection keeps the home screen useful offline. The
// selected entry is derived from the current 24-hour slot; no verse rows are
// created in SQLite or Supabase.
const DAILY_VERSES = [
  { reference: "Psalm 119:105", text: "Thy word is a lamp unto my feet, and a light unto my path." },
  { reference: "Proverbs 3:5-6", text: "Trust in the Lord with all thine heart; and lean not unto thine own understanding. In all thy ways acknowledge him, and he shall direct thy paths." },
  { reference: "Isaiah 41:10", text: "Fear thou not; for I am with thee: be not dismayed; for I am thy God: I will strengthen thee; yea, I will help thee." },
  { reference: "Matthew 5:16", text: "Let your light so shine before men, that they may see your good works, and glorify your Father which is in heaven." },
  { reference: "Matthew 11:28", text: "Come unto me, all ye that labour and are heavy laden, and I will give you rest." },
  { reference: "John 3:16", text: "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life." },
  { reference: "John 14:6", text: "Jesus saith unto him, I am the way, the truth, and the life: no man cometh unto the Father, but by me." },
  { reference: "Romans 8:28", text: "And we know that all things work together for good to them that love God, to them who are the called according to his purpose." },
  { reference: "Romans 12:2", text: "Be not conformed to this world: but be ye transformed by the renewing of your mind, that ye may prove what is that good, and acceptable, and perfect, will of God." },
  { reference: "1 Corinthians 10:31", text: "Whether therefore ye eat, or drink, or whatsoever ye do, do all to the glory of God." },
  { reference: "2 Corinthians 5:7", text: "For we walk by faith, not by sight." },
  { reference: "Philippians 4:6-7", text: "Be careful for nothing; but in every thing by prayer and supplication with thanksgiving let your requests be made known unto God." },
  { reference: "Philippians 4:13", text: "I can do all things through Christ which strengtheneth me." },
  { reference: "Hebrews 11:1", text: "Now faith is the substance of things hoped for, the evidence of things not seen." },
] as const;

export function getDailyVerse(now = Date.now()): DailyVerse {
  const slot = Math.floor(now / DAY_MS);
  const verse = DAILY_VERSES[slot % DAILY_VERSES.length];
  return {
    id: `${slot}:${verse.reference}`,
    reference: verse.reference,
    text: verse.text,
    expiresAt: (slot + 1) * DAY_MS,
  };
}

export async function isDailyVerseRead(verse: DailyVerse): Promise<boolean> {
  try {
    const stored = await AsyncStorage.getItem(DISMISSAL_KEY);
    if (!stored) return false;

    const dismissal = JSON.parse(stored) as Partial<DailyVerseDismissal>;
    const active =
      dismissal.id === verse.id &&
      typeof dismissal.expiresAt === "number" &&
      Date.now() < dismissal.expiresAt;

    if (!active) await AsyncStorage.removeItem(DISMISSAL_KEY);
    return active;
  } catch {
    return false;
  }
}

export async function markDailyVerseRead(verse: DailyVerse): Promise<void> {
  const dismissal: DailyVerseDismissal = {
    id: verse.id,
    expiresAt: verse.expiresAt,
  };

  try {
    // One stable key is replaced, rather than adding a row for every day.
    await AsyncStorage.setItem(DISMISSAL_KEY, JSON.stringify(dismissal));
  } catch {
    // Dismissal persistence is a convenience and should never block reading.
  }
}
