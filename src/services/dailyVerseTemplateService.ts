import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ImageSourcePropType } from "react-native";

import { authConfigured, supabase } from "@/src/auth/supabaseClient";

export type DailyVerseTemplate = {
  id: string;
  name: string;
  imageSource: ImageSourcePropType;
  remoteUrl?: string;
};

type CachedTemplate = {
  id: string;
  name: string;
  remoteUrl: string;
};

const TEMPLATE_CACHE_KEY = "@home/dailyVerseTemplate";

export const FALLBACK_DAILY_VERSE_TEMPLATE: DailyVerseTemplate = {
  id: "bundled-fallback",
  name: "Advent Pro blue",
  imageSource: require("@/assets/images/templatet.jpg"),
};

function fromCached(template: CachedTemplate): DailyVerseTemplate {
  return {
    id: template.id,
    name: template.name,
    remoteUrl: template.remoteUrl,
    imageSource: { uri: template.remoteUrl },
  };
}

/**
 * Returns the template selected in the admin dashboard. The bundled design is
 * always available, including before the database migration or while offline.
 */
export async function getDailyVerseTemplate(): Promise<DailyVerseTemplate> {
  if (authConfigured) {
    try {
      const { data, error } = await supabase
        .from("daily_verse_templates")
        .select("id,name,image_url")
        .eq("is_active", true)
        .order("is_default", { ascending: false })
        .order("sort_order", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (data?.image_url) {
        const cached: CachedTemplate = {
          id: data.id,
          name: data.name,
          remoteUrl: data.image_url,
        };
        await AsyncStorage.setItem(TEMPLATE_CACHE_KEY, JSON.stringify(cached));
        return fromCached(cached);
      }
      await AsyncStorage.removeItem(TEMPLATE_CACHE_KEY);
      return FALLBACK_DAILY_VERSE_TEMPLATE;
    } catch {
      // A cached remote template may still be in the platform image cache.
    }
  }

  try {
    const raw = await AsyncStorage.getItem(TEMPLATE_CACHE_KEY);
    if (raw) {
      const cached = JSON.parse(raw) as Partial<CachedTemplate>;
      if (cached.id && cached.name && cached.remoteUrl) {
        return fromCached(cached as CachedTemplate);
      }
    }
  } catch {
    // The local fallback below is intentionally dependency-free.
  }

  return FALLBACK_DAILY_VERSE_TEMPLATE;
}
