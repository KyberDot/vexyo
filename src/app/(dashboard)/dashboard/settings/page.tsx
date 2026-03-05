"use client";
import { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { useSettings } from "@/lib/SettingsContext";
import Link from "next/link";

export default function SettingsPage() {
  const { data: session } = useSession();
  const { settings, saveSettings } = useSettings();
  const [local, setLocal] = useState({ ...settings });
  const [saved, setSaved] = useState(false);

  const set = (k: string, v: any) => setLocal(p => ({ ...p, [k]: v }));

  const save = async () => {
    await saveSettings(local);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 560 }} className="fade-in">
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Settings</h1>

      <div className="card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontWeight: 600, marginBottom: 2 }}>{session?.user?.name}</div>
            <div style={{ fontSize: 13, color: "var(--muted)" }}>{session?.user?.email}</div>
          </div>
          <Link href="/dashboard/profile" className="btn-ghost" style={{ fontSize: 13 }}>Edit Profile →</Link>
        </div>
      </div>

      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 15 }}>Appearance</div>
          <div style={{ display: "flex", gap: 8 }}>
            {[["dark", "🌙 Dark"], ["light", "☀️ Light"]].map(([t, label]) => (
              <button key={t} onClick={() => set("theme", t)} style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${local.theme === t ? "var(--accent)" : "var(--border-color)"}`, background: local.theme === t ? "rgba(var(--accent-rgb),0.12)" : "transparent", color: local.theme === t ? "var(--accent)" : "var(--muted)", fontWeight: 500, fontSize: 14, cursor: "pointer" }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: 20 }}>
          <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 15 }}>Display Currency</div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 10 }}>All amounts are auto-converted to this currency across all pages</div>
          <select className="select" value={local.currency} onChange={e => set("currency", e.target.value)}>
            {[["USD","🇺🇸 USD — US Dollar"],["EUR","🇪🇺 EUR — Euro"],["GBP","🇬🇧 GBP — British Pound"],["CAD","🇨🇦 CAD — Canadian Dollar"],["AUD","🇦🇺 AUD — Australian Dollar"],["EGP","🇪🇬 EGP — Egyptian Pound"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>

        <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: 20 }}>
          <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 15 }}>Monthly Budget</div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 10 }}>Set a spending limit to track on the dashboard</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "var(--muted)", fontSize: 14 }}>
              {local.currency === "EUR" ? "€" : local.currency === "GBP" ? "£" : local.currency === "EGP" ? "E£" : "$"}
            </span>
            <input className="input" type="number" min="0" step="10" placeholder="0 (no limit)" value={local.monthly_budget || ""} onChange={e => set("monthly_budget", Number(e.target.value))} style={{ width: 160 }} />
          </div>
        </div>

        <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: 20 }}>
          <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 15 }}>Renewal Reminders</div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 12 }}>Get notified before subscriptions renew</div>
          {[["remind_3d", "3 days before"], ["remind_7d", "7 days before"], ["remind_14d", "14 days before"]].map(([key, label]) => (
            <label key={key} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, cursor: "pointer", fontSize: 14 }}>
              <input type="checkbox" checked={!!(local as any)[key]} onChange={e => set(key, e.target.checked)} style={{ accentColor: "var(--accent)", width: 16, height: 16 }} />
              {label}
            </label>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", borderTop: "1px solid var(--border-color)", paddingTop: 20 }}>
          <button className="btn-primary" onClick={save}>{saved ? "✓ Saved" : "Save Settings"}</button>
          <button className="btn-ghost" onClick={() => signOut({ callbackUrl: "/login" })}>Sign out</button>
        </div>
      </div>
    </div>
  );
}
