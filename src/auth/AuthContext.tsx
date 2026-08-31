import type { Session, User } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { authConfigured, supabase } from "./supabaseClient";
import { disableCurrentPushDevice } from "@/src/features/notifications/notificationService";

type Profile = { id: string; email: string; display_name: string };
type AuthValue = {
  loading: boolean; configured: boolean; session: Session | null; user: User | null;
  profile: Profile | null; roles: string[]; permissions: string[];
  signIn(email: string, password: string): Promise<void>;
  signUp(email: string, password: string, displayName: string): Promise<boolean>;
  updateDisplayName(displayName: string): Promise<void>;
  updateEmail(email: string): Promise<boolean>;
  updatePassword(password: string): Promise<void>;
  signOut(): Promise<void>; refreshAccess(): Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);
const OFFLINE_SESSION_KEY = "@auth/offline_session";
const OFFLINE_ACCESS_KEY = "@auth/offline_access";

type OfflineAccess = { profile: Profile | null; roles: string[]; permissions: string[] };

function parseStored<T>(value: string | null): T | null {
  if (!value) return null;
  try { return JSON.parse(value) as T; } catch { return null; }
}

async function cacheSession(next: Session | null) {
  if (next) await AsyncStorage.setItem(OFFLINE_SESSION_KEY, JSON.stringify(next));
  else await AsyncStorage.removeItem(OFFLINE_SESSION_KEY);
}

async function cacheAccess(next: OfflineAccess) {
  await AsyncStorage.setItem(OFFLINE_ACCESS_KEY, JSON.stringify(next));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);

  const refreshAccess = useCallback(async () => {
    const userId = session?.user.id;
    if (!userId) { setProfile(null); setRoles([]); setPermissions([]); return; }
    const [{ data: p, error: profileError }, { data: assigned, error: rolesError }] = await Promise.all([
      supabase.from("profiles").select("id,email,display_name").eq("id", userId).maybeSingle(),
      supabase.from("app_user_roles").select("role_name,app_roles(app_role_permissions(permission_name))").eq("user_id", userId),
    ]);
    // A connection failure must not turn a signed-in person into a guest. Keep
    // the last confirmed local identity and access while Supabase is unreachable.
    if (profileError || rolesError) return;
    const nextProfile = (p as Profile | null) ?? {
      id: userId,
      email: session?.user.email ?? "",
      display_name: String(session?.user.user_metadata?.display_name ?? ""),
    };
    const rows = (assigned ?? []) as unknown as { role_name: string; app_roles: { app_role_permissions: { permission_name: string }[] } | null }[];
    const nextRoles = rows.map((r) => r.role_name);
    const nextPermissions = [...new Set(rows.flatMap((r) => r.app_roles?.app_role_permissions?.map((x) => x.permission_name) ?? []))];
    setProfile(nextProfile); setRoles(nextRoles); setPermissions(nextPermissions);
    await cacheAccess({ profile: nextProfile, roles: nextRoles, permissions: nextPermissions });
  }, [session?.user.id, session?.user.email, session?.user.user_metadata?.display_name]);

  useEffect(() => {
    let active = true;
    void (async () => {
      const [storedSession, storedAccess] = await Promise.all([
        AsyncStorage.getItem(OFFLINE_SESSION_KEY),
        AsyncStorage.getItem(OFFLINE_ACCESS_KEY),
      ]);
      if (!active) return;
      const cachedSession = parseStored<Session>(storedSession);
      const cachedAccess = parseStored<OfflineAccess>(storedAccess);
      if (cachedSession) setSession(cachedSession);
      if (cachedAccess) {
        setProfile(cachedAccess.profile);
        setRoles(cachedAccess.roles);
        setPermissions(cachedAccess.permissions);
      }
      // getSession reads the persisted Supabase session locally. If it cannot
      // restore one (for example during an offline token-refresh failure), keep
      // the explicit offline cache instead of showing a logged-out account.
      try {
        const { data, error } = await supabase.auth.getSession();
        if (data.session && !error) {
          setSession(data.session);
          await cacheSession(data.session);
        } else if (!cachedSession) {
          setSession(null);
        }
      } catch {
        if (!cachedSession) setSession(null);
      } finally {
        if (active) setLoading(false);
      }
    })();
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      if (event === "SIGNED_OUT") {
        setSession(null); setProfile(null); setRoles([]); setPermissions([]);
        void cacheSession(null); void AsyncStorage.removeItem(OFFLINE_ACCESS_KEY);
      } else if (next) {
        setSession(next); void cacheSession(next);
      }
      setLoading(false);
    });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);
  useEffect(() => { void refreshAccess(); }, [refreshAccess]);

  const value = useMemo<AuthValue>(() => ({
    loading, configured: authConfigured, session, user: session?.user ?? null, profile, roles, permissions,
    async signIn(email, password) { const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password }); if (error) throw error; },
    async signUp(email, password, displayName) {
      const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { display_name: displayName.trim() } } });
      if (error) throw error; return !data.session;
    },
    async updateDisplayName(displayName) {
      const name = displayName.trim();
      if (!session?.user.id) throw new Error("Sign in to update your profile.");
      if (name.length < 2) throw new Error("Name must contain at least 2 characters.");
      const { error } = await supabase.from("profiles").update({ display_name: name }).eq("id", session.user.id);
      if (error) throw error;
      const { error: metadataError } = await supabase.auth.updateUser({ data: { display_name: name } });
      if (metadataError) throw metadataError;
      await refreshAccess();
    },
    async updateEmail(email) {
      const nextEmail = email.trim().toLowerCase();
      const { data, error } = await supabase.auth.updateUser({ email: nextEmail });
      if (error) throw error;
      return data.user?.email !== nextEmail;
    },
    async updatePassword(password) {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
    },
    async signOut() {
      try { await disableCurrentPushDevice(); }
      catch (error) { console.warn("Unable to disable this device before sign out", error); }
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      // Supabase emits SIGNED_OUT, but clear immediately as well so deliberate
      // sign-out never falls back to an old offline identity.
      setSession(null); setProfile(null); setRoles([]); setPermissions([]);
      await cacheSession(null); await AsyncStorage.removeItem(OFFLINE_ACCESS_KEY);
    },
    refreshAccess,
  }), [loading, session, profile, roles, permissions, refreshAccess]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
