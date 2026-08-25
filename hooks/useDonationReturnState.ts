import AsyncStorage from "@react-native-async-storage/async-storage";
import { Href, router, useGlobalSearchParams, usePathname } from "expo-router";
import { useCallback } from "react";

const RETURN_STATE_KEY = "donation_return_state_v1";
const MAX_PARAM_LENGTH = 500;
const RETURN_STATE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
let hasLiveReturnStack = false;

type RouteParams = Record<string, string | string[]>;

type DonationReturnState = {
  pathname: string;
  params: RouteParams;
  capturedAt: number;
};

function sanitizePathname(pathname: string) {
  if (!pathname.startsWith("/") || pathname.startsWith("//") || pathname.startsWith("/support")) {
    return "/";
  }
  return pathname;
}

function sanitizeParams(params: Record<string, string | string[] | undefined>): RouteParams {
  return Object.fromEntries(
    Object.entries(params).flatMap(([key, value]) => {
      if (!/^[A-Za-z0-9_-]{1,80}$/.test(key) || value === undefined) return [];
      const clean = (Array.isArray(value) ? value : [value])
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.slice(0, MAX_PARAM_LENGTH));
      if (!clean.length) return [];
      return [[key, Array.isArray(value) ? clean : clean[0]]];
    })
  );
}

async function saveReturnState(pathname: string, params: Record<string, string | string[] | undefined>) {
  const state: DonationReturnState = {
    pathname: sanitizePathname(pathname),
    params: sanitizeParams(params),
    capturedAt: Date.now(),
  };
  await AsyncStorage.setItem(RETURN_STATE_KEY, JSON.stringify(state));
  hasLiveReturnStack = true;
}

async function loadReturnState(): Promise<DonationReturnState | null> {
  try {
    const raw = await AsyncStorage.getItem(RETURN_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DonationReturnState>;
    if (typeof parsed.pathname !== "string" || typeof parsed.capturedAt !== "number") return null;
    if (Date.now() - parsed.capturedAt > RETURN_STATE_MAX_AGE_MS) return null;
    return {
      pathname: sanitizePathname(parsed.pathname),
      params: sanitizeParams(parsed.params ?? {}),
      capturedAt: parsed.capturedAt,
    };
  } catch {
    return null;
  }
}

export function useDonationReturnState() {
  const pathname = usePathname();
  const params = useGlobalSearchParams<Record<string, string | string[]>>();

  const openSupport = useCallback(async () => {
    await saveReturnState(pathname, params);
    router.push("/support" as Href);
  }, [params, pathname]);

  const returnToPreviousContent = useCallback(async () => {
    const state = await loadReturnState();
    await AsyncStorage.removeItem(RETURN_STATE_KEY);
    if (hasLiveReturnStack && router.canGoBack()) {
      hasLiveReturnStack = false;
      // Popping the support screens keeps the original component mounted, including scroll/playback state.
      if (pathname === "/support/checkout") router.dismiss(2);
      else router.back();
      return;
    }
    hasLiveReturnStack = false;
    if (state) {
      router.dismissTo({ pathname: state.pathname, params: state.params } as Href);
      return;
    }
    if (router.canGoBack()) router.back();
    else router.replace("/" as Href);
  }, [pathname]);

  return { openSupport, returnToPreviousContent };
}
