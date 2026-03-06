"use client";
import ModalPortal from "@/components/ModalPortal";
import { useState, useEffect, useRef, memo } from "react";
import { Subscription, CYCLES, CURRENCIES } from "@/types";
import { useSettings } from "@/lib/SettingsContext";

const today = new Date().toISOString().split("T")[0];

const POPULAR = [
  { name: "Netflix", emoji: "🎬", icon: "", category: "Entertainment" },
  { name: "Spotify", emoji: "🎵", icon: "", category: "Music" },
  { name: "YouTube Premium", emoji: "▶️", icon: "", category: "Entertainment" },
  { name: "Disney+", emoji: "✨", icon: "", category: "Entertainment" },
  { name: "Amazon Prime", emoji: "📦", icon: "", category: "Entertainment" },
  { name: "Apple Music", emoji: "🍎", icon: "", category: "Music" },
  { name: "HBO Max", emoji: "📺", icon: "", category: "Entertainment" },
  { name: "Adobe CC", emoji: "🎨", icon: "", category: "Software" },
  { name: "Microsoft 365", emoji: "🪟", icon: "", category: "Productivity" },
  { name: "Google One", emoji: "☁️", icon: "", category: "Cloud Storage" },
  { name: "ChatGPT Plus", emoji: "🤖", icon: "", category: "Software" },
  { name: "Dropbox", emoji: "📁", icon: "", category: "Cloud Storage" },
  { name: "Slack", emoji: "💬", icon: "", category: "Productivity" },
  { name: "GitHub", emoji: "🐙", icon: "", category: "Developer Tools" },
  { name: "Notion", emoji: "📝", icon: "", category: "Productivity" },
  { name: "Figma", emoji: "🖌️", icon: "", category: "Software" },
  { name: "Zoom", emoji: "📹", icon: "", category: "Productivity" },
  { name: "LinkedIn Premium", emoji: "💼", icon: "", category: "Other" },
  { name: "iCloud+", emoji: "☁️", icon: "", category: "Cloud Storage" },
  { name: "Headspace", emoji: "🧘", icon: "", category: "Health" },
];

const STEPS = ["Service", "Pricing", "Schedule", "Details", "Reminders"];

interface Props {
  sub?: Subscription | null;
  defaultType?: "subscription" | "bill";
  onSave: (data: Partial<Subscription>) => void;
  onClose: () => void;
  familyMembers?: any[];
  paymentMethods?: any[];
}
const SubModal = memo(function SubModal({ sub, defaultType = "subscription", onSave, onClose, familyMembers = [], paymentMethods = [] }: Props) {
  const { settings, categories, t } = useSettings();
  const isEditing = !!sub;

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [quickSearch, setQuickSearch] = useState("");
  const [iconMode, setIconMode] = useState<"upload" | "website" | "url">("website");
  const [iconLoading, setIconLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const iconTimer = useRef<ReturnType<typeof setTimeout>>();

  const [form, setForm] = useState<any>(() => ({
    type: sub?.type || defaultType,
    name: sub?.name || "",
    amount: sub?.amount ? String(sub.amount) : "",
    currency: sub?.currency || settings.currency,
    cycle: sub?.cycle || "monthly",
    category: sub?.category || (defaultType === "bill" ? "Utilities" : "Entertainment"),
    icon: sub?.icon || "",
    website: "",
    next_date: sub?.next_date || today,
    member_id: sub?.member_id || null,
    notes: sub?.notes || "",
    trial: sub ? !!sub.trial : false,
    active: sub ? (sub.active !== false) : true,
    payment_method_id: sub?.payment_method_id || null,
  }));

  // KEY FIX: use a stable setter that doesn't cause re-renders of parent
  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  // Auto-fetch icon - only when name or website changes, not on every keystroke via timer
  useEffect(() => {
    if (!form.name || iconMode !== "website") return;
    clearTimeout(iconTimer.current);
    iconTimer.current = setTimeout(() => {
      setIconLoading(true);
      const clean = form.name.toLowerCase().replace(/[^a-z0-9]/g, "");
      let domain = `${clean}.com`;
      if (form.website) {
        try { domain = new URL(form.website.startsWith("http") ? form.website : "https://" + form.website).hostname.replace("www.", ""); } catch {}
      }
      const url = `https://logo.clearbit.com/${domain}`;
      const img = new Image();
      img.onload = () => { set("icon", url); setIconLoading(false); };
      img.onerror = () => { set("icon", `https://www.google.com/s2/favicons?sz=128&domain=${domain}`); setIconLoading(false); };
      img.src = url;
    }, 900);
    return () => clearTimeout(iconTimer.current);
  }, [form.name, form.website, iconMode]);

  const selectPopular = (svc: typeof POPULAR[0]) => {
    setForm((p: any) => ({ ...p, name: svc.name, icon: svc.icon || "", category: svc.category }));
  };

  const handleFile = (file: File) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = e => set("icon", e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const canNext = () => {
    if (step === 0) return !!form.name.trim() && !!form.category;
    if (step === 1) return form.cycle === 'variable' || (!!form.amount && Number(form.amount) > 0);
    return true;
  };

  const handleSave = async () => {
    setSaving(true);
    const data: any = { ...form, amount: form.cycle === "variable" ? 0 : (Number(form.amount) || 0) };
    delete data.website;
    await onSave(data);
    setSaving(false);
  };

  const filteredPopular = POPULAR.filter(s => !quickSearch || s.name.toLowerCase().includes(quickSearch.toLowerCase()));

  // Monthly/yearly preview
  const amt = Number(form.amount) || 0;
  const monthly = form.cycle === "monthly" ? amt : form.cycle === "yearly" ? amt / 12 : form.cycle === "weekly" ? amt * 4.33 : form.cycle === "quarterly" ? amt / 3 : amt;
  const yearly = form.cycle === "yearly" ? amt : form.cycle === "monthly" ? amt * 12 : form.cycle === "weekly" ? amt * 52 : form.cycle === "quarterly" ? amt * 4 : amt;
  const sym = CURRENCIES.find(c => c.code === form.currency)?.code || "USD";

  return (
    <ModalPortal><div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(5px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, overflow: "hidden" }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: "var(--surface)", borderRadius: 16, width: "100%", maxWidth: 700, height: "min(92vh, 640px)", display: "flex", flexDirection: "column", overflow: "hidden", border: "1px solid var(--border-color)", boxShadow: "0 24px 60px rgba(0,0,0,0.4)" }}>
        
        {/* Header */}
        <div style={{ padding: "18px 24px 14px", borderBottom: "1px solid var(--border-color)", flexShrink: 0, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 2 }}>
              {isEditing ? `Edit ${form.type === "bill" ? "Bill" : "Subscription"}` : `Add New ${form.type === "bill" ? "Bill" : "Subscription"}`}
            </h2>
            <p style={{ fontSize: 12, color: "var(--muted)" }}>
              {isEditing ? "Update your details below" : "Add a recurring payment to track"}
            </p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "1px solid var(--border-color)", borderRadius: 7, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--muted)", fontSize: 14, flexShrink: 0 }}>✕</button>
        </div>

        {/* Body: sidebar + scrollable content */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          
          {/* Step nav */}
          <div style={{ width: 150, borderRight: "1px solid var(--border-color)", padding: "14px 8px", display: "flex", flexDirection: "column", gap: 2, flexShrink: 0 }}>
            {STEPS.map((label, i) => {
              const optional = i >= 3;
              const active = i === step;
              const done = i < step;
              return (
                <button key={label} type="button" onClick={() => done && setStep(i)}
                  style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 9px", borderRadius: 7, border: "none", background: active ? "rgba(var(--accent-rgb),0.1)" : "transparent", color: active ? "var(--accent)" : done ? "var(--text)" : "var(--muted)", cursor: done ? "pointer" : "default", textAlign: "left", width: "100%" }}>
                  <div style={{ width: 19, height: 19, borderRadius: 99, background: active ? "var(--accent)" : done ? "#10B981" : "var(--surface2)", border: `1.5px solid ${active ? "var(--accent)" : done ? "#10B981" : "var(--border-color)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: active || done ? "white" : "var(--muted)", fontWeight: 700, flexShrink: 0 }}>
                    {done ? "✓" : i + 1}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: active ? 700 : 500 }}>{label}</div>
                    {optional && <div style={{ fontSize: 10, opacity: 0.55 }}>Optional</div>}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Scrollable step content */}
          <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "20px 22px" }}>

            {/* STEP 0: SERVICE */}
            {step === 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                {/* Type toggle */}
                <div style={{ display: "flex", gap: 6 }}>
                  {(["subscription","bill"] as const).map(t => (
                    <button key={t} type="button" onClick={() => set("type", t)} style={{ flex: 1, padding: "8px", borderRadius: 8, border: `1.5px solid ${form.type === t ? "var(--accent)" : "var(--border-color)"}`, background: form.type === t ? "rgba(var(--accent-rgb),0.08)" : "var(--surface2)", color: form.type === t ? "var(--accent)" : "var(--muted)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                      {t === "subscription" ? "📋 Subscription" : "🧾 Bill"}
                    </button>
                  ))}
                </div>

                {/* Quick select */}
                {form.type === "subscription" && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Quick Select</div>
                    <div style={{ position: "relative", marginBottom: 10 }}>
                      <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", fontSize: 13 }}>✨</span>
                      <input className="input" style={{ paddingLeft: 34, fontSize: 13 }} placeholder="Search popular services..." value={quickSearch} onChange={e => setQuickSearch(e.target.value)} />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 5 }}>
                      {filteredPopular.slice(0, 12).map(svc => (
                        <button key={svc.name} type="button" onClick={() => selectPopular(svc)} title={svc.name}
                          style={{ padding: "7px 4px", borderRadius: 8, border: `1.5px solid ${form.name === svc.name ? "var(--accent)" : "var(--border-color)"}`, background: form.name === svc.name ? "rgba(var(--accent-rgb),0.08)" : "var(--surface2)", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                          <span style={{ fontSize: 20 }}>{(svc as any).emoji || "📦"}</span>
                          <span style={{ fontSize: 9, color: "var(--muted)", textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", width: "100%", padding: "0 2px" }}>{svc.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Name + Category */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 5, display: "block" }}>Service Name *</label>
                    <input className="input" placeholder={form.type === "bill" ? "e.g. Electricity" : "e.g. Netflix"} value={form.name} onChange={e => set("name", e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 5, display: "block" }}>Category *</label>
                    <select className="select" style={{ width: "100%" }} value={form.category} onChange={e => set("category", e.target.value)}>
                      {categories.map(c => <option key={c.name} value={c.name}>{c.icon} {c.name}</option>)}
                    </select>
                  </div>
                </div>

                {/* Website */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 5, display: "block" }}>Website URL</label>
                  <input className="input" placeholder="https://netflix.com" value={form.website || ""} onChange={e => set("website", e.target.value)} />
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>Used to auto-fetch logo</div>
                </div>

                {/* Logo */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 8, display: "block" }}>Logo</label>
                  <div style={{ display: "flex", borderRadius: 8, border: "1px solid var(--border-color)", overflow: "hidden", marginBottom: 12 }}>
                    {(["upload","website","url"] as const).map((m, i) => (
                      <button key={m} type="button" onClick={() => setIconMode(m)} style={{ flex: 1, padding: "8px", background: iconMode === m ? "var(--accent)" : "var(--surface2)", border: "none", borderRight: i < 2 ? "1px solid var(--border-color)" : "none", color: iconMode === m ? "white" : "var(--muted)", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                        {m === "upload" ? "⬆ Upload" : m === "website" ? "🌐 Auto" : "🔗 URL"}
                      </button>
                    ))}
                  </div>
                  {iconMode === "upload" && (
                    <div onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={e => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }} onClick={() => fileRef.current?.click()} style={{ border: `2px dashed ${dragOver ? "var(--accent)" : "var(--border-color)"}`, borderRadius: 10, padding: "24px 16px", textAlign: "center", cursor: "pointer", background: dragOver ? "rgba(var(--accent-rgb),0.04)" : "transparent" }}>
                      <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
                      {form.icon && (form.icon.startsWith("data:") || form.icon.startsWith("http")) ? (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                          <img src={form.icon} style={{ width: 44, height: 44, objectFit: "contain", borderRadius: 8 }} alt="" />
                          <span style={{ fontSize: 11, color: "var(--muted)" }}>Click to change</span>
                        </div>
                      ) : (
                        <><div style={{ fontSize: 24, opacity: 0.4, marginBottom: 6 }}>⬆</div><div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>Drop image or click to upload</div><div style={{ fontSize: 11, color: "var(--muted)" }}>PNG, JPG, SVG up to 5MB</div></>
                      )}
                    </div>
                  )}
                  {iconMode === "website" && (
                    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "var(--surface2)", borderRadius: 8 }}>
                      <div style={{ width: 42, height: 42, borderRadius: 8, background: "var(--surface)", border: "1px solid var(--border-color)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                        {iconLoading ? <div style={{ width: 16, height: 16, border: "2px solid var(--accent)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} /> : form.icon ? <img src={form.icon} width={32} height={32} style={{ objectFit: "contain" }} alt="" onError={e => { (e.currentTarget as HTMLElement).style.display = "none"; }} /> : <span style={{ fontSize: 18, opacity: 0.3 }}>🌐</span>}
                      </div>
                      <div style={{ fontSize: 13, color: "var(--muted)" }}>
                        {form.icon && !iconLoading ? <span style={{ color: "#10B981" }}>✓ Logo fetched from website</span> : form.name ? "Fetching logo..." : "Enter a service name to auto-fetch the logo"}
                        {form.icon && !iconLoading && <button type="button" onClick={() => set("icon", "")} style={{ display: "block", marginTop: 3, fontSize: 11, background: "none", border: "none", color: "var(--muted)", cursor: "pointer", padding: 0 }}>× Clear</button>}
                      </div>
                    </div>
                  )}
                  {iconMode === "url" && <input className="input" placeholder="https://example.com/logo.png" value={form.icon || ""} onChange={e => set("icon", e.target.value)} />}
                </div>
              </div>
            )}

            {/* STEP 1: PRICING */}
            {step === 1 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 5, display: "block" }}>Amount *</label>
                    <input className="input" type="number" step="0.01" min="0" placeholder={form.cycle === "variable" ? t("variable") : "0.00"} value={form.amount} onChange={e => set("amount", e.target.value)} disabled={form.cycle === "variable"} autoFocus />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 5, display: "block" }}>Currency</label>
                    <select className="select" style={{ width: "100%" }} value={form.currency} onChange={e => set("currency", e.target.value)}>
                      {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 8, display: "block" }}>Billing Cycle</label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                    {(CYCLES as readonly string[]).map(c => (
                      <button key={c} type="button" onClick={() => set("cycle", c)}
                        style={{ padding: "9px 6px", borderRadius: 8, border: `1.5px solid ${form.cycle === c ? "var(--accent)" : "var(--border-color)"}`, background: form.cycle === c ? "rgba(var(--accent-rgb),0.08)" : "var(--surface2)", color: form.cycle === c ? "var(--accent)" : "var(--muted)", fontSize: 11, fontWeight: 500, cursor: "pointer" }}>
                        {{"weekly":t("weekly"),"monthly":t("monthly"),"quarterly":t("quarterly"),"6-months":"6 Months","yearly":t("yearly"),"variable":t("variable")}[c] || c}
                      </button>
                    ))}
                  </div>
                </div>

                {amt > 0 && form.cycle !== "variable" && (
                  <div style={{ padding: "14px 16px", background: "rgba(var(--accent-rgb),0.06)", border: "1px solid rgba(var(--accent-rgb),0.15)", borderRadius: 10 }}>
                    <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 700, marginBottom: 8, textTransform: "uppercase" }}>Cost Preview</div>
                    <div style={{ display: "flex", gap: 24 }}>
                      <div><div style={{ fontSize: 11, color: "var(--muted)" }}>Monthly</div><div style={{ fontSize: 18, fontWeight: 800 }}>{sym} {monthly.toFixed(2)}</div></div>
                      <div><div style={{ fontSize: 11, color: "var(--muted)" }}>Yearly</div><div style={{ fontSize: 18, fontWeight: 800 }}>{sym} {yearly.toFixed(2)}</div></div>
                    </div>
                  </div>
                )}

                {form.type === "subscription" && (
                  <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "12px 14px", borderRadius: 8, border: "1px solid var(--border-color)" }}>
                    <input type="checkbox" checked={!!form.trial} onChange={e => set("trial", e.target.checked)} style={{ accentColor: "var(--accent)", width: 15, height: 15, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>Free trial</div>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>Flags as trial and sends reminders before it ends</div>
                    </div>
                  </label>
                )}
              </div>
            )}

            {/* STEP 2: SCHEDULE */}
            {step === 2 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 5, display: "block" }}>Next {form.type === "bill" ? "Due Date" : "Renewal Date"}</label>
                  <input className="input" type="date" value={form.next_date || today} onChange={e => set("next_date", e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 5, display: "block" }}>Payment Method</label>
                  <select className="select" style={{ width: "100%" }} value={form.payment_method_id || ""} onChange={e => set("payment_method_id", e.target.value ? Number(e.target.value) : null)}>
                    <option value="">None</option>
                    {paymentMethods.map((p: any) => <option key={p.id} value={p.id}>{p.label}{p.last4 ? ` •••• ${p.last4}` : ""}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 5, display: "block" }}>Family Member</label>
                  <select className="select" style={{ width: "100%" }} value={form.member_id || ""} onChange={e => set("member_id", e.target.value ? Number(e.target.value) : null)}>
                    <option value="">None</option>
                    {familyMembers.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 8, display: "block" }}>Status</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    {[["true","Active"],["false","Paused"]].map(([v, l]) => (
                      <button key={v} type="button" onClick={() => set("active", v === "true")} style={{ flex: 1, padding: "9px", borderRadius: 8, border: `1.5px solid ${String(form.active) === v ? "var(--accent)" : "var(--border-color)"}`, background: String(form.active) === v ? "rgba(var(--accent-rgb),0.08)" : "var(--surface2)", color: String(form.active) === v ? "var(--accent)" : "var(--muted)", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>{l}</button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: DETAILS */}
            {step === 3 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px", background: "var(--surface2)", borderRadius: 10 }}>
                  {form.icon && <img src={form.icon} width={38} height={38} style={{ borderRadius: 8, objectFit: "contain", flexShrink: 0 }} alt="" onError={e => (e.currentTarget.style.display = "none")} />}
                  <div>
                    <div style={{ fontWeight: 700 }}>{form.name || "—"}</div>
                    <div style={{ fontSize: 13, color: "var(--muted)" }}>{form.category} · {form.cycle} · {form.currency} {form.amount}</div>
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 5, display: "block" }}>Notes</label>
                  <textarea className="input" placeholder="Account info, login, or any notes..." value={form.notes || ""} onChange={e => set("notes", e.target.value)} style={{ minHeight: 90, resize: "vertical" }} />
                </div>
              </div>
            )}

            {/* STEP 4: REMINDERS */}
            {step === 4 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <p style={{ fontSize: 13, color: "var(--muted)" }}>Reminders before this {form.type} renews. Global defaults are in Settings → Notifications.</p>
                {[["1","1 day before"],["3","3 days before"],["7","7 days before"],["14","14 days before"]].map(([days, label]) => (
                  <label key={days} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 8, border: `1px solid ${form[`remind_${days}d`] ? "var(--accent)" : "var(--border-color)"}`, cursor: "pointer" }}>
                    <input type="checkbox" checked={!!form[`remind_${days}d`]} onChange={e => set(`remind_${days}d`, e.target.checked)} style={{ accentColor: "var(--accent)", width: 15, height: 15, flexShrink: 0 }} />
                    <span style={{ fontSize: 14, fontWeight: 500 }}>{label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "13px 22px", borderTop: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <button type="button" className="btn-ghost" onClick={step === 0 ? onClose : () => setStep(s => s - 1)} style={{ fontSize: 13 }}>
            {step === 0 ? t("cancel") : "← Back"}
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ display: "flex", gap: 4 }}>
              {STEPS.map((_, i) => <div key={i} style={{ width: i === step ? 16 : 6, height: 6, borderRadius: 3, background: i === step ? "var(--accent)" : i < step ? "#10B981" : "var(--border-color)", transition: "all 0.2s" }} />)}
            </div>
            {step < STEPS.length - 1
              ? <button className="btn-primary" onClick={() => setStep(s => s + 1)} disabled={!canNext()} style={{ fontSize: 13 }}>Continue →</button>
              : <button className="btn-primary" onClick={handleSave} disabled={saving || !form.name || (form.cycle !== "variable" && !form.amount)} style={{ fontSize: 13 }}>
                  {saving ? "Saving..." : isEditing ? "Save Changes" : `Add ${form.type === "bill" ? "Bill" : "Subscription"}`}
                </button>}
          </div>
        </div>
      </div>
    </div></ModalPortal>
  );
});
export default SubModal;
