"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signupCode, setSignupCode] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // If already signed in, skip the form.
  useEffect(() => {
    getSupabase()
      .auth.getSession()
      .then(({ data }) => {
        if (data.session) router.replace("/");
      });
  }, [router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    const supabase = getSupabase();

    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.replace("/");
      } else {
        const response = await fetch("/api/admin-signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, signupCode }),
        });
        const result = (await response.json()) as {
          error?: string;
          confirmationRequired?: boolean;
          existingAccount?: boolean;
        };
        if (!response.ok) throw new Error(result.error || "Unable to create account.");
        setNotice(
          result.existingAccount
            ? "Admin access granted. You can sign in now."
            : result.confirmationRequired
              ? "Admin account created. Confirm your email, then sign in."
              : "Admin account created. You can sign in now."
        );
        setSignupCode("");
        setMode("signin");
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={submit}>
        <div style={{ fontWeight: 800, fontSize: 22, color: "var(--brand)" }}>
          Advent Pro
        </div>
        <p className="sub" style={{ marginTop: 4 }}>
          Admin dashboard — {mode === "signin" ? "sign in" : "create account"}
        </p>

        <label>Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />

        {mode === "signup" && (
          <>
            <label>Admin signup code</label>
            <input
              type="password"
              value={signupCode}
              onChange={(e) => setSignupCode(e.target.value)}
              required
              autoComplete="off"
            />
          </>
        )}

        <label>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
        />

        <button
          className="btn primary"
          style={{ width: "100%", justifyContent: "center", marginTop: 18 }}
          disabled={busy}
        >
          {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Sign up"}
        </button>

        {error && <div className="error">{error}</div>}
        {notice && <div className="notice">{notice}</div>}

        <button
          type="button"
          className="btn"
          style={{ width: "100%", justifyContent: "center", marginTop: 12 }}
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError(null);
            setNotice(null);
          }}
        >
          {mode === "signin"
            ? "Need an account? Sign up"
            : "Have an account? Sign in"}
        </button>
      </form>
    </div>
  );
}
