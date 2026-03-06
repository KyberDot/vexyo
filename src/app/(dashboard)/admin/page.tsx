"use client";
import ModalPortal from "@/components/ModalPortal";
import { useState, useEffect } from "react";
import { useToast } from "@/components/Toast";
import { useSettings } from "@/lib/SettingsContext";

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div onClick={() => onChange(!value)} style={{ width: 42, height: 24, borderRadius: 12, background: value ? "var(--accent)" : "var(--surface2)", border: "1px solid var(--border-color)", cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
      <div style={{ position: "absolute", top: 3, left: value ? 20 : 3, width: 16, height: 16, borderRadius: 8, background: "white", transition: "left 0.18s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
    </div>
  );
}

const TEMPLATE_NAMES: Record<string, string> = {
  magic_link: "Magic Link Email",
  invite: "Invitation Email",
  password_reset: "Password Reset",
  renewal_reminder: "Renewal Reminder",
};

const TEMPLATE_VARS: Record<string, string[]> = {
  magic_link: ["{{appName}}", "{{link}}", "{{email}}"],
  invite: ["{{appName}}", "{{link}}"],
  password_reset: ["{{appName}}", "{{link}}"],
  renewal_reminder: ["{{name}}", "{{days}}", "{{date}}", "{{amount}}", "{{appName}}"],
};

export default function AdminPage() {
  const { userRole, platform, savePlatform, reloadProfile } = useSettings();
  const { success, error: toastError } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [emailTemplates, setEmailTemplates] = useState<any[]>([]);
  const [tab, setTab] = useState<"users" | "plans" | "platform" | "mail" | "invites" | "templates">("users");
  const [platformForm, setPlatformForm] = useState<any>({});
  const [mailForm, setMailForm] = useState<any>({});
  const [mailTest, setMailTest] = useState<{ status: "idle" | "loading" | "ok" | "error"; msg: string }>({ status: "idle", msg: "" });
  const [saving, setSaving] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [editTemplate, setEditTemplate] = useState<any | null>(null);
  const [editPlan, setEditPlan] = useState<any | null>(null);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState<any | null>(null);

  useEffect(() => {
    if (userRole !== "admin") return;
    fetch("/api/admin/users").then(r => r.json()).then(d => { if (Array.isArray(d)) setUsers(d); });
    fetch("/api/admin/platform").then(r => r.json()).then(d => {
      if (d && !d.error) {
        setPlatformForm({ app_name: d.app_name || "Vexyo", primary_color: d.primary_color || "#6366F1", allow_registration: !!d.allow_registration, magic_link_enabled: !!d.magic_link_enabled, logo: d.logo || "", favicon: d.favicon || "" });
        setMailForm({ mail_host: d.mail_host || "", mail_port: d.mail_port || 587, mail_user: d.mail_user || "", mail_pass: d.mail_pass || "", mail_from: d.mail_from || "", mail_secure: !!d.mail_secure });
      }
    });
    fetch("/api/admin/invite").then(r => r.json()).then(d => { if (Array.isArray(d)) setInvites(d); });
    fetch("/api/admin/plans").then(r => r.json()).then(d => { if (Array.isArray(d)) setPlans(d); });
    fetch("/api/admin/email-templates").then(r => r.json()).then(d => { if (Array.isArray(d)) setEmailTemplates(d); });
  }, [userRole]);

  if (userRole !== "admin") return <div style={{ color: "var(--muted)", padding: 24 }}>Access denied.</div>;

  const savePlatformTab = async () => {
    setSaving(true);
    await savePlatform(platformForm);
    success("Platform settings saved");
    setSaving(false);
  };

  const saveMailSettings = async () => {
    setSaving(true);
    await fetch("/api/platform", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(mailForm) });
    success("Mail settings saved");
    setSaving(false);
  };

  const testMail = async () => {
    await saveMailSettings();
    setMailTest({ status: "loading", msg: "" });
    const res = await fetch("/api/admin/test-mail", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
    const d = await res.json();
    setMailTest({ status: res.ok ? "ok" : "error", msg: res.ok ? d.message : d.error });
  };

  const sendInvite = async () => {
    if (!inviteEmail) return;
    setInviting(true);
    const r = await fetch("/api/admin/invite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: inviteEmail }) });
    const d = await r.json();
    if (!r.ok) { toastError(d.error || "Failed to send invite"); }
    else { success(d.emailed ? `Invite sent to ${inviteEmail}` : `Invite created for ${inviteEmail}`); setInviteEmail(""); fetch("/api/admin/invite").then(r => r.json()).then(d => { if (Array.isArray(d)) setInvites(d); }); }
    setInviting(false);
  };

  const deleteInvite = async (id: number) => {
    await fetch("/api/admin/invite", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setInvites(inv => inv.filter(i => i.id !== id));
    success("Invite cancelled");
  };

  const savePlan = async (form: any) => {
    const method = form.id ? "PATCH" : "POST";
    const r = await fetch("/api/admin/plans", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (r.ok) {
      success(form.id ? "Plan updated" : "Plan created");
      fetch("/api/admin/plans").then(r => r.json()).then(d => { if (Array.isArray(d)) setPlans(d); });
      setShowPlanModal(false); setEditPlan(null);
    } else toastError("Failed to save plan");
  };

  const deletePlan = async (id: number) => {
    if (!confirm("Delete this plan?")) return;
    await fetch("/api/admin/plans", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setPlans(p => p.filter(x => x.id !== id));
    success("Plan deleted");
  };

  const assignPlan = async (userId: number, planId: number | null, expiresAt: string) => {
    await fetch("/api/admin/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: userId, plan_id: planId || null, plan_expires_at: expiresAt || null }) });
    success("Plan assigned");
    fetch("/api/admin/users").then(r => r.json()).then(d => { if (Array.isArray(d)) setUsers(d); });
    setShowAssignModal(null);
  };

  const toggleUserActive = async (user: any) => {
    await fetch("/api/admin/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: user.id, active: !user.active }) });
    setUsers(u => u.map(x => x.id === user.id ? { ...x, active: !x.active } : x));
    success(user.active ? "User deactivated" : "User activated");
  };

  const saveTemplate = async () => {
    if (!editTemplate) return;
    await fetch("/api/admin/email-templates", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editTemplate.id, subject: editTemplate.subject, body_html: editTemplate.body_html }) });
    success("Template saved");
    setEmailTemplates(t => t.map(x => x.id === editTemplate.id ? editTemplate : x));
    setEditTemplate(null);
  };

  const TABS = [
    { id: "users", label: "👥 Users" },
    { id: "plans", label: "📦 Plans" },
    { id: "platform", label: "⚙️ Platform" },
    { id: "mail", label: "📧 Mail" },
    { id: "invites", label: "✉️ Invites" },
    { id: "templates", label: "🎨 Templates" },
  ];

  const inputStyle = { background: "var(--surface2)", border: "1px solid var(--border-color)", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "var(--text)", outline: "none", width: "100%", boxSizing: "border-box" as const };
  const labelStyle = { fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 5, display: "block" as const };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 760 }} className="fade-in">
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Admin Portal</h1>
        <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 2 }}>Manage users, plans, platform settings, and more</p>
      </div>

      {/* Tabs */}
      <div className="card" style={{ padding: 4, display: "flex", gap: 2 }}>
        {TABS.map(({ id, label }) => (
          <button key={id} onClick={() => setTab(id as any)} style={{ flex: 1, padding: "7px 4px", borderRadius: 7, border: "none", background: tab === id ? "var(--accent)" : "transparent", color: tab === id ? "white" : "var(--muted)", fontWeight: tab === id ? 600 : 400, fontSize: 12, cursor: "pointer", transition: "all 0.15s" }}>{label}</button>
        ))}
      </div>

      {/* USERS */}
      {tab === "users" && (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-color)", fontWeight: 600, fontSize: 14 }}>Users ({users.length})</div>
          {users.map((u, i) => (
            <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 16px", borderBottom: i < users.length - 1 ? "1px solid var(--border-color)" : "none", opacity: u.active ? 1 : 0.5 }}>
              <div style={{ width: 32, height: 32, borderRadius: 99, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: 13, flexShrink: 0 }}>{(u.name || u.email)[0]?.toUpperCase()}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.name || u.email}</div>
                <div style={{ fontSize: 11, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email}</div>
              </div>
              <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: u.role === "admin" ? "rgba(var(--accent-rgb),0.15)" : "var(--surface2)", color: u.role === "admin" ? "var(--accent)" : "var(--muted)", fontWeight: 600 }}>{u.role}</span>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                {u.role !== "admin" && (
                  <button onClick={() => setShowAssignModal(u)} style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid var(--border-color)", background: "none", color: "var(--muted)", fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }}>
                    {u.plan_name ? `📦 ${u.plan_name}` : "📦 Plan"}
                  </button>
                )}
                {u.role !== "admin" && <Toggle value={!!u.active} onChange={() => toggleUserActive(u)} />}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* PLANS */}
      {tab === "plans" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p style={{ color: "var(--muted)", fontSize: 13 }}>Create plans and assign them to users to restrict access.</p>
            <button className="btn-primary" style={{ fontSize: 13 }} onClick={() => { setEditPlan({ name: "", description: "", max_subscriptions: -1, max_bills: -1, max_family_members: -1, can_use_analytics: true, can_use_ai: true, can_export: true, can_use_attachments: true }); setShowPlanModal(true); }}>+ New Plan</button>
          </div>
          {plans.length === 0 && <div className="card" style={{ textAlign: "center", padding: 32, color: "var(--muted)" }}>No plans yet. Create one to restrict user access.</div>}
          {plans.map(p => (
            <div key={p.id} className="card" style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{p.name}</div>
                {p.description && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{p.description}</div>}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                  {[["Subscriptions", p.max_subscriptions], ["Bills", p.max_bills], ["Family", p.max_family_members]].map(([l, v]) => (
                    <span key={l as string} style={{ fontSize: 11, padding: "2px 7px", borderRadius: 4, background: "var(--surface2)", color: "var(--muted)" }}>{l as string}: {v === -1 ? "∞" : v}</span>
                  ))}
                  {[["Analytics", p.can_use_analytics], ["AI", p.can_use_ai], ["Export", p.can_export], ["Attachments", p.can_use_attachments]].map(([l, v]) => (
                    <span key={l as string} style={{ fontSize: 11, padding: "2px 7px", borderRadius: 4, background: v ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)", color: v ? "#10B981" : "#EF4444" }}>{l as string}: {v ? "✓" : "✕"}</span>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => { setEditPlan(p); setShowPlanModal(true); }} style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid var(--border-color)", background: "none", color: "var(--muted)", fontSize: 12, cursor: "pointer" }}>Edit</button>
                <button onClick={() => deletePlan(p.id)} style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid rgba(239,68,68,0.3)", background: "none", color: "#EF4444", fontSize: 12, cursor: "pointer" }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* PLATFORM */}
      {tab === "platform" && (
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 18, padding: "20px 22px" }}>
          {/* Preview */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", background: "var(--surface2)", borderRadius: 10 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: platformForm.primary_color || "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
              {platformForm.logo ? <img src={platformForm.logo} style={{ width: "100%", height: "100%", objectFit: "contain" }} alt="" onError={e => (e.currentTarget.style.display="none")} /> : <span style={{ fontSize: 22 }}>💰</span>}
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: "var(--text)" }}>{platformForm.app_name || "Vexyo"}</div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>Live preview</div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div><label style={labelStyle}>APP NAME</label><input style={inputStyle} value={platformForm.app_name || ""} onChange={e => setPlatformForm((p: any) => ({ ...p, app_name: e.target.value }))} /></div>
            <div>
              <label style={labelStyle}>PRIMARY COLOR</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
                {["#6366F1","#8B5CF6","#EC4899","#EF4444","#F59E0B","#10B981","#06B6D4","#3B82F6","#F97316","#64748B"].map(col => (
                  <div key={col} onClick={() => setPlatformForm((p: any) => ({ ...p, primary_color: col }))} style={{ width: 22, height: 22, borderRadius: 6, background: col, cursor: "pointer", border: platformForm.primary_color === col ? "2.5px solid var(--text)" : "2px solid transparent", transition: "transform 0.1s", transform: platformForm.primary_color === col ? "scale(1.15)" : "scale(1)" }} />
                ))}
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input type="color" value={platformForm.primary_color || "#6366F1"} onChange={e => setPlatformForm((p: any) => ({ ...p, primary_color: e.target.value }))} style={{ width: 34, height: 30, border: "none", borderRadius: 6, cursor: "pointer", padding: 0, background: "none" }} />
                <input style={{ ...inputStyle, flex: 1 }} value={platformForm.primary_color || ""} onChange={e => setPlatformForm((p: any) => ({ ...p, primary_color: e.target.value }))} placeholder="#6366F1" />
              </div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <label style={labelStyle}>LOGO</label>
              <div style={{ display: "flex", gap: 6 }}>
                <input style={{ ...inputStyle, flex: 1 }} value={platformForm.logo?.startsWith("data:") ? "(uploaded)" : platformForm.logo || ""} onChange={e => setPlatformForm((p: any) => ({ ...p, logo: e.target.value }))} placeholder="https://... or upload" />
                <label style={{ padding: "0 10px", height: 34, display: "flex", alignItems: "center", background: "var(--surface2)", border: "1px solid var(--border-color)", borderRadius: 8, cursor: "pointer", fontSize: 12, color: "var(--muted)", whiteSpace: "nowrap" }}>
                  Upload
                  <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = ev => setPlatformForm((p: any) => ({ ...p, logo: ev.target?.result as string })); r.readAsDataURL(f); }} />
                </label>
              </div>
            </div>
            <div>
              <label style={labelStyle}>FAVICON</label>
              <div style={{ display: "flex", gap: 6 }}>
                <input style={{ ...inputStyle, flex: 1 }} value={platformForm.favicon?.startsWith("data:") ? "(uploaded)" : platformForm.favicon || ""} onChange={e => setPlatformForm((p: any) => ({ ...p, favicon: e.target.value }))} placeholder="https://... or upload" />
                <label style={{ padding: "0 10px", height: 34, display: "flex", alignItems: "center", background: "var(--surface2)", border: "1px solid var(--border-color)", borderRadius: 8, cursor: "pointer", fontSize: 12, color: "var(--muted)", whiteSpace: "nowrap" }}>
                  Upload
                  <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = ev => setPlatformForm((p: any) => ({ ...p, favicon: ev.target?.result as string })); r.readAsDataURL(f); }} />
                </label>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flex: 1, padding: "10px 14px", background: "var(--surface2)", borderRadius: 8 }}>
              <div><div style={{ fontSize: 13, fontWeight: 600 }}>Allow Registration</div><div style={{ fontSize: 11, color: "var(--muted)" }}>Public sign-up</div></div>
              <Toggle value={!!platformForm.allow_registration} onChange={v => setPlatformForm((p: any) => ({ ...p, allow_registration: v }))} />
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flex: 1, padding: "10px 14px", background: "var(--surface2)", borderRadius: 8 }}>
              <div><div style={{ fontSize: 13, fontWeight: 600 }}>Magic Link Login</div><div style={{ fontSize: 11, color: "var(--muted)" }}>Requires mail server</div></div>
              <Toggle value={!!platformForm.magic_link_enabled} onChange={v => setPlatformForm((p: any) => ({ ...p, magic_link_enabled: v }))} />
            </div>
          </div>
          <button className="btn-primary" onClick={savePlatformTab} disabled={saving} style={{ alignSelf: "flex-start" }}>{saving ? "Saving..." : "Save Platform Settings"}</button>
        </div>
      )}

      {/* MAIL */}
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
            <button className="btn-ghost" onClick={testMail} disabled={mailTest.status === "loading"} style={{ minWidth: 120 }}>🧪 {mailTest.status === "loading" ? "Sending test..." : "Send Test Email"}</button>
            <span style={{ fontSize: 11, color: "var(--muted)" }}>Test email also saves first</span>
          </div>
          {mailTest.status !== "idle" && (
            <div style={{ padding: "10px 12px", borderRadius: 8, background: mailTest.status === "ok" ? "rgba(16,185,129,0.1)" : mailTest.status === "error" ? "rgba(239,68,68,0.08)" : "var(--surface2)", border: `1px solid ${mailTest.status === "ok" ? "rgba(16,185,129,0.3)" : mailTest.status === "error" ? "rgba(239,68,68,0.2)" : "transparent"}`, fontSize: 13, color: mailTest.status === "ok" ? "#10B981" : mailTest.status === "error" ? "#EF4444" : "var(--muted)" }}>
              {mailTest.msg}
            </div>
          )}
        </div>
      )}

      {/* INVITES */}
      {tab === "invites" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="card" style={{ padding: "16px 18px" }}>
            <label style={labelStyle}>INVITE BY EMAIL</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input style={{ ...inputStyle, flex: 1 }} type="email" placeholder="user@example.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && sendInvite()} />
              <button className="btn-primary" onClick={sendInvite} disabled={inviting || !inviteEmail}>{inviting ? "Sending..." : "Send Invite"}</button>
            </div>
          </div>
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            {invites.length === 0 ? <div style={{ padding: 24, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>No invites yet.</div>
              : invites.map((inv, i) => (
                <div key={inv.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 16px", borderBottom: i < invites.length - 1 ? "1px solid var(--border-color)" : "none" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{inv.email}</div>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>{inv.invited_by_name ? `by ${inv.invited_by_name}` : ""} · {inv.created_at?.split("T")[0] || inv.created_at?.split(" ")[0]}</div>
                  </div>
                  <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: inv.used ? "var(--surface2)" : "rgba(16,185,129,0.1)", color: inv.used ? "var(--muted)" : "#10B981", fontWeight: 600 }}>{inv.used ? "Used" : "Pending"}</span>
                  {!inv.used && <button onClick={() => deleteInvite(inv.id)} style={{ background: "none", border: "none", color: "#EF4444", cursor: "pointer", fontSize: 12, padding: "4px 8px" }}>Cancel</button>}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* EMAIL TEMPLATES */}
      {tab === "templates" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ color: "var(--muted)", fontSize: 13 }}>Customize email templates. Use variables like {`{{appName}}`}, {`{{link}}`}.</p>
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
              <div>
                <label style={labelStyle}>HTML BODY</label>
                <textarea value={editTemplate.body_html} onChange={e => setEditTemplate((t: any) => ({ ...t, body_html: e.target.value }))} style={{ ...inputStyle, minHeight: 280, fontFamily: "monospace", fontSize: 12, resize: "vertical", lineHeight: 1.5 }} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn-primary" onClick={saveTemplate}>Save Template</button>
                <button className="btn-ghost" onClick={() => setEditTemplate(null)}>Cancel</button>
              </div>
            </div>
          ) : (
            emailTemplates.map(t => (
              <div key={t.id} className="card" style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{TEMPLATE_NAMES[t.name] || t.name}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Subject: {t.subject}</div>
                </div>
                <button onClick={() => setEditTemplate({ ...t })} style={{ padding: "6px 12px", borderRadius: 7, border: "1px solid var(--border-color)", background: "none", color: "var(--muted)", fontSize: 12, cursor: "pointer" }}>Edit</button>
              </div>
            ))
          )}
        </div>
      )}

      {/* PLAN MODAL */}
      {showPlanModal && editPlan && (
        <ModalPortal><div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(5px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => { setShowPlanModal(false); setEditPlan(null); }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "var(--surface)", borderRadius: 16, width: "100%", maxWidth: 520, maxHeight: "90vh", overflow: "auto", border: "1px solid var(--border-color)", boxShadow: "0 24px 60px rgba(0,0,0,0.5)", padding: "24px" }}>
            <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 18 }}>{editPlan.id ? "Edit Plan" : "New Plan"}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div><label style={labelStyle}>PLAN NAME *</label><input style={inputStyle} value={editPlan.name} onChange={e => setEditPlan((p: any) => ({ ...p, name: e.target.value }))} placeholder="e.g. Basic, Pro" /></div>
              <div><label style={labelStyle}>DESCRIPTION</label><input style={inputStyle} value={editPlan.description || ""} onChange={e => setEditPlan((p: any) => ({ ...p, description: e.target.value }))} /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                {[["Max Subscriptions", "max_subscriptions"], ["Max Bills", "max_bills"], ["Max Family Members", "max_family_members"]].map(([l, k]) => (
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
        </div></ModalPortal>
      )}

      {/* ASSIGN PLAN MODAL */}
      {showAssignModal && (
        <ModalPortal><div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(5px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => setShowAssignModal(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: "var(--surface)", borderRadius: 16, width: "100%", maxWidth: 400, border: "1px solid var(--border-color)", boxShadow: "0 24px 60px rgba(0,0,0,0.5)", padding: "24px" }}>
            <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 4 }}>Assign Plan</div>
            <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 18 }}>{showAssignModal.name || showAssignModal.email}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {showAssignModal.plan_name && (
                <div style={{ padding: "8px 12px", background: "rgba(16,185,129,0.08)", borderRadius: 8, border: "1px solid rgba(16,185,129,0.2)", fontSize: 12, color: "#10B981" }}>
                  Current plan: <strong>{showAssignModal.plan_name}</strong>
                  {showAssignModal.plan_expires_at && ` · expires ${new Date(showAssignModal.plan_expires_at).toLocaleDateString()}`}
                </div>
              )}
              <div>
                <label style={labelStyle}>ASSIGN PLAN</label>
                <select className="select" defaultValue={showAssignModal.plan_id || ""} id="assign-plan-select" style={{ width: "100%", height: 36 }}>
                  <option value="">🚫 No plan (remove restriction)</option>
                  {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>EXPIRES AT (optional)</label>
                <input type="date" style={inputStyle} defaultValue={showAssignModal.plan_expires_at?.split(" ")[0] || ""} id="assign-expires-input" />
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 3 }}>Leave blank for no expiry. When expired, the account will be disabled.</div>
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
        </div></ModalPortal>
      )}
    </div>
  );
}
