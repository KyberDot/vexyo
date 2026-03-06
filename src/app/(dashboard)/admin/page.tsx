"use client";
import ModalPortal from "@/components/ModalPortal";
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/Toast";
import { useSettings } from "@/lib/SettingsContext";
import { useSession } from "next-auth/react"; // <-- Added this import

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div onClick={() => onChange(!value)} style={{ width: 38, height: 22, borderRadius: 11, background: value ? "var(--accent)" : "var(--surface2)", border: "1px solid var(--border-color)", cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
      <div style={{ position: "absolute", top: 2, left: value ? 17 : 2, width: 16, height: 16, borderRadius: 8, background: "white", transition: "left 0.18s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
    </div>
  );
}

function Avatar({ user }: { user: any }) {
  if (user.avatar) return <img src={user.avatar} style={{ width: 36, height: 36, borderRadius: 99, objectFit: "cover", flexShrink: 0 }} alt="" />;
  const colors = ["#6366F1","#8B5CF6","#EC4899","#10B981","#F59E0B","#3B82F6","#EF4444","#06B6D4"];
  const color = colors[(user.id || 0) % colors.length];
  return <div style={{ width: 36, height: 36, borderRadius: 99, background: color, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: 14, flexShrink: 0 }}>{(user.name || user.email || "?")[0].toUpperCase()}</div>;
}

function CountdownBadge({ expiresAt }: { expiresAt: string | null }) {
  if (!expiresAt) return null;
  const expires = new Date(expiresAt);
  const now = new Date();
  const diffMs = expires.getTime() - now.getTime();
  if (diffMs <= 0) return <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 4, background: "rgba(239,68,68,0.1)", color: "#EF4444", fontWeight: 600 }}>Expired</span>;
  const diffH = Math.floor(diffMs / (1000 * 60 * 60));
  const diffD = Math.floor(diffH / 24);
  const label = diffD > 0 ? `${diffD}d left` : `${diffH}h left`;
  const pct = Math.max(0, Math.min(100, (diffMs / (3 * 24 * 60 * 60 * 1000)) * 100));
  const col = pct > 50 ? "#10B981" : pct > 20 ? "#F59E0B" : "#EF4444";
  return <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 4, background: `rgba(${col === "#10B981" ? "16,185,129" : col === "#F59E0B" ? "245,158,11" : "239,68,68"},0.1)`, color: col, fontWeight: 600 }}>{label}</span>;
}

const TEMPLATE_NAMES: Record<string, string> = { magic_link: "Magic Link Email", invite: "Invitation Email", password_reset: "Password Reset", renewal_reminder: "Renewal Reminder" };
const TEMPLATE_VARS: Record<string, string[]> = { magic_link: ["{{appName}}", "{{link}}", "{{email}}"], invite: ["{{appName}}", "{{link}}"], password_reset: ["{{appName}}", "{{link}}"], renewal_reminder: ["{{name}}", "{{days}}", "{{date}}", "{{amount}}", "{{appName}}"] };

export default function AdminPage() {
  const { userRole, platform, savePlatform, t } = useSettings();
  const { success, error: toastError } = useToast();
  const { data: session } = useSession(); // <-- Added this to get your email
  const [users, setUsers] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [emailTemplates, setEmailTemplates] = useState<any[]>([]);
  const [tab, setTab] = useState<"users"|"plans"|"platform"|"mail"|"invites"|"templates">("users");
  const [platformForm, setPlatformForm] = useState<any>({});
  const [mailForm, setMailForm] = useState<any>({});
  const [mailTest, setMailTest] = useState<{ status: "idle"|"loading"|"ok"|"error"; msg: string }>({ status: "idle", msg: "" });
  const [saving, setSaving] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [editTemplate, setEditTemplate] = useState<any|null>(null);
  const [editPlan, setEditPlan] = useState<any|null>(null);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState<any|null>(null);
  const [showUserModal, setShowUserModal] = useState<any|null>(null);

  const loadUsers = useCallback(() => fetch("/api/admin/users").then(r => r.json()).then(d => { if (Array.isArray(d)) setUsers(d); }), []);
  const loadInvites = useCallback(() => fetch("/api/admin/invite").then(r => r.json()).then(d => { if (Array.isArray(d)) setInvites(d); }), []);
  const loadPlans = useCallback(() => fetch("/api/admin/plans").then(r => r.json()).then(d => { if (Array.isArray(d)) setPlans(d); }), []);

  useEffect(() => {
    if (userRole !== "admin") return;
    loadUsers();
    loadInvites();
    loadPlans();
    fetch("/api/admin/platform").then(r => r.json()).then(d => {
      if (d && !d.error) {
        setPlatformForm({ app_name: d.app_name || "Vexyo", primary_color: d.primary_color || "#6366F1", allow_registration: !!d.allow_registration, magic_link_enabled: !!d.magic_link_enabled, logo: d.logo || "", favicon: d.favicon || "", app_url: d.app_url || process.env.NEXT_PUBLIC_URL || "" });
        setMailForm({ mail_host: d.mail_host || "", mail_port: d.mail_port || 587, mail_user: d.mail_user || "", mail_pass: d.mail_pass || "", mail_from: d.mail_from || "", mail_secure: !!d.mail_secure });
      }
    });
    fetch("/api/admin/email-templates").then(r => r.json()).then(d => { if (Array.isArray(d)) setEmailTemplates(d); });
  }, [userRole, loadUsers, loadInvites, loadPlans]);

  if (userRole !== "admin") return <div style={{ color: "var(--muted)", padding: 24 }}>Access denied.</div>;

  const savePlatformTab = async () => { setSaving(true); await savePlatform(platformForm); success("Platform settings saved"); setSaving(false); };
  const saveMailSettings = async () => { setSaving(true); const r = await fetch("/api/platform", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(mailForm) }); if (r.ok) success("Mail settings saved"); else toastError("Failed to save mail settings"); setSaving(false); };
  
  // <-- UPDATED THIS FUNCTION -->
  const testMail = async () => { 
    const targetEmail = session?.user?.email;
    
    if (!targetEmail) {
      toastError("Could not find your email address");
      return;
    }

    await saveMailSettings(); 
    setMailTest({ status: "loading", msg: "" }); 
    
    const res = await fetch("/api/admin/test-mail", { 
      method: "POST", 
      headers: { "Content-Type": "application/json" }, 
      body: JSON.stringify({ email: targetEmail }) 
    }); 
    
    const d = await res.json(); 
    setMailTest({ status: res.ok ? "ok" : "error", msg: res.ok ? d.message : d.error }); 
  };

  const sendInvite = async () => {
    if (!inviteEmail) return;
    setInviting(true);
    try {
      const r = await fetch("/api/admin/invite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: inviteEmail }) });
      const d = await r.json();
      if (!r.ok) toastError(d.error || "Failed to send invite");
      else { success(d.emailed ? `Invite sent to ${inviteEmail}` : `Invite link created for ${inviteEmail}`); setInviteEmail(""); loadInvites(); }
    } catch { toastError("Network error. Please try again."); }
    finally { setInviting(false); }
  };

  const deleteInvite = async (id: number) => { await fetch("/api/admin/invite", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }); loadInvites(); success("Invite cancelled"); };
  const clearLog = async () => { await fetch("/api/admin/invite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "clear-log" }) }); loadInvites(); success("Invite log cleared"); };

  const savePlan = async (form: any) => {
    const r = await fetch("/api/admin/plans", { method: form.id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (r.ok) { success(form.id ? "Plan updated" : "Plan created"); loadPlans(); setShowPlanModal(false); setEditPlan(null); } else toastError("Failed to save plan");
  };
  const deletePlan = async (id: number) => {
    if (!confirm("Delete this plan? Users assigned to it will lose restrictions.")) return;
    await fetch("/api/admin/plans", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    loadPlans(); success("Plan deleted");
  };

  const assignPlan = async (userId: number, planId: number | null, expiresAt: string) => {
    await fetch("/api/admin/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: userId, plan_id: planId || null, plan_expires_at: expiresAt || null }) });
    success("Plan assigned"); loadUsers(); setShowAssignModal(null);
  };

  const updateUser = async (id: number, data: any) => {
    const r = await fetch("/api/admin/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...data }) });
    if (r.ok) { loadUsers(); return true; } return false;
  };

  const deleteUser = async (id: number) => {
    if (!confirm("Permanently delete this user and all their data?")) return;
    const r = await fetch("/api/admin/users", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    if (r.ok) { success("User deleted"); loadUsers(); setShowUserModal(null); } else toastError("Failed to delete user");
  };

  const saveTemplate = async () => {
    if (!editTemplate) return;
    const r = await fetch("/api/admin/email-templates", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editTemplate.id, subject: editTemplate.subject, body_html: editTemplate.body_html }) });
    if (r.ok) { success("Template saved"); setEmailTemplates(t => t.map(x => x.id === editTemplate.id ? { ...x, ...editTemplate } : x)); setEditTemplate(null); }
    else toastError("Failed to save template");
  };

  const TABS = [
    { id: "users", label: "👥 Users" }, { id: "plans", label: "📦 Plans" }, { id: "platform", label: "⚙️ Platform" },
    { id: "mail", label: "📧 Mail" }, { id: "invites", label: "✉️ Invites" }, { id: "templates", label: "🎨 Templates" },
  ];
  const inputStyle: React.CSSProperties = { background: "var(--surface2)", border: "1px solid var(--border-color)", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "var(--text)", outline: "none", width: "100%", boxSizing: "border-box" };
  const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 5, display: "block" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 800 }} className="fade-in">
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Admin Portal</h1>
        <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 2 }}>Manage users, plans, platform settings, and more</p>
      </div>

      <div className="card" style={{ padding: 4, display: "flex", gap: 2 }}>
        {TABS.map(({ id, label }) => (
          <button key={id} onClick={() => setTab(id as any)} style={{ flex: 1, padding: "7px 4px", borderRadius: 7, border: "none", background: tab === id ? "var(--accent)" : "transparent", color: tab === id ? "white" : "var(--muted)", fontWeight: tab === id ? 600 : 400, fontSize: 12, cursor: "pointer", transition: "all 0.15s" }}>{label}</button>
        ))}
      </div>

      {/* ── USERS ── */}
      {tab === "users" && (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-color)", fontWeight: 600, fontSize: 14 }}>Users ({users.length})</div>
          {users.map((u, i) => (
            <div key={u.id} onClick={() => setShowUserModal(u)}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: i < users.length - 1 ? "1px solid var(--border-color)" : "none", opacity: u.active ? 1 : 0.45, cursor: "pointer", transition: "background 0.12s" }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--surface2)"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
            >
              <Avatar user={u} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.name || u.email}</div>
                <div style={{ fontSize: 11, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {u.plan_name && u.role !== "admin" && <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "rgba(16,185,129,0.1)", color: "#10B981", fontWeight: 600 }}>{u.plan_name}</span>}
                <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: u.role === "admin" ? "rgba(var(--accent-rgb),0.15)" : "var(--surface2)", color: u.role === "admin" ? "var(--accent)" : "var(--muted)", fontWeight: 600 }}>{u.role}</span>
                {!u.active && <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "rgba(239,68,68,0.1)", color: "#EF4444", fontWeight: 600 }}>Disabled</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── PLANS ── */}
      {tab === "plans" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p style={{ color: "var(--muted)", fontSize: 13 }}>Create plans to restrict user access. Assign from the Users tab.</p>
            <button className="btn-primary" style={{ fontSize: 13 }} onClick={() => { setEditPlan({ name: "", description: "", max_subscriptions: -1, max_bills: -1, max_family_members: -1, can_use_analytics: true, can_use_ai: true, can_export: true, can_use_attachments: true }); setShowPlanModal(true); }}>+ New Plan</button>
          </div>
          {plans.length === 0 && <div className="card" style={{ textAlign: "center", padding: 32, color: "var(--muted)" }}>No plans yet. Create one to restrict user access.</div>}
          {plans.map(p => (
            <div key={p.id} className="card" style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{p.name}</div>
                {p.description && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{p.description}</div>}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8 }}>
                  {[["Subs", p.max_subscriptions], ["Bills", p.max_bills], ["Family", p.max_family_members]].map(([l, v]) => (
                    <span key={l as string} style={{ fontSize: 11, padding: "2px 7px", borderRadius: 4, background: "var(--surface2)", color: "var(--muted)" }}>{l}: {v === -1 ? "∞" : v}</span>
                  ))}
                  {[["Analytics", p.can_use_analytics], ["AI", p.can_use_ai], ["Export", p.can_export], ["Files", p.can_use_attachments]].map(([l, v]) => (
                    <span key={l as string} style={{ fontSize: 11, padding: "2px 7px", borderRadius: 4, background: v ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)", color: v ? "#10B981" : "#EF4444" }}>{l}: {v ? "✓" : "✕"}</span>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <button onClick={() => { setEditPlan({...p}); setShowPlanModal(true); }} style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid var(--border-color)", background: "none", color: "var(--muted)", fontSize: 12, cursor: "pointer" }}>Edit</button>
                <button onClick={() => deletePlan(p.id)} style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid rgba(239,68,68,0.3)", background: "none", color: "#EF4444", fontSize: 12, cursor: "pointer" }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── PLATFORM ── */}
      {tab === "platform" && (
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 18, padding: "20px 22px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", background: "var(--surface2)", borderRadius: 10 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: platformForm.primary_color || "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
              {platformForm.logo ? <img src={platformForm.logo} style={{ width: "100%", height: "100%", objectFit: "contain" }} alt="" onError={e => (e.currentTarget.style.display="none")} /> : <span style={{ fontSize: 22 }}>💰</span>}
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16 }}>{platformForm.app_name || "Vexyo"}</div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>Live preview</div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div><label style={labelStyle}>APP NAME</label><input style={inputStyle} value={platformForm.app_name || ""} onChange={e => setPlatformForm((p: any) => ({ ...p, app_name: e.target.value }))} /></div>
            <div>
              <label style={labelStyle}>PRIMARY COLOR</label>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 6 }}>
                {["#6366F1","#8B5CF6","#EC4899","#EF4444","#F59E0B","#10B981","#06B6D4","#3B82F6","#F97316","#64748B"].map(col => (
                  <div key={col} onClick={() => setPlatformForm((p: any) => ({ ...p, primary_color: col }))} style={{ width: 22, height: 22, borderRadius: 5, background: col, cursor: "pointer", border: platformForm.primary_color === col ? "2.5px solid white" : "2px solid transparent", transition: "transform 0.1s", transform: platformForm.primary_color === col ? "scale(1.2)" : "scale(1)" }} />
                ))}
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input type="color" value={platformForm.primary_color || "#6366F1"} onChange={e => setPlatformForm((p: any) => ({ ...p, primary_color: e.target.value }))} style={{ width: 34, height: 30, border: "none", borderRadius: 6, cursor: "pointer", padding: 0 }} />
                <input style={{ ...inputStyle, flex: 1 }} value={platformForm.primary_color || ""} onChange={e => setPlatformForm((p: any) => ({ ...p, primary_color: e.target.value }))} />
              </div>
            </div>
          </div>
          <div><label style={labelStyle}>APP URL</label><input style={inputStyle} value={platformForm.app_url || ""} onChange={e => setPlatformForm((p: any) => ({ ...p, app_url: e.target.value }))} placeholder={typeof window !== "undefined" ? window.location.origin : "https://your-domain.com"} /><div style={{ fontSize: 11, color: "var(--muted)", marginTop: 3 }}>Overrides NEXTAUTH_URL for links in emails. Leave blank to use the environment variable.</div></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div><label style={labelStyle}>LOGO</label><div style={{ display: "flex", gap: 6 }}><input style={{ ...inputStyle, flex: 1 }} value={platformForm.logo?.startsWith("data:") ? "(uploaded)" : platformForm.logo || ""} onChange={e => setPlatformForm((p: any) => ({ ...p, logo: e.target.value }))} placeholder="https://..." /><label style={{ padding: "0 10px", height: 34, display: "flex", alignItems: "center", background: "var(--surface2)", border: "1px solid var(--border-color)", borderRadius: 8, cursor: "pointer", fontSize: 12, color: "var(--muted)", whiteSpace: "nowrap" }}>Upload<input type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = ev => setPlatformForm((p: any) => ({ ...p, logo: ev.target?.result as string })); r.readAsDataURL(f); }} /></label></div></div>
            <div><label style={labelStyle}>FAVICON</label><div style={{ display: "flex", gap: 6 }}><input style={{ ...inputStyle, flex: 1 }} value={platformForm.favicon?.startsWith("data:") ? "(uploaded)" : platformForm.favicon || ""} onChange={e => setPlatformForm((p: any) => ({ ...p, favicon: e.target.value }))} placeholder="https://..." /><label style={{ padding: "0 10px", height: 34, display: "flex", alignItems: "center", background: "var(--surface2)", border: "1px solid var(--border-color)", borderRadius: 8, cursor: "pointer", fontSize: 12, color: "var(--muted)", whiteSpace: "nowrap" }}>Upload<input type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = ev => setPlatformForm((p: any) => ({ ...p, favicon: ev.target?.result as string })); r.readAsDataURL(f); }} /></label></div></div>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            {[["Allow Registration", "allow_registration", "Public sign-up"], ["Magic Link Login", "magic_link_enabled", "Requires mail server"]].map(([label, key, sub]) => (
              <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flex: 1, padding: "10px 14px", background: "var(--surface2)", borderRadius: 8 }}>
                <div><div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div><div style={{ fontSize: 11, color: "var(--muted)" }}>{sub}</div></div>
                <Toggle value={!!platformForm[key]} onChange={v => setPlatformForm((p: any) => ({ ...p, [key]: v }))} />
              </div>
            ))}
          </div>
          <button className="btn-primary" onClick={savePlatformTab} disabled={saving} style={{ alignSelf: "flex-start" }}>{saving ? "Saving..." : "Save Platform Settings"}</button>
        </div>
      )}

      {/* ── MAIL ── */}
      {tab === "mail" && (
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 14, padding: "20px 22px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
            <div><label style={labelStyle}>SMTP HOST</label><input style={inputStyle} value={mailForm.mail_host || ""} onChange={e => setMailForm((p: any) => ({ ...p, mail_host: e.target.value }))} placeholder="smtp.gmail.com" /></div>
            <div><label style={labelStyle}>PORT</label><input type="number" style={inputStyle} value={mailForm.mail_port || 587} onChange={e => setMailForm((p: any) => ({ ...p, mail_port: Number(e.target.value) }))} /></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={labelStyle}>USERNAME</label><input style={inputStyle} value={mailForm.mail_user || ""} onChange={e => setMailForm((p: any) => ({ ...p, mail_user: e.target.value }))} /></div>
            <div><label style={labelStyle}>PASSWORD</label><input type="password" style={inputStyle} value={mailForm.mail_pass || ""} onChange={e => setMailForm((p: any) => ({ ...p, mail_pass: e.target.value }))} /></div>
          </div>
          <div><label style={labelStyle}>FROM ADDRESS</label><input style={inputStyle} value={mailForm.mail_from || ""} onChange={e => setMailForm((p: any) => ({ ...p, mail_from: e.target.value }))} placeholder="Vexyo <noreply@example.com>" /></div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "var(--surface2)", borderRadius: 8 }}>
            <div><div style={{ fontSize: 13, fontWeight: 600 }}>SSL/TLS (Port 465)</div><div style={{ fontSize: 11, color: "var(--muted)" }}>Use STARTTLS for port 587</div></div>
            <Toggle value={!!mailForm.mail_secure} onChange={v => setMailForm((p: any) => ({ ...p, mail_secure: v }))} />
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button className="btn-primary" onClick={saveMailSettings} disabled={saving} style={{ minWidth: 100 }}>{saving ? "Saving..." : "💾 Save Settings"}</button>
            <button className="btn-ghost" onClick={testMail} disabled={mailTest.status === "loading"} style={{ minWidth: 130 }}>🧪 {mailTest.status === "loading" ? "Sending..." : "Send Test Email"}</button>
            <span style={{ fontSize: 11, color: "var(--muted)" }}>Test saves first</span>
          </div>
          {mailTest.status !== "idle" && (
            <div style={{ padding: "10px 12px", borderRadius: 8, background: mailTest.status === "ok" ? "rgba(16,185,129,0.08)" : mailTest.status === "error" ? "rgba(239,68,68,0.08)" : "var(--surface2)", border: `1px solid ${mailTest.status === "ok" ? "rgba(16,185,129,0.3)" : mailTest.status === "error" ? "rgba(239,68,68,0.2)" : "transparent"}`, fontSize: 13, color: mailTest.status === "ok" ? "#10B981" : "#EF4444" }}>
              {mailTest.msg}
            </div>
          )}
        </div>
      )}

      {/* ── INVITES ── */}
      {tab === "invites" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="card" style={{ padding: "16px 18px" }}>
            <label style={labelStyle}>INVITE BY EMAIL</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input style={{ ...inputStyle, flex: 1 }} type="email" placeholder="user@example.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && sendInvite()} />
              <button className="btn-primary" onClick={sendInvite} disabled={inviting || !inviteEmail}>{inviting ? "Sending..." : "Send Invite"}</button>
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>Invites expire after 3 days.</div>
          </div>
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border-color)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontWeight: 600, fontSize: 13 }}>Invite Log</span>
              <button onClick={clearLog} style={{ fontSize: 12, padding: "4px 10px", borderRadius: 6, border: "1px solid var(--border-color)", background: "none", color: "var(--muted)", cursor: "pointer" }}>🗑 Clear Used/Expired</button>
            </div>
            {invites.length === 0 ? <div style={{ padding: 24, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>No invites yet.</div>
              : invites.map((inv, i) => {
                const isExpired = inv.used === 2 || (inv.expires_at && new Date(inv.expires_at) < new Date() && !inv.used);
                const isUsed = inv.used === 1;
                return (
                  <div key={inv.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 16px", borderBottom: i < invites.length - 1 ? "1px solid var(--border-color)" : "none", opacity: isUsed || isExpired ? 0.55 : 1 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{inv.email}</div>
                      <div style={{ fontSize: 11, color: "var(--muted)" }}>{inv.invited_by_name ? `by ${inv.invited_by_name} · ` : ""}{inv.created_at?.split("T")[0] || inv.created_at?.split(" ")[0]}</div>
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      {isUsed ? <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 4, background: "var(--surface2)", color: "var(--muted)", fontWeight: 600 }}>Used</span>
                        : isExpired ? <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 4, background: "rgba(239,68,68,0.1)", color: "#EF4444", fontWeight: 600 }}>Expired</span>
                        : <CountdownBadge expiresAt={inv.expires_at} />}
                      {!isUsed && !isExpired && <button onClick={() => deleteInvite(inv.id)} style={{ background: "none", border: "none", color: "#EF4444", cursor: "pointer", fontSize: 12, padding: "3px 7px", borderRadius: 4 }}>Cancel</button>}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ── EMAIL TEMPLATES ── */}
      {tab === "templates" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ color: "var(--muted)", fontSize: 13 }}>Edit templates used for all transactional emails. Changes take effect immediately.</p>
          {editTemplate ? (
            <div className="card" style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{TEMPLATE_NAMES[editTemplate.name] || editTemplate.name}</div>
                <button onClick={() => setEditTemplate(null)} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 18 }}>✕</button>
              </div>
              {TEMPLATE_VARS[editTemplate.name] && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {TEMPLATE_VARS[editTemplate.name].map(v => <code key={v} style={{ fontSize: 11, padding: "2px 6px", background: "var(--surface2)", borderRadius: 4, color: "var(--accent)" }}>{v}</code>)}
                </div>
              )}
              <div><label style={labelStyle}>SUBJECT</label><input style={inputStyle} value={editTemplate.subject} onChange={e => setEditTemplate((t: any) => ({ ...t, subject: e.target.value }))} /></div>
              <div><label style={labelStyle}>HTML BODY</label><textarea value={editTemplate.body_html} onChange={e => setEditTemplate((t: any) => ({ ...t, body_html: e.target.value }))} style={{ ...inputStyle, minHeight: 300, fontFamily: "monospace", fontSize: 12, resize: "vertical", lineHeight: 1.5 }} /></div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn-primary" onClick={saveTemplate}>Save Template</button>
                <button className="btn-ghost" onClick={() => setEditTemplate(null)}>Cancel</button>
              </div>
            </div>
          ) : emailTemplates.map(t => (
            <div key={t.id} className="card" style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{TEMPLATE_NAMES[t.name] || t.name}</div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Subject: {t.subject}</div>
              </div>
              <button onClick={() => setEditTemplate({ ...t })} style={{ padding: "6px 12px", borderRadius: 7, border: "1px solid var(--border-color)", background: "none", color: "var(--muted)", fontSize: 12, cursor: "pointer" }}>Edit</button>
            </div>
          ))}
        </div>
      )}

      {/* ── USER DETAIL MODAL ── */}
      {showUserModal && (
        <ModalPortal>
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(5px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => setShowUserModal(null)}>
            <div onClick={e => e.stopPropagation()} style={{ background: "var(--surface)", borderRadius: 16, width: "100%", maxWidth: 440, border: "1px solid var(--border-color)", boxShadow: "0 24px 60px rgba(0,0,0,0.5)", overflow: "hidden" }}>
              {/* Header */}
              <div style={{ padding: "20px 22px", borderBottom: "1px solid var(--border-color)", display: "flex", alignItems: "center", gap: 14 }}>
                <Avatar user={showUserModal} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{showUserModal.name || showUserModal.email}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>{showUserModal.email}</div>
                </div>
                <button onClick={() => setShowUserModal(null)} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 20, padding: 4 }}>✕</button>
              </div>
              {/* Actions */}
              <div style={{ padding: "16px 22px", display: "flex", flexDirection: "column", gap: 10 }}>
                {/* Role */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "var(--surface2)", borderRadius: 8 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>Role</div>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>Current: {showUserModal.role}</div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={async () => { const ok = await updateUser(showUserModal.id, { role: showUserModal.role === "admin" ? "user" : "admin" }); if (ok) { success(`Role changed to ${showUserModal.role === "admin" ? "user" : "admin"}`); setShowUserModal((u: any) => ({ ...u, role: u.role === "admin" ? "user" : "admin" })); } }} style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid var(--border-color)", background: "none", color: "var(--muted)", fontSize: 12, cursor: "pointer" }}>
                      {showUserModal.role === "admin" ? "Demote to User" : "Promote to Admin"}
                    </button>
                  </div>
                </div>
                {/* Account status */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "var(--surface2)", borderRadius: 8 }}>
                  <div><div style={{ fontSize: 13, fontWeight: 600 }}>Account Active</div><div style={{ fontSize: 11, color: "var(--muted)" }}>Disable to block login</div></div>
                  <Toggle value={!!showUserModal.active} onChange={async v => { const ok = await updateUser(showUserModal.id, { active: v }); if (ok) { success(v ? "User activated" : "User deactivated"); setShowUserModal((u: any) => ({ ...u, active: v })); } }} />
                </div>
                {/* Plan */}
                {showUserModal.role !== "admin" && (
                  <button onClick={() => { setShowAssignModal(showUserModal); setShowUserModal(null); }} style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border-color)", background: "var(--surface2)", color: "var(--text)", fontSize: 13, cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div><div style={{ fontWeight: 600 }}>Subscription Plan</div><div style={{ fontSize: 11, color: "var(--muted)" }}>{showUserModal.plan_name || "No plan assigned"}</div></div>
                    <span style={{ color: "var(--muted)" }}>→</span>
                  </button>
                )}
                {/* Delete */}
                <button onClick={() => deleteUser(showUserModal.id)} style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.05)", color: "#EF4444", fontSize: 13, cursor: "pointer", fontWeight: 600 }}>
                  🗑 Delete User & All Data
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* ── PLAN MODAL ── */}
      {showPlanModal && editPlan && (
        <ModalPortal>
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(5px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => { setShowPlanModal(false); setEditPlan(null); }}>
            <div onClick={e => e.stopPropagation()} style={{ background: "var(--surface)", borderRadius: 16, width: "100%", maxWidth: 520, maxHeight: "90vh", overflow: "auto", border: "1px solid var(--border-color)", boxShadow: "0 24px 60px rgba(0,0,0,0.5)", padding: "24px" }}>
              <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 18 }}>{editPlan.id ? "Edit Plan" : "New Plan"}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div><label style={labelStyle}>PLAN NAME *</label><input style={inputStyle} value={editPlan.name} onChange={e => setEditPlan((p: any) => ({ ...p, name: e.target.value }))} placeholder="e.g. Basic, Pro" /></div>
                <div><label style={labelStyle}>DESCRIPTION</label><input style={inputStyle} value={editPlan.description || ""} onChange={e => setEditPlan((p: any) => ({ ...p, description: e.target.value }))} /></div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                  {[["Max Subscriptions", "max_subscriptions"], ["Max Bills", "max_bills"], ["Max Family", "max_family_members"]].map(([l, k]) => (
                    <div key={k}><label style={labelStyle}>{l.toUpperCase()}</label><input type="number" style={inputStyle} value={editPlan[k]} onChange={e => setEditPlan((p: any) => ({ ...p, [k]: Number(e.target.value) }))} /><div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>-1 = unlimited</div></div>
                  ))}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {[["Analytics", "can_use_analytics"], ["AI Agent", "can_use_ai"], ["Export", "can_export"], ["Attachments", "can_use_attachments"]].map(([l, k]) => (
                    <div key={k} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "var(--surface2)", borderRadius: 8 }}>
                      <span style={{ fontSize: 13 }}>{l}</span>
                      <Toggle value={!!editPlan[k]} onChange={v => setEditPlan((p: any) => ({ ...p, [k]: v }))} />
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button className="btn-ghost" onClick={() => { setShowPlanModal(false); setEditPlan(null); }}>Cancel</button>
                  <button className="btn-primary" onClick={() => savePlan(editPlan)} disabled={!editPlan.name}>Save Plan</button>
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* ── ASSIGN PLAN MODAL ── */}
      {showAssignModal && (
        <ModalPortal>
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(5px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => setShowAssignModal(null)}>
            <div onClick={e => e.stopPropagation()} style={{ background: "var(--surface)", borderRadius: 16, width: "100%", maxWidth: 400, border: "1px solid var(--border-color)", boxShadow: "0 24px 60px rgba(0,0,0,0.5)", padding: "24px" }}>
              <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 4 }}>Assign Plan</div>
              <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 18 }}>{showAssignModal.name || showAssignModal.email}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {showAssignModal.plan_name && (
                  <div style={{ padding: "8px 12px", background: "rgba(16,185,129,0.08)", borderRadius: 8, border: "1px solid rgba(16,185,129,0.2)", fontSize: 12, color: "#10B981" }}>
                    Current: <strong>{showAssignModal.plan_name}</strong>
                    {showAssignModal.plan_expires_at && ` · expires ${new Date(showAssignModal.plan_expires_at).toLocaleDateString()}`}
                  </div>
                )}
                <div><label style={labelStyle}>PLAN</label>
                  <select className="select" defaultValue={showAssignModal.plan_id || ""} id="assign-plan-select" style={{ width: "100%", height: 36 }}>
                    <option value="">🚫 No plan (remove restriction)</option>
                    {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>EXPIRES AT (optional)</label>
                  <input type="date" style={inputStyle} defaultValue={showAssignModal.plan_expires_at?.split(" ")[0] || ""} id="assign-expires-input" />
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 3 }}>Account is disabled automatically when plan expires.</div>
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button className="btn-ghost" onClick={() => setShowAssignModal(null)}>Cancel</button>
                  <button className="btn-primary" onClick={() => {
                    const planId = (document.getElementById("assign-plan-select") as HTMLSelectElement)?.value;
                    const expires = (document.getElementById("assign-expires-input") as HTMLInputElement)?.value;
                    assignPlan(showAssignModal.id, planId ? Number(planId) : null, expires);
                  }}>Assign</button>
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}