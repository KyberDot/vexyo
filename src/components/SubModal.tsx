"use client";
import { useState, useEffect, useRef } from "react";
import { Subscription, CATEGORIES, CYCLES } from "@/types";
import { useSettings } from "@/lib/SettingsContext";

const today = new Date().toISOString().split("T")[0];

interface Props {
  sub?: Subscription | null;
  onSave: (data: Partial<Subscription>) => void;
  onClose: () => void;
  familyMembers?: any[];
  paymentMethods?: any[];
}

export default function SubModal({ sub, onSave, onClose, familyMembers = [], paymentMethods = [] }: Props) {
  const { settings } = useSettings();
  const [form, setForm] = useState<any>(sub ? {
    ...sub, trial: sub.trial ? true : false, active: sub.active ? true : false
  } : {
    name: "", amount: "", currency: settings.currency, cycle: "monthly", category: "Entertainment",
    icon: "", color: "#6366F1", next_date: today, member_id: null, notes: "", trial: false,
    active: true, payment_method_id: null
  });
  const [saving, setSaving] = useState(false);
  const [iconMode, setIconMode] = useState<"url" | "upload">("url");
  const [previewIcon, setPreviewIcon] = useState<string>(sub?.icon || "");
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  useEffect(() => {
    if (form.name && !form.icon && iconMode === "url") {
      const domain = form.name.toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9]/g, "") + ".com";
      const url = `https://www.google.com/s2/favicons?sz=64&domain=${domain}`;
      set("icon", url);
      setPreviewIcon(url);
    }
  }, [form.name]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      set("icon", dataUrl);
      setPreviewIcon(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave({ ...form, amount: Number(form.amount) });
    setSaving(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 style={{ fontSize: 17, fontWeight: 700 }}>{sub ? "Edit Subscription" : "Add Subscription"}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 18, cursor: "pointer", lineHeight: 1, padding: 4 }}>✕</button>
        </div>

        <form onSubmit={submit} style={{ display: "contents" }}>
          <div className="modal-body">
            {/* Icon row */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 48, height: 48, borderRadius: 10, background: "var(--surface2)", border: "1px solid var(--border-color)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                {previewIcon ? <img src={previewIcon} width={36} height={36} style={{ objectFit: "contain" }} alt="icon" onError={() => setPreviewIcon("")} /> : <span style={{ fontSize: 20 }}>📦</span>}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
                  {(["url", "upload"] as const).map(m => (
                    <button key={m} type="button" onClick={() => setIconMode(m)} style={{ padding: "3px 8px", borderRadius: 6, border: `1px solid ${iconMode === m ? "var(--accent)" : "var(--border-color)"}`, background: iconMode === m ? "rgba(var(--accent-rgb),0.12)" : "transparent", color: iconMode === m ? "var(--accent)" : "var(--muted)", fontSize: 11, cursor: "pointer", fontWeight: 500 }}>
                      {m === "url" ? "🔗 URL" : "📁 Upload"}
                    </button>
                  ))}
                </div>
                {iconMode === "url"
                  ? <input className="input" placeholder="Auto-filled from name" value={form.icon || ""} onChange={e => { set("icon", e.target.value); setPreviewIcon(e.target.value); }} style={{ fontSize: 12, padding: "6px 10px" }} />
                  : <div>
                      <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileUpload} />
                      <button type="button" className="btn-ghost" style={{ fontSize: 12, padding: "5px 10px" }} onClick={() => fileRef.current?.click()}>Choose image</button>
                    </div>}
              </div>
            </div>

            {/* Name + Amount */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4, display: "block", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Service Name *</label>
                <input className="input" placeholder="Netflix" value={form.name} onChange={e => set("name", e.target.value)} required />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4, display: "block", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Amount *</label>
                <input className="input" type="number" step="0.01" placeholder="9.99" value={form.amount} onChange={e => set("amount", e.target.value)} required min="0" />
              </div>
            </div>

            {/* Cycle + Currency */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4, display: "block", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Billing Cycle</label>
                <select className="select" style={{ width: "100%" }} value={form.cycle} onChange={e => set("cycle", e.target.value)}>
                  {CYCLES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4, display: "block", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Currency</label>
                <select className="select" style={{ width: "100%" }} value={form.currency} onChange={e => set("currency", e.target.value)}>
                  {["USD", "EUR", "GBP", "CAD", "AUD", "EGP"].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* Category + Next date */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4, display: "block", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Category</label>
                <select className="select" style={{ width: "100%" }} value={form.category} onChange={e => set("category", e.target.value)}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4, display: "block", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Next Renewal</label>
                <input className="input" type="date" value={form.next_date || today} onChange={e => set("next_date", e.target.value)} />
              </div>
            </div>

            {/* Family member + Payment method */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4, display: "block", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Family Member</label>
                <select className="select" style={{ width: "100%" }} value={form.member_id || ""} onChange={e => set("member_id", e.target.value ? Number(e.target.value) : null)}>
                  <option value="">None</option>
                  {familyMembers.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4, display: "block", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Payment Method</label>
                <select className="select" style={{ width: "100%" }} value={form.payment_method_id || ""} onChange={e => set("payment_method_id", e.target.value ? Number(e.target.value) : null)}>
                  <option value="">None</option>
                  {paymentMethods.map((p: any) => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4, display: "block", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Notes</label>
              <input className="input" placeholder="Optional notes..." value={form.notes || ""} onChange={e => set("notes", e.target.value)} />
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14 }}>
              <input type="checkbox" checked={!!form.trial} onChange={e => set("trial", e.target.checked)} style={{ accentColor: "var(--accent)", width: 15, height: 15 }} />
              This is a free trial
            </label>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Saving..." : sub ? "Save Changes" : "Add Subscription"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
