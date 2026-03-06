"use client";
import { useState, useEffect, useRef, createContext, useContext, useMemo } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useSettings } from "@/lib/SettingsContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export const SearchContext = createContext<{ search: string }>({ search: "" });
export const useSearch = () => useContext(SearchContext);

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const { platform, userAvatar, userName, userRole, reloadProfile, t, settings, saveSettings } = useSettings();

  const NAV = useMemo(() => [
    { section: "Main", items: [
      { label: t("dashboard"), href: "/dashboard", icon: "🏠" },
      { label: t("aiAgent"), href: "/dashboard/ai", icon: "🤖" },
    ]},
    { section: "Subscriptions", items: [
      { label: t("subscriptions"), href: "/dashboard/subscriptions", icon: "📋" },
      { label: t("bills"), href: "/dashboard/bills", icon: "🧾" },
      { label: t("debts"), href: "/dashboard/debts", icon: "💸" },
      { label: t("analytics"), href: "/dashboard/analytics", icon: "📊" },
      { label: t("categories"), href: "/dashboard/categories", icon: "🏷️" },
      { label: t("family"), href: "/dashboard/family", icon: "👨‍👩‍👧" },
      { label: t("wallet"), href: "/dashboard/payments", icon: "👛" },
      { label: t("notifications"), href: "/dashboard/notifications", icon: "🔔" },
      { label: t("sharedLinks"), href: "/dashboard/shares", icon: "🔗" },
    ]},
  ], [t]);
  const [notifCount, setNotifCount] = useState(0);
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (status === "unauthenticated") router.push("/login"); }, [status]);
  useEffect(() => { reloadProfile(); setSearch(""); }, [pathname]);

  useEffect(() => {
    fetch("/api/notifications").then(r => r.json()).then(data => {
      if (Array.isArray(data)) setNotifCount(data.filter((n: any) => !n.read).length);
    }).catch(() => {});
  }, [pathname]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setShowUserMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (status === "loading") return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
      <div style={{ color: "var(--muted)", fontSize: 14 }}>Loading...</div>
    </div>
  );
  if (!session) return null;

  const accentColor = platform?.primary_color || "#6366F1";
  const appName = platform?.app_name || "Vexyo";
  const displayName = userName || session.user?.name || "User";
  const initials = displayName[0]?.toUpperCase() || "U";

  const Avatar = ({ size = 32 }: { size?: number }) => (
    <div style={{ width: size, height: size, borderRadius: 99, background: accentColor, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "white", fontSize: size * 0.38, flexShrink: 0, overflow: "hidden", cursor: "pointer" }}>
      {userAvatar
        ? <img src={userAvatar} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" onError={e => { (e.currentTarget as HTMLElement).style.display = "none"; }} />
        : initials}
    </div>
  );

  return (
    <SearchContext.Provider value={{ search }}>
      <div style={{ display: "flex", height: "100vh", background: "var(--bg)", position: "relative" }}>
        
        {/* Sidebar */}
        <div style={{ width: collapsed ? 52 : 218, background: "var(--surface)", borderRight: "1px solid var(--border-color)", height: "100%", display: "flex", flexDirection: "column", flexShrink: 0, overflowY: "auto", overflowX: "hidden", transition: "width 0.2s ease" }}>
          
          {/* Logo + collapse */}
          <div style={{ display: "flex", alignItems: "center", padding: collapsed ? "14px 12px" : "14px 12px 14px 14px", marginBottom: 6, justifyContent: collapsed ? "center" : "space-between" }}>
            {!collapsed && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: accentColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, overflow: "hidden", flexShrink: 0 }}>
                  {platform?.logo ? <img src={platform.logo} style={{ width: "100%", height: "100%", objectFit: "contain" }} alt="logo" /> : "💰"}
                </div>
                <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: "-0.4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{appName}</span>
              </div>
            )}
            <button onClick={() => setCollapsed(c => !c)} style={{ background: "none", border: "1px solid var(--border-color)", borderRadius: 6, width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--muted)", fontSize: 12, flexShrink: 0 }} title={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
              {collapsed ? "›" : "‹"}
            </button>
          </div>

          {/* Nav */}
          <div style={{ flex: 1, padding: "0 6px" }}>
            {NAV.map(section => (
              <div key={section.section}>
                {!collapsed && <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", letterSpacing: "0.1em", textTransform: "uppercase", padding: "8px 8px 3px" }}>{section.section}</div>}
                {collapsed && <div style={{ height: 10 }} />}
                {section.items.map(item => {
                  const active = pathname === item.href;
                  return (
                    <Link key={item.href} href={item.href} title={collapsed ? item.label : undefined} style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: collapsed ? 0 : 8, padding: collapsed ? "9px 0" : "8px 10px", borderRadius: 7, marginBottom: 1, background: active ? `rgba(var(--accent-rgb), 0.12)` : "transparent", color: active ? "var(--accent)" : "var(--muted)", fontWeight: active ? 600 : 400, fontSize: 13, transition: "background 0.12s", justifyContent: collapsed ? "center" : "flex-start" }}
                      onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = "var(--surface2)"; (e.currentTarget as HTMLElement).style.color = "var(--text)"; } }}
                      onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--muted)"; } }}>
                      <span style={{ fontSize: 15, flexShrink: 0 }}>{item.icon}</span>
                      {!collapsed && <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.label}</span>}
                      {!collapsed && item.label === "Notifications" && notifCount > 0 && (
                        <span style={{ background: "#EF4444", color: "white", borderRadius: 99, fontSize: 10, fontWeight: 700, padding: "1px 6px", flexShrink: 0 }}>{notifCount}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            ))}
            {userRole === "admin" && (
              <div style={{ marginTop: 8 }}>
                {!collapsed && <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", letterSpacing: "0.1em", textTransform: "uppercase", padding: "8px 8px 3px" }}>Admin</div>}
                {collapsed && <div style={{ height: 10 }} />}
                <Link href="/admin" title={collapsed ? "Admin Portal" : undefined} style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: collapsed ? 0 : 8, padding: collapsed ? "9px 0" : "8px 10px", borderRadius: 7, marginBottom: 1, background: pathname === "/admin" ? `rgba(var(--accent-rgb), 0.12)` : "transparent", color: pathname === "/admin" ? "var(--accent)" : "var(--muted)", fontSize: 13, justifyContent: collapsed ? "center" : "flex-start" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--surface2)"; (e.currentTarget as HTMLElement).style.color = "var(--text)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = pathname === "/admin" ? `rgba(var(--accent-rgb), 0.12)` : "transparent"; (e.currentTarget as HTMLElement).style.color = pathname === "/admin" ? "var(--accent)" : "var(--muted)"; }}>
                  <span style={{ fontSize: 15 }}>🛡️</span>
                  {!collapsed && <span>{t("adminPortal")}</span>}
                </Link>
              </div>
            )}
          </div>

          {/* User footer */}
          <div style={{ padding: "10px 6px 12px", borderTop: "1px solid var(--border-color)", marginTop: 8 }}>
            {!collapsed ? (
              <div ref={userMenuRef} style={{ position: "relative" }}>
                <div onClick={() => setShowUserMenu(p => !p)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, cursor: "pointer" }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--surface2)"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                  <Avatar size={32} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayName}</div>
                    <div style={{ fontSize: 11, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{session.user?.email}</div>
                  </div>
                  <span style={{ color: "var(--muted)", fontSize: 10 }}>{showUserMenu ? "▴" : "▾"}</span>
                </div>
                {showUserMenu && (
                  <div style={{ position: "absolute", bottom: "calc(100% + 4px)", left: 0, right: 0, background: "var(--surface)", border: "1px solid var(--border-color)", borderRadius: 10, overflow: "hidden", zIndex: 100, boxShadow: "0 8px 24px rgba(0,0,0,0.3)" }}>
                    {[{ href: "/dashboard/profile", icon: "👤", label: "Profile" }, { href: "/dashboard/settings", icon: "⚙️", label: "Settings" }].map(item => (
                      <Link key={item.href} href={item.href} onClick={() => setShowUserMenu(false)} style={{ display: "flex", alignItems: "center", gap: 9, padding: "10px 14px", textDecoration: "none", color: "var(--text)", fontSize: 13 }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--surface2)"}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                        <span>{item.icon}</span>{item.label}
                      </Link>
                    ))}
                    <div style={{ borderTop: "1px solid var(--border-color)" }} />
                    <button onClick={() => signOut({ callbackUrl: "/login" })} style={{ display: "flex", alignItems: "center", gap: 9, padding: "10px 14px", width: "100%", background: "none", border: "none", color: "#EF4444", fontSize: 13, cursor: "pointer" }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.08)"}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                      ↩ Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: "flex", justifyContent: "center" }}>
                <Link href="/dashboard/profile"><Avatar size={28} /></Link>
              </div>
            )}
          </div>
        </div>

        {/* Main */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          {/* Top bar - no logout button, just search + notifications + settings + avatar */}
          <div style={{ height: 54, borderBottom: "1px solid var(--border-color)", display: "flex", alignItems: "center", paddingLeft: 16, paddingRight: 16, background: "var(--surface)", flexShrink: 0, gap: 10 }}>
            <div style={{ flex: 1, maxWidth: 480, position: "relative" }}>
              <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", fontSize: 13, pointerEvents: "none" }}>🔍</span>
              <input className="input" placeholder="Search subscriptions, bills, debts..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 34, height: 36, fontSize: 13 }} />
              {search && <button onClick={() => setSearch("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 14, padding: 0 }}>✕</button>}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto" }}>
              <Link href="/dashboard/notifications" title="Notifications" style={{ position: "relative", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, color: "var(--muted)", textDecoration: "none", fontSize: 17 }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--surface2)"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                🔔
                {notifCount > 0 && <span style={{ position: "absolute", top: 6, right: 6, width: 8, height: 8, borderRadius: 99, background: "#EF4444", border: "1.5px solid var(--surface)" }} />}
              </Link>
              <LanguageSwitcher />
              {/* Dark/Light mode toggle */}
              <button
                onClick={() => { const newTheme = settings.theme === "dark" ? "light" : "dark"; saveSettings({ ...settings, theme: newTheme }); }}
                title={settings.theme === "dark" ? "Switch to Light mode" : "Switch to Dark mode"}
                style={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, background: "none", border: "none", cursor: "pointer", fontSize: 17, color: "var(--muted)" }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--surface2)"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
              >{settings.theme === "dark" ? "☀️" : "🌙"}</button>
              <Link href="/dashboard/settings" title="Settings" style={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, color: "var(--muted)", textDecoration: "none", fontSize: 17 }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--surface2)"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>⚙️</Link>
              <Link href="/dashboard/profile" title={displayName} style={{ textDecoration: "none", marginLeft: 2 }}>
                <Avatar size={32} />
              </Link>
            </div>
          </div>

          {/* Page content */}
          <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: 24, isolation: "auto" }}>
            {children}
          </div>
        </div>
      </div>
    </SearchContext.Provider>
  );
}
