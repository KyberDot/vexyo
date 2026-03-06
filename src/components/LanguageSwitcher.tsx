"use client";
import { useState, useRef, useEffect } from "react";
import { useSettings } from "@/lib/SettingsContext";
import { LANGUAGES } from "@/lib/i18n";

export default function LanguageSwitcher() {
  const { settings, saveSettings, lang } = useSettings();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const current = LANGUAGES.find(l => l.code === lang) || LANGUAGES[0];

  const select = async (code: string) => {
    await saveSettings({ ...settings, language: code });
    setOpen(false);
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(o => !o)}
        title="Language"
        style={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, background: open ? "var(--surface2)" : "none", border: "none", cursor: "pointer", fontSize: 17, color: "var(--muted)" }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--surface2)"}
        onMouseLeave={e => { if (!open) (e.currentTarget as HTMLElement).style.background = "none"; }}
      >
        🌐
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, background: "var(--surface)", border: "1px solid var(--border-color)", borderRadius: 10, overflow: "hidden", zIndex: 200, boxShadow: "0 8px 24px rgba(0,0,0,0.3)", minWidth: 160 }}>
          {LANGUAGES.map(l => (
            <button key={l.code} onClick={() => select(l.code)}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", width: "100%", background: l.code === lang ? "rgba(var(--accent-rgb),0.08)" : "none", border: "none", color: l.code === lang ? "var(--accent)" : "var(--text)", fontSize: 13, fontWeight: l.code === lang ? 600 : 400, cursor: "pointer", textAlign: "left" }}
              onMouseEnter={e => { if (l.code !== lang) (e.currentTarget as HTMLElement).style.background = "var(--surface2)"; }}
              onMouseLeave={e => { if (l.code !== lang) (e.currentTarget as HTMLElement).style.background = "none"; }}
            >
              <span style={{ fontSize: 18 }}>{l.flag}</span>
              <span>{l.label}</span>
              {l.code === lang && <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--accent)" }}>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
