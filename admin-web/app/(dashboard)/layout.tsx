"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { getSupabase } from "@/lib/supabaseClient";

const NAV = [
  { href: "/", label: "Dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
  { href: "/songs", label: "Songs", icon: "M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" },
  { href: "/studies", label: "Studies", icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" },
  { href: "/categories", label: "Categories", icon: "M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" },
  { href: "/media", label: "Media", icon: "M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" },
  { href: "/verse-templates", label: "Verse templates", icon: "M4 5a2 2 0 012-2h12a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 11l3-3 2 2 3-4 3 5H7z" },
  { href: "/users", label: "Users & roles", icon: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zm14 10v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" },
  { href: "/donations", label: "Donations", seniorOnly: true, icon: "M12 21C12 21 4 16.5 4 10.5A4.5 4.5 0 0112 7.7a4.5 4.5 0 018 2.8C20 16.5 12 21 12 21z" },
];

const NavIcon = ({ d }: { d: string }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [canViewDonations, setCanViewDonations] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const supabase = getSupabase();
    let active = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      if (!data.session) {
        router.replace("/login");
        return;
      }
      const [{ data: allowed }, { data: donationAccess }] = await Promise.all([
        supabase.rpc("has_permission", { requested: "dashboard.access" }),
        supabase.rpc("has_permission", { requested: "donations.read" }),
      ]);
      if (!allowed) { await supabase.auth.signOut(); router.replace("/login?denied=1"); return; }
      setEmail(data.session.user.email ?? null);
      setCanViewDonations(Boolean(donationAccess));
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

  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [pathname, isMobile]);

  const signOut = async () => {
    await getSupabase().auth.signOut();
    router.replace("/login");
  };

  const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), []);

  if (!ready) {
    return <div className="center-screen">Loading…</div>;
  }

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <div className="app-layout">
      {/* Top Navbar */}
      <header className="topbar">
        <div className="topbar-left">
          <button className="topbar-toggle" onClick={toggleSidebar} aria-label="Toggle sidebar">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {sidebarOpen ? (
                <path d="M6 18L18 6M6 6l12 12" />
              ) : (
                <>
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </>
              )}
            </svg>
          </button>
          <Link href="/" className="topbar-brand">
            <img src="/favicon.png" alt="Advent Pro" className="topbar-logo" />
            <span className="topbar-title">Advent Pro</span>
          </Link>
        </div>
        <div className="topbar-right">
          <span className="topbar-email">{email}</span>
          <button className="topbar-signout" onClick={signOut}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </header>

      <div className="app-body">
        {/* Sidebar */}
        <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
          <nav className="sidebar-nav">
            {NAV.filter((item) => !("seniorOnly" in item) || canViewDonations).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-link${isActive(item.href) ? " active" : ""}`}
              >
                <NavIcon d={item.icon} />
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </aside>

        {/* Mobile overlay */}
        {sidebarOpen && isMobile && (
          <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Main content */}
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
