"use client";
import { useState, useEffect } from "react";
import { useSubscriptions } from "@/lib/useSubscriptions";
import { useSettings } from "@/lib/SettingsContext";
import { toMonthly, fmt, PaymentMethod } from "@/types";

const BRANDS = ["Visa", "Mastercard", "Amex", "PayPal", "Apple Pay", "Google Pay", "Other"];
const BRAND_ICONS: Record<string, string> = {
  Visa: "💳", Mastercard: "💳", Amex: "💳", PayPal: "🅿️", "Apple Pay": "🍎", "Google Pay": "🔷", Other: "💳"
};

export default function PaymentsPage() {
  const { subs, loading } = useSubscriptions();
  const { currencySymbol, convertToDisplay } = useSettings();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ label: "", type: "card", last4: "", brand: "Visa", is_default: false });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const res = await fetch("/api/payment-methods");
    const data = await res.json();
    setMethods(Array.isArray(data) ? data.map((m: any) => ({ ...m, is_default: !!m.is_default })) : []);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    await fetch("/api/payment-methods", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    await load();
    setShowAdd(false);
    setForm({ label: "", type: "card", last4: "", brand: "Visa", is_default: false });
    setSaving(false);
  };

  const remove = async (id: number) => {
    if (!confirm("Delete this payment method?")) return;
    await fetch(`/api/payment-methods/${id}`, { method: "DELETE" });
    setMethods(prev => prev.filter(m => m.id !== id));
  };

  const setDefault = async (id: number) => {
    await fetch(`/api/payment-methods/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_default: true }) });
    await load();
  };

  const activeSubs = subs.filter(s => s.active);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }} className="fade-in">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Payment Methods</h1>
          <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 2 }}>Monthly spending breakdown by payment method</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>+ Add Method</button>
      </div>

      {methods.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 48 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>💳</div>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>No payment methods yet</div>
          <div style={{ color: "var(--muted)", fontSize: 14, marginBottom: 16 }}>Add payment methods to track spending per card or account</div>
          <button className="btn-primary" onClick={() => setShowAdd(true)}>Add First Method</button>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {methods.map((m, i) => {
            const mSubs = activeSubs.filter(s => s.payment_method_id === m.id);
            const total = mSubs.reduce((a, s) => a + convertToDisplay(toMonthly(s.amount, s.cycle), s.currency), 0);
            return (
              <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 20px", borderBottom: i < methods.length - 1 ? "1px solid var(--border-color)" : "none" }}>
                <div style={{ width: 38, height: 38, borderRadius: 8, background: "var(--surface2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                  {BRAND_ICONS[m.brand || "Other"] || "💳"}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
                    {m.label}
                    {m.is_default && <span className="badge" style={{ background: "rgba(var(--accent-rgb),0.12)", color: "var(--accent)", fontSize: 10 }}>Default</span>}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                    {m.last4 && `•••• ${m.last4} · `}{mSubs.length} app{mSubs.length !== 1 ? "s" : ""}
                  </div>
                </div>
                <div style={{ fontWeight: 700, fontSize: 15, color: "var(--accent)", minWidth: 90, textAlign: "right" }}>{currencySymbol}{fmt(total)}/mo</div>
                {!m.is_default && <button onClick={() => setDefault(m.id)} className="btn-ghost" style={{ fontSize: 11, padding: "4px 8px", whiteSpace: "nowrap" }}>Set Default</button>}
                <button onClick={() => remove(m.id)} style={{ background: "none", border: "none", color: "#EF4444", cursor: "pointer", fontSize: 14, padding: 4 }}>🗑️</button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add modal */}
      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal-box" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontSize: 17, fontWeight: 700 }}>Add Payment Method</h2>
              <button onClick={() => setShowAdd(false)} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 18, cursor: "pointer" }}>✕</button>
            </div>
            <div className="modal-body">
              <div>
                <label style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4, display: "block" }}>Label *</label>
                <input className="input" placeholder="e.g. Chase Visa, Personal PayPal" value={form.label} onChange={e => setForm(p => ({ ...p, label: e.target.value }))} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4, display: "block" }}>Brand</label>
                  <select className="select" style={{ width: "100%" }} value={form.brand} onChange={e => setForm(p => ({ ...p, brand: e.target.value }))}>
                    {BRANDS.map(b => <option key={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4, display: "block" }}>Last 4 digits</label>
                  <input className="input" placeholder="4242" maxLength={4} value={form.last4} onChange={e => setForm(p => ({ ...p, last4: e.target.value.replace(/\D/g, "") }))} />
                </div>
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14 }}>
                <input type="checkbox" checked={form.is_default} onChange={e => setForm(p => ({ ...p, is_default: e.target.checked }))} style={{ accentColor: "var(--accent)" }} />
                Set as default payment method
              </label>
            </div>
            <div className="modal-footer">
              <button className="btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="btn-primary" onClick={save} disabled={saving || !form.label.trim()}>{saving ? "Saving..." : "Add Method"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
