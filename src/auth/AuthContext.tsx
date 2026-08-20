import type { Session, User } from "@supabase/supabase-js";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { authConfigured, supabase } from "./supabaseClient";

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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);

  const refreshAccess = useCallback(async () => {
    const userId = session?.user.id;
    if (!userId) { setProfile(null); setRoles([]); setPermissions([]); return; }
    const [{ data: p }, { data: assigned }] = await Promise.all([
      supabase.from("profiles").select("id,email,display_name").eq("id", userId).maybeSingle(),
      supabase.from("app_user_roles").select("role_name,app_roles(app_role_permissions(permission_name))").eq("user_id", userId),
    ]);
    setProfile((p as Profile | null) ?? null);
    const rows = (assigned ?? []) as unknown as { role_name: string; app_roles: { app_role_permissions: { permission_name: string }[] } | null }[];
    setRoles(rows.map((r) => r.role_name));
    setPermissions([...new Set(rows.flatMap((r) => r.app_roles?.app_role_permissions?.map((x) => x.permission_name) ?? []))]);
  }, [session?.user.id]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false); });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => { setSession(next); setLoading(false); });
    return () => data.subscription.unsubscribe();
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
    async signOut() { const { error } = await supabase.auth.signOut(); if (error) throw error; },
    refreshAccess,
  }), [loading, session, profile, roles, permissions, refreshAccess]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
