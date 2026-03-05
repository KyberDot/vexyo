"use client";
import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useSettings } from "@/lib/SettingsContext";

const COLORS = ["#6366F1", "#8B5CF6", "#EC4899", "#EF4444", "#F59E0B", "#10B981", "#3B82F6", "#06B6D4", "#84CC16"];

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { platform, savePlatform } = useSettings();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"users" | "platform">("users");
  const [pForm, setPForm] = useState({ ...platform });
  const [savingP, setSavingP] = useState(false);
  const [savedP, setSavedP] = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) { router.push("/login"); return; }
    // Check admin
    fetch("/api/admin/users").then(r => {
      if (r.status === 403) { router.push("/dashboard"); return; }
      return r.json();
    }).then(data => {
      if (Array.isArray(data)) setUsers(data);
      setLoading(false);
    });
  }, [session, status]);

  useEffect(() => { setPForm({ ...platform }); }, [platform]);

  const updateUser = async (id: number, patch: any) => {
    await fetch("/api/admin/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...patch }) });
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...patch } : u));
  };

  const deleteUser = async (id: number, name: string) => {
    if (!confirm(`Delete user ${name}? This will delete all their subscriptions too.`)) return;
    await fetch("/api/admin/users", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setUsers(prev => prev.filter(u => u.id !== id));
  };

  const savePlatformSettings = async () => {
    setSavingP(true);
    await savePlatform(pForm as any);
    setSavingP(false);
    setSavedP(true);
    setTimeout(() => setSavedP(false), 2000);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setPForm(p => ({ ...p, logo: ev.target?.result as string }));
    reader.readAsDataURL(file);
  };

  if (loading) return <div style={{ color: "var(--muted)", padding: 24 }}>Loading...</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }} className="fade-in">
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: "#EF444412", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🛡️</div>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Admin Portal</h1>
          <p style={{ color: "var(--muted)", fontSize: 13 }}>Manage users and platform settings</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, background: "var(--surface)", border: "1px solid var(--border-color)", borderRadius: 10, padding: 4, alignSelf: "flex-start" }}>
        {[["users", "👥 Users"], ["platform", "⚙️ Platform"]].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key as any)} style={{ padding: "7px 16px", borderRadius: 7, border: "none", background: tab === key ? "var(--accent)" : "transparent", color: tab === key ? "white" : "var(--muted)", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>{label}</button>
        ))}
      </div>

      {tab === "users" && (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 600 }}>All Users ({users.length})</span>
          </div>
          {users.map((u, i) => (
            <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", borderBottom: i < users.length - 1 ? "1px solid var(--border-color)" : "none" }}>
              <div style={{ width: 36, height: 36, borderRadius: 99, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "white", fontSize: 13, flexShrink: 0, overflow: "hidden" }}>
                {u.avatar ? <img src={u.avatar} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt={u.name} /> : u.name?.[0]?.toUpperCase() || "?"}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{u.name || "—"}</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>{u.email} · {u.sub_count} subs · joined {new Date(u.created_at).toLocaleDateString()}</div>
              </div>
              <select value={u.role} onChange={e => updateUser(u.id, { role: e.target.value })} className="select" style={{ fontSize: 12, padding: "4px 8px", width: "auto" }}>
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
              <div style={{ width: 34, height: 20, borderRadius: 10, background: u.active ? "#10B981" : "var(--border-color)", cursor: "pointer", position: "relative", flexShrink: 0 }} onClick={() => updateUser(u.id, { active: !u.active })}>
                <div style={{ position: "absolute", top: 2, left: u.active ? 16 : 2, width: 16, height: 16, borderRadius: 8, background: "white", transition: "left 0.2s" }} />
              </div>
              <button onClick={() => deleteUser(u.id, u.name)} style={{ background: "none", border: "none", color: "#EF4444", cursor: "pointer", fontSize: 14, padding: 4 }}>🗑️</button>
            </div>
          ))}
        </div>
      )}

      {tab === "platform" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 560 }}>
          <div className="card">
            <div style={{ fontWeight: 600, marginBottom: 16, fontSize: 15 }}>Branding</div>
            <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
              <div style={{ width: 72, height: 72, borderRadius: 12, background: "var(--surface2)", border: "1px solid var(--border-color)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, overflow: "hidden", flexShrink: 0 }}>
                {pForm.logo ? <img src={pForm.logo} style={{ width: "100%", height: "100%", objectFit: "contain" }} alt="logo" /> : "💰"}
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                <input ref={logoRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleLogoUpload} />
                <button className="btn-primary" style={{ fontSize: 13, alignSelf: "flex-start" }} onClick={() => logoRef.current?.click()}>Upload Logo</button>
                {pForm.logo && <button className="btn-ghost" style={{ fontSize: 13, alignSelf: "flex-start" }} onClick={() => setPForm(p => ({ ...p, logo: undefined }))}>Remove Logo</button>}
              </div>
            </div>
            <div style={{ marginTop: 16 }}>
              <label style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4, display: "block" }}>App Name</label>
              <input className="input" value={pForm.app_name} onChange={e => setPForm(p => ({ ...p, app_name: e.target.value }))} placeholder="Nexyo" />
            </div>
          </div>

          <div className="card">
            <div style={{ fontWeight: 600, marginBottom: 16, fontSize: 15 }}>Primary Color</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
              {COLORS.map(c => (
                <div key={c} onClick={() => setPForm(p => ({ ...p, primary_color: c }))} style={{ width: 32, height: 32, borderRadius: 8, background: c, cursor: "pointer", border: pForm.primary_color === c ? "3px solid var(--text)" : "3px solid transparent", transition: "all 0.15s" }} />
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <input type="color" value={pForm.primary_color} onChange={e => setPForm(p => ({ ...p, primary_color: e.target.value }))} style={{ width: 36, height: 36, borderRadius: 6, border: "1px solid var(--border-color)", cursor: "pointer", background: "none" }} />
              <input className="input" value={pForm.primary_color} onChange={e => setPForm(p => ({ ...p, primary_color: e.target.value }))} style={{ fontFamily: "monospace", width: 120 }} />
              <div style={{ width: 36, height: 36, borderRadius: 8, background: pForm.primary_color }} />
            </div>
          </div>

          <div className="card">
            <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 15 }}>Access Control</div>
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 14 }}>
              <div style={{ width: 36, height: 20, borderRadius: 10, background: pForm.allow_registration ? "#10B981" : "var(--border-color)", cursor: "pointer", position: "relative", flexShrink: 0 }} onClick={() => setPForm(p => ({ ...p, allow_registration: !p.allow_registration }))}>
                <div style={{ position: "absolute", top: 2, left: pForm.allow_registration ? 18 : 2, width: 16, height: 16, borderRadius: 8, background: "white", transition: "left 0.2s" }} />
              </div>
              Allow new user registration
            </label>
          </div>

          <button className="btn-primary" onClick={savePlatformSettings} disabled={savingP} style={{ alignSelf: "flex-start" }}>
            {savingP ? "Saving..." : savedP ? "✓ Saved" : "Save Platform Settings"}
          </button>
        </div>
      )}
    </div>
  );
}
