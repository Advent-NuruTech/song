import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import Constants from "expo-constants";
import { AppState, Platform } from "react-native";

type Extra = { supabaseUrl?: string; supabaseAnonKey?: string };
const extra = (Constants.expoConfig?.extra ?? {}) as Extra;
const url = (process.env.EXPO_PUBLIC_SUPABASE_URL || extra.supabaseUrl || "").trim();
const key = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || extra.supabaseAnonKey || "").trim();

export const authConfigured = Boolean(url && key);
const isServerRender = Platform.OS === "web" && typeof window === "undefined";
const serverStorage = {
  getItem: async (_key: string) => null,
  setItem: async (_key: string, _value: string) => undefined,
  removeItem: async (_key: string) => undefined,
};
export const supabase = createClient(url || "https://invalid.local", key || "missing", {
  auth: {
    storage: isServerRender ? serverStorage : AsyncStorage,
    persistSession: !isServerRender,
    autoRefreshToken: true,
    detectSessionInUrl: Platform.OS === "web" && !isServerRender,
  },
});

if (Platform.OS !== "web") {
  AppState.addEventListener("change", (state) => {
    if (state === "active") supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
