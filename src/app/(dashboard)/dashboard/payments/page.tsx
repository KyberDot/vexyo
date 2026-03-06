"use client";
import ModalPortal from "@/components/ModalPortal";
import { useState, useEffect, useRef } from "react";
import { useSettings } from "@/lib/SettingsContext";
import { toMonthly, fmt } from "@/types";
import { useSubscriptions } from "@/lib/useSubscriptions";

const BRANDS = ["Visa","Mastercard","Amex","Discover","PayPal","Apple Pay","Google Pay","Cash","Bank Transfer","Crypto","Other"];
const BRAND_ICONS: Record<string, string> = { "Visa":"💳","Mastercard":"💳","Amex":"💳","Discover":"💳","PayPal":"🅿️","Apple Pay":"🍎","Google Pay":"🔷","Cash":"💵","Bank Transfer":"🏦","Crypto":"🔐","Other":"💳" };

export default function PaymentsPage() {
  const { currencySymbol, convertToDisplay } = useSettings();
  const { subs } = useSubscriptions();
  const [methods, setMethods] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editMethod, setEditMethod] = useState<any>(null);
  const [form, setForm] = useState<any>({ label: "", type: "card", last4: "", brand: "Visa", icon: "", member_id: null, is_default: false });
  const [saving, setSaving] = useState(false);
  const [iconMode, setIconMode] = useState<"emoji" | "upload">("emoji");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    const [mr, fmr] = await Promise.all([fetch("/api/payment-methods").then(r => r.json()), fetch("/api/family-members").then(r => r.json())]);
    setMethods(Array.isArray(mr) ? mr.map((m: any) => ({ ...m, is_default: !!m.is_default })) : []);
    setMembers(Array.isArray(fmr) ? fmr : []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    const body = { ...form, is_default: !!form.is_default };
    if (editMethod) await fetch(`/api/payment-methods/${editMethod.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    else await fetch("/api/payment-methods", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    await load(); setShowModal(false); setSaving(false);
  };

  const del = async (id: number, label: string) => {
    if (!confirm(`Delete payment method "${label}"?`)) return;
    await fetch(`/api/payment-methods/${id}`, { method: "DELETE" });
    setMethods(p => p.filter(m => m.id !== id));
  };

  const setDefault = async (id: number) => {
    await fetch(`/api/payment-methods/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_default: true }) });
    await load();
  };

  const getMethodSpend = (methodId: number) => subs.filter(s => s.active && s.payment_method_id === methodId).reduce((a, s) => a + convertToDisplay(toMonthly(s.amount, s.cycle), s.currency), 0);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const r = new FileReader();
    r.onload = e => setForm((p: any) => ({ ...p, icon: e.target?.result as string }));
    r.readAsDataURL(file);
  };

  if (loading) return <div style={{ color: "var(--muted)" }}>Loading...</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }} className="fade-in">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div><h1 style={{ fontSize: 22, fontWeight: 700 }}>Wallet</h1><p style={{ color: "var(--muted)", fontSize: 13, marginTop: 2 }}>Manage your payment methods and accounts</p></div>
        <button className="btn-primary" onClick={() => { setEditMethod(null); setForm({ label: "", type: "card", last4: "", brand: "Visa", icon: "", member_id: null, is_default: false }); setIconMode("emoji"); setShowModal(true); }}>+ Add Method</button>
      </div>

      {methods.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 48 }}>
          <div style={{ fontSize: 38, marginBottom: 10 }}>💳</div>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>No payment methods yet</div>
          <button className="btn-primary" onClick={() => setShowModal(true)}>Add First Method</button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
          {methods.map(m => {
            const spend = getMethodSpend(m.id);
            const member = members.find(mb => mb.id === m.member_id);
            return (
              <div key={m.id} className="card">
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 10, background: "var(--surface2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, overflow: "hidden", flexShrink: 0 }}>
                      {m.icon && m.icon.startsWith("data:") ? <img src={m.icon} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" /> : m.icon || BRAND_ICONS[m.brand] || "💳"}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{m.label}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>{m.brand}{m.last4 ? ` •••• ${m.last4}` : ""}</div>
                      {member && <div style={{ fontSize: 11, color: "var(--accent)" }}>{member.name}</div>}
                    </div>
                  </div>
                  {m.is_default && <span className="badge" style={{ background: "rgba(var(--accent-rgb),0.1)", color: "var(--accent)", fontSize: 10 }}>Default</span>}
                </div>
                <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>Monthly spend</div>
                <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 10 }}>{currencySymbol}{fmt(spend)}</div>
                <div style={{ display: "flex", gap: 6 }}>
                  {!m.is_default && <button className="btn-ghost" style={{ fontSize: 11, padding: "4px 8px" }} onClick={() => setDefault(m.id)}>Set Default</button>}
                  <button className="btn-ghost" style={{ fontSize: 11, padding: "4px 8px" }} onClick={() => { setEditMethod(m); setForm({ ...m, is_default: !!m.is_default }); setIconMode(m.icon?.startsWith("data:") ? "upload" : "emoji"); setShowModal(true); }}>✏️ Edit</button>
                  <button style={{ background: "none", border: "none", color: "#EF4444", cursor: "pointer", fontSize: 13, padding: "4px 6px", marginLeft: "auto" }} onClick={() => del(m.id, m.label)}>🗑️</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <ModalPortal><div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(5px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, overflow: "hidden" }}
          onClick={() => setShowModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: "var(--surface)", borderRadius: 14, width: "100%", maxWidth: 440, maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden", border: "1px solid var(--border-color)" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", flexShrink: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{editMethod ? "Edit Payment Method" : "Add Payment Method"}</div>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 16 }}>✕</button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "18px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Icon */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 8, display: "block" }}>Icon / Image</label>
                <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                  {(["emoji","upload"] as const).map(m => (
                    <button key={m} type="button" onClick={() => setIconMode(m)} style={{ padding: "6px 12px", borderRadius: 7, border: `1.5px solid ${iconMode === m ? "var(--accent)" : "var(--border-color)"}`, background: iconMode === m ? "rgba(var(--accent-rgb),0.1)" : "transparent", color: iconMode === m ? "var(--accent)" : "var(--muted)", fontSize: 12, cursor: "pointer", fontWeight: iconMode === m ? 600 : 400 }}>
                      {m === "emoji" ? "🎭 Emoji" : "📁 Upload Image"}
                    </button>
                  ))}
                </div>
                {iconMode === "emoji" ? (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {["💳","🍎","🅿️","🔷","💵","🏦","🔑","🌐","💰","🔐","🪙","💎"].map(ic => (
                      <button key={ic} type="button" onClick={() => setForm((p: any) => ({ ...p, icon: ic }))} style={{ width: 36, height: 36, borderRadius: 8, border: `1.5px solid ${form.icon === ic ? "var(--accent)" : "var(--border-color)"}`, background: form.icon === ic ? "rgba(var(--accent-rgb),0.1)" : "var(--surface2)", fontSize: 18, cursor: "pointer" }}>{ic}</button>
                    ))}
                  </div>
                ) : (
                  <div>
                    <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
                    <div onClick={() => fileRef.current?.click()} style={{ border: "2px dashed var(--border-color)", borderRadius: 8, padding: "16px", textAlign: "center", cursor: "pointer" }}>
                      {form.icon?.startsWith("data:") ? <img src={form.icon} style={{ width: 44, height: 44, objectFit: "contain", borderRadius: 8 }} alt="" /> : <><div style={{ fontSize: 22, opacity: 0.4 }}>⬆</div><div style={{ fontSize: 12, color: "var(--muted)" }}>Click to upload</div></>}
                    </div>
                  </div>
                )}
              </div>
              <div><label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 4, display: "block" }}>Label *</label><input className="input" placeholder="e.g. Personal Visa" value={form.label} onChange={e => setForm((p: any) => ({ ...p, label: e.target.value }))} /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div><label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 4, display: "block" }}>Brand</label>
                  <select className="select" style={{ width: "100%" }} value={form.brand} onChange={e => setForm((p: any) => ({ ...p, brand: e.target.value }))}>
                    {BRANDS.map(b => <option key={b}>{b}</option>)}
                  </select>
                </div>
                <div><label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 4, display: "block" }}>Last 4 digits</label><input className="input" placeholder="1234" maxLength={4} value={form.last4 || ""} onChange={e => setForm((p: any) => ({ ...p, last4: e.target.value.replace(/\D/g, "").slice(0, 4) }))} /></div>
              </div>
              <div><label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 4, display: "block" }}>Assigned Family Member (optional)</label>
                <select className="select" style={{ width: "100%" }} value={form.member_id || ""} onChange={e => setForm((p: any) => ({ ...p, member_id: e.target.value ? Number(e.target.value) : null }))}>
                  <option value="">None</option>
                  {members.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
                <input type="checkbox" checked={!!form.is_default} onChange={e => setForm((p: any) => ({ ...p, is_default: e.target.checked }))} style={{ accentColor: "var(--accent)" }} />
                Set as default payment method
              </label>
            </div>
            <div style={{ padding: "13px 20px", borderTop: "1px solid var(--border-color)", display: "flex", justifyContent: "flex-end", gap: 8, flexShrink: 0 }}>
              <button className="btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={save} disabled={saving || !form.label}>{saving ? "Saving..." : editMethod ? "Save" : "Add Method"}</button>
            </div>
          </div>
        </div></ModalPortal>
      )}
    </div>
  );
}
