"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabaseClient";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/songs", label: "Songs" },
  { href: "/studies", label: "Studies" },
  { href: "/categories", label: "Categories" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabase();
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (!data.session) {
        router.replace("/login");
        return;
      }
      setEmail(data.session.user.email ?? null);
      setReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace("/login");
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [router]);

  const signOut = async () => {
    await getSupabase().auth.signOut();
    router.replace("/login");
  };

  if (!ready) {
    return <div className="center-screen">Loading…</div>;
  }

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">Advent Pro</div>
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-link${isActive(item.href) ? " active" : ""}`}
          >
            {item.label}
          </Link>
        ))}
        <div className="spacer" />
        <div className="meta" style={{ color: "var(--muted)", fontSize: 12, padding: "0 10px 8px" }}>
          {email}
        </div>
        <button className="btn" onClick={signOut}>
          Sign out
        </button>
      </aside>
      <main className="content">{children}</main>
    </div>
  );
}
