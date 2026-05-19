import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

export const ADMIN_MODE_TAP_TARGET = 5;
const ADMIN_MODE_KEY = "@admin/mode_enabled";

export async function isAdminModeEnabled(): Promise<boolean> {
  const value = await AsyncStorage.getItem(ADMIN_MODE_KEY);
  return value === "true";
}

export async function setAdminModeEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(ADMIN_MODE_KEY, enabled ? "true" : "false");
}

export async function ensureAdminModeEnabled(): Promise<void> {
  const enabled = await isAdminModeEnabled();
  if (!enabled) {
    throw new Error("Admin mode is disabled. Enable it from the About screen.");
  }
}

export function getRemainingAdminTaps(currentTapCount: number): number {
  const remaining = ADMIN_MODE_TAP_TARGET - currentTapCount;
  return remaining > 0 ? remaining : 0;
}

export function useAdminMode() {
  const [enabled, setEnabledState] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const next = await isAdminModeEnabled();
      setEnabledState(next);
    } finally {
      setLoading(false);
    }
  }, []);

  const setEnabled = useCallback(async (value: boolean) => {
    await setAdminModeEnabled(value);
    setEnabledState(value);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    enabled,
    loading,
    refresh,
    setEnabled,
  };
}
