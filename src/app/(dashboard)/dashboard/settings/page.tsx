"use client";
import { useState, useEffect } from "react";
import { signOut, useSession } from "next-auth/react";
import { useSettings } from "@/lib/SettingsContext";
import { useToast } from "@/components/Toast";
import { CURRENCIES } from "@/types";
import Link from "next/link";

export default function SettingsPage() {
  const { data: session } = useSession();
  const { settings, saveSettings } = useSettings();
  const [local, setLocal] = useState({ ...settings });
  const [saved, setSaved] = useState(false);
  const set = (k: string, v: any) => setLocal(p => ({ ...p, [k]: v }));

  useEffect(() => { setLocal({ ...settings }); }, [settings.currency]);

  const { success } = useToast();
  const save = async () => {
    await saveSettings(local);
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 580 }} className="fade-in">
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Settings</h1>

      {/* Account summary */}
      <div className="card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontWeight: 700 }}>{session?.user?.name}</div>
          <div style={{ fontSize: 13, color: "var(--muted)" }}>{session?.user?.email}</div>
        </div>
        <Link href="/dashboard/profile" className="btn-ghost" style={{ fontSize: 13 }}>Edit Profile →</Link>
      </div>

      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {/* Appearance */}
        <div style={{ paddingBottom: 20, marginBottom: 20, borderBottom: "1px solid var(--border-color)" }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>Appearance</div>
          <div style={{ display: "flex", gap: 8 }}>
            {[["dark","🌙 Dark"],["light","☀️ Light"]].map(([t,label]) => (
              <button key={t} onClick={() => set("theme", t)} style={{ padding: "8px 18px", borderRadius: 8, border: `1px solid ${local.theme === t ? "var(--accent)" : "var(--border-color)"}`, background: local.theme === t ? "rgba(var(--accent-rgb),0.12)" : "transparent", color: local.theme === t ? "var(--accent)" : "var(--muted)", fontWeight: 500, fontSize: 14, cursor: "pointer" }}>{label}</button>
            ))}
          </div>
        </div>

        {/* Currency */}
        <div style={{ paddingBottom: 20, marginBottom: 20, borderBottom: "1px solid var(--border-color)" }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Display Currency</div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 10 }}>All amounts auto-converted across the entire app</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
            {CURRENCIES.map(c => (
              <button key={c.code} onClick={() => set("currency", c.code)} style={{ padding: "8px 10px", borderRadius: 8, border: `1px solid ${local.currency === c.code ? "var(--accent)" : "var(--border-color)"}`, background: local.currency === c.code ? "rgba(var(--accent-rgb),0.12)" : "transparent", color: local.currency === c.code ? "var(--accent)" : "var(--muted)", fontSize: 12, fontWeight: 500, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 5 }}>
                <span>{c.flag}</span><span style={{ fontWeight: 700 }}>{c.code}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Budget */}
        <div style={{ paddingBottom: 20, marginBottom: 20, borderBottom: "1px solid var(--border-color)" }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Monthly Budget</div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 10 }}>Track total spending against your monthly budget goal</div>
          <input className="input" type="number" min="0" step="10" placeholder="0 = no limit" value={local.monthly_budget || ""} onChange={e => set("monthly_budget", Number(e.target.value))} style={{ maxWidth: 200 }} />
        </div>

        {/* Date format */}
        <div style={{ paddingBottom: 20, marginBottom: 20, borderBottom: "1px solid var(--border-color)" }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>Date Format</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[["MMM D, YYYY","Jan 5, 2025"],["D/M/YYYY","5/1/2025"],["MM/DD/YYYY","01/05/2025"],["YYYY-MM-DD","2025-01-05"]].map(([fmt,ex]) => (
              <button key={fmt} onClick={() => set("date_format", fmt)} style={{ padding: "7px 12px", borderRadius: 7, border: `1px solid ${local.date_format === fmt ? "var(--accent)" : "var(--border-color)"}`, background: local.date_format === fmt ? "rgba(var(--accent-rgb),0.12)" : "transparent", color: local.date_format === fmt ? "var(--accent)" : "var(--muted)", fontSize: 12, cursor: "pointer" }}>{ex}</button>
            ))}
          </div>
        </div>

        {/* Week start */}
        <div style={{ paddingBottom: 20, marginBottom: 20, borderBottom: "1px solid var(--border-color)" }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>Week Starts On</div>
          <div style={{ display: "flex", gap: 8 }}>
            {[["monday","Monday"],["sunday","Sunday"]].map(([k,l]) => (
              <button key={k} onClick={() => set("week_start", k)} style={{ padding: "7px 16px", borderRadius: 7, border: `1px solid ${local.week_start === k ? "var(--accent)" : "var(--border-color)"}`, background: local.week_start === k ? "rgba(var(--accent-rgb),0.12)" : "transparent", color: local.week_start === k ? "var(--accent)" : "var(--muted)", fontSize: 13, cursor: "pointer" }}>{l}</button>
            ))}
          </div>
        </div>

        {/* Renewal reminders */}
        <div style={{ paddingBottom: 20, marginBottom: 20, borderBottom: "1px solid var(--border-color)" }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Renewal Reminders</div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 12 }}>In-app alerts before subscriptions renew</div>
          {[["remind_3d","3 days before"],["remind_7d","7 days before"],["remind_14d","14 days before"]].map(([k,label]) => (
            <label key={k} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, cursor: "pointer", fontSize: 14 }}>
              <input type="checkbox" checked={!!(local as any)[k]} onChange={e => set(k, e.target.checked)} style={{ accentColor: "var(--accent)", width: 15, height: 15 }} />
              {label}
            </label>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button className="btn-primary" onClick={save}>{saved ? "✓ Saved" : "Save Settings"}</button>
          <Link href="/dashboard/notifications" className="btn-ghost" style={{ fontSize: 13 }}>Notification Settings →</Link>
          <button className="btn-ghost" style={{ color: "#EF4444", borderColor: "#EF444440" }} onClick={() => signOut({ callbackUrl: "/login" })}>Sign out</button>
        </div>
      </div>

      {/* Backup & Restore */}
      <BackupSection />
    </div>
  );
}

function BackupSection() {
  const [backups, setBackups] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState("");

  const load = async () => {
    const r = await fetch("/api/backup").then(r => r.json());
    if (Array.isArray(r)) setBackups(r);
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    setCreating(true);
    try {
      const r = await fetch("/api/backup", { method: "POST" }).then(r => r.json());
      if (r.id) { setMsg("Backup created successfully"); await load(); }
      else setMsg("Failed to create backup");
    } catch { setMsg("Error creating backup"); }
    setCreating(false);
    setTimeout(() => setMsg(""), 3000);
  };

  const del = async (id: number) => {
    if (!confirm("Delete this backup?")) return;
    await fetch("/api/backup", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setBackups(p => p.filter(b => b.id !== id));
  };

  const download = (id: number, filename: string) => {
    const a = document.createElement("a");
    a.href = `/api/backup/${id}`;
    a.download = filename;
    a.click();
  };

  const fmtBytes = (b: number) => b < 1024 ? `${b}B` : b < 1048576 ? `${(b/1024).toFixed(1)}KB` : `${(b/1048576).toFixed(1)}MB`;

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      <div style={{ paddingBottom: 16, marginBottom: 16, borderBottom: "1px solid var(--border-color)" }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Backup & Restore</div>
        <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 12 }}>Create and manage backups of your subscriptions, bills, and settings</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button className="btn-primary" onClick={create} disabled={creating}>{creating ? "Creating..." : "Create Backup"}</button>
          {msg && <span style={{ fontSize: 13, color: msg.includes("success") ? "#10B981" : "#EF4444" }}>{msg}</span>}
        </div>
      </div>
      {backups.length === 0 ? (
        <div style={{ fontSize: 13, color: "var(--muted)", textAlign: "center", padding: "16px 0" }}>No backups yet. Create your first backup above.</div>
      ) : backups.map(b => (
        <div key={b.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border-color)" }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{b.filename}</div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>{new Date(b.created_at).toLocaleString()} · {fmtBytes(b.size)}</div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button className="btn-ghost" style={{ fontSize: 12, padding: "4px 10px" }} onClick={() => download(b.id, b.filename)}>⬇ Download</button>
            <button style={{ background: "none", border: "none", color: "#EF4444", cursor: "pointer", fontSize: 13 }} onClick={() => del(b.id)}>🗑️</button>
          </div>
        </div>
      ))}
    </div>
  );
}
