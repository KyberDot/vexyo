"use client";
import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useSettings } from "@/lib/SettingsContext";

const NAV = [
  { section: "Main", items: [
    { label: "Dashboard", href: "/dashboard", icon: "🏠" },
    { label: "AI Agent", href: "/dashboard/ai", icon: "🤖" },
  ]},
  { section: "Subscriptions", items: [
    { label: "My Subscriptions", href: "/dashboard/subscriptions", icon: "📋" },
    { label: "Analytics", href: "/dashboard/analytics", icon: "📊" },
    { label: "Categories", href: "/dashboard/categories", icon: "🏷️" },
    { label: "Family", href: "/dashboard/family", icon: "👨‍👩‍👧" },
    { label: "Payment Methods", href: "/dashboard/payments", icon: "💳" },
    { label: "Notifications", href: "/dashboard/notifications", icon: "🔔" },
    { label: "Shared Links", href: "/dashboard/shares", icon: "🔗" },
  ]},
  { section: "Account", items: [
    { label: "Profile", href: "/dashboard/profile", icon: "👤" },
    { label: "Settings", href: "/dashboard/settings", icon: "⚙️" },
  ]},
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const { platform } = useSettings();
  const [notifCount, setNotifCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status]);

  useEffect(() => {
    fetch("/api/notifications").then(r => r.json()).then(data => {
      if (Array.isArray(data)) setNotifCount(data.filter((n: any) => !n.read).length);
    }).catch(() => {});
    fetch("/api/profile").then(r => r.json()).then(data => {
      if (data?.role === "admin") setIsAdmin(true);
    }).catch(() => {});
  }, [pathname]);

  if (status === "loading") return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
      <div style={{ color: "var(--muted)", fontSize: 14 }}>Loading...</div>
    </div>
  );

  if (!session) return null;

  const accentColor = platform?.primary_color || "#6366F1";

  const SidebarContent = () => (
    <div style={{ width: 220, background: "var(--surface)", borderRight: "1px solid var(--border-color)", height: "100%", display: "flex", flexDirection: "column", padding: "16px 12px", gap: 2, flexShrink: 0, overflowY: "auto" }}>
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 4px", marginBottom: 16 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: accentColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, overflow: "hidden", flexShrink: 0 }}>
          {platform?.logo ? <img src={platform.logo} style={{ width: "100%", height: "100%", objectFit: "contain" }} alt="logo" /> : "💰"}
        </div>
        <span style={{ fontWeight: 800, fontSize: 17, letterSpacing: "-0.3px" }}>{platform?.app_name || "Nexyo"}</span>
      </div>

      {NAV.map(section => (
        <div key={section.section}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", letterSpacing: "0.1em", textTransform: "uppercase", padding: "8px 12px 4px" }}>{section.section}</div>
          {section.items.map(item => {
            const active = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} className={`nav-item ${active ? "active" : ""}`} style={{ textDecoration: "none" }}>
                <span style={{ fontSize: 14 }}>{item.icon}</span>
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.label === "Notifications" && notifCount > 0 && (
                  <span style={{ background: "#EF4444", color: "white", borderRadius: 99, fontSize: 10, fontWeight: 700, padding: "1px 6px" }}>{notifCount}</span>
                )}
              </Link>
            );
          })}
        </div>
      ))}

      {/* Admin link */}
      {isAdmin && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", letterSpacing: "0.1em", textTransform: "uppercase", padding: "8px 12px 4px" }}>Admin</div>
          <Link href="/admin" className={`nav-item ${pathname === "/admin" ? "active" : ""}`} style={{ textDecoration: "none" }}>
            <span style={{ fontSize: 14 }}>🛡️</span>
            <span>Admin Portal</span>
          </Link>
        </div>
      )}

      {/* User info */}
      <div style={{ marginTop: "auto", paddingTop: 12, borderTop: "1px solid var(--border-color)" }}>
        <Link href="/dashboard/profile" style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px", borderRadius: 8, textDecoration: "none", transition: "background 0.15s" }}
          onMouseEnter={e => (e.currentTarget.style.background = "var(--surface2)")}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
          <div style={{ width: 32, height: 32, borderRadius: 99, background: accentColor, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "white", fontSize: 13, flexShrink: 0, overflow: "hidden" }}>
            {(session.user as any)?.avatar ? <img src={(session.user as any).avatar} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" /> : session.user?.name?.[0]?.toUpperCase() || "U"}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text)" }}>{session.user?.name}</div>
            <div style={{ fontSize: 11, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{session.user?.email}</div>
          </div>
          <button onClick={e => { e.preventDefault(); signOut({ callbackUrl: "/login" }); }} title="Sign out" style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 13, padding: 2, flexShrink: 0 }}>↩</button>
        </Link>
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "var(--bg)" }}>
      <div style={{ flexShrink: 0 }}><SidebarContent /></div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
        {/* Top bar */}
        <div style={{ height: 52, borderBottom: "1px solid var(--border-color)", display: "flex", alignItems: "center", padding: "0 20px", background: "var(--surface)", flexShrink: 0, gap: 10 }}>
          <div style={{ flex: 1 }} />
          <Link href="/dashboard/notifications" style={{ position: "relative", padding: 6, color: "var(--muted)", textDecoration: "none", fontSize: 16, borderRadius: 8, transition: "background 0.15s" }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--surface2)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
            🔔
            {notifCount > 0 && <span style={{ position: "absolute", top: 4, right: 4, width: 7, height: 7, borderRadius: 99, background: "#EF4444", display: "block" }} />}
          </Link>
          <Link href="/dashboard/settings" style={{ padding: 6, color: "var(--muted)", textDecoration: "none", fontSize: 16, borderRadius: 8, transition: "background 0.15s" }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--surface2)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>⚙️</Link>
          <Link href="/dashboard/profile" style={{ width: 30, height: 30, borderRadius: 99, background: accentColor, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "white", fontSize: 12, textDecoration: "none", overflow: "hidden" }}>
            {(session.user as any)?.avatar ? <img src={(session.user as any).avatar} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" /> : session.user?.name?.[0]?.toUpperCase() || "U"}
          </Link>
        </div>
        {/* Scrollable page content */}
        <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: 24 }}>
          {children}
        </div>
      </div>
    </div>
  );
}
