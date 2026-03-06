"use client";
import ModalPortal from "@/components/ModalPortal";
import { useState, useEffect, useRef } from "react";
import { useSettings } from "@/lib/SettingsContext";
import { toMonthly, fmt, CURRENCIES, CURRENCY_SYMBOLS } from "@/types";
import { useSubscriptions } from "@/lib/useSubscriptions";

const ACCOUNT_TYPES = [
  { value: "bank", label: "Bank Account", icon: "🏦" },
  { value: "chequing", label: "Chequing Account", icon: "🏛️" },
  { value: "savings", label: "Savings Account", icon: "🪙" },
  { value: "crypto", label: "Crypto Wallet", icon: "🔐" },
  { value: "paypal", label: "PayPal", icon: "🅿️" },
  { value: "ewallet", label: "E-wallet", icon: "📱" },
  { value: "credit", label: "Credit Account", icon: "💳" },
  { value: "cash", label: "Cash", icon: "💵" },
  { value: "other", label: "Other", icon: "💰" },
];

function getAccountIcon(account_type: string, icon?: string): string {
  if (icon && icon.length <= 4) return icon; // emoji
  const at = ACCOUNT_TYPES.find(a => a.value === account_type);
  return at?.icon || "💰";
}

export default function PaymentsPage() {
  const { currencySymbol, convertToDisplay, settings } = useSettings();
  const { subs } = useSubscriptions();
  const [methods, setMethods] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editMethod, setEditMethod] = useState<any>(null);
  const [form, setForm] = useState<any>({ label: "", account_type: "bank", last4: "", icon: "", currency: settings?.currency || "USD", balance: "", member_id: null, is_default: false });
  const [saving, setSaving] = useState(false);
  const [iconMode, setIconMode] = useState<"auto" | "upload" | "url">("auto");
  
  // FIX 1: Track the specific ID of the wallet being edited
  const [balanceAction, setBalanceAction] = useState<{ id: number; type: "add" | "remove" } | null>(null);
  
  const [balanceDelta, setBalanceDelta] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const [mr, fmr] = await Promise.all([fetch("/api/payment-methods").then(r => r.json()), fetch("/api/family-members").then(r => r.json())]);
    setMethods(Array.isArray(mr) ? mr.map((m: any) => ({ ...m, is_default: !!m.is_default })) : []);
    setMembers(Array.isArray(fmr) ? fmr : []);
  };
  useEffect(() => { load(); }, []);

  const setF = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true);
    const at = ACCOUNT_TYPES.find(a => a.value === form.account_type);
    const autoIcon = at?.icon || "💰";
    
    const body = {
      ...form,
      // FIX 2: Force it to use the user's settings currency if form currency is blank
      currency: form.currency || settings.currency || "USD",
      icon: iconMode === "auto" ? autoIcon : (form.icon || autoIcon),
      balance: Number(form.balance) || 0,
      is_default: !!form.is_default,
    };
    if (editMethod) await fetch(`/api/payment-methods/${editMethod.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    else await fetch("/api/payment-methods", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    await load(); setShowModal(false); setSaving(false);
  };

  const del = async (id: number, label: string) => {
    if (!confirm(`Delete "${label}"?`)) return;
    await fetch(`/api/payment-methods/${id}`, { method: "DELETE" });
    setMethods(p => p.filter(m => m.id !== id));
  };

  const setDefault = async (id: number) => {
    await fetch(`/api/payment-methods/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_default: true }) });
    await load();
  };

  const updateBalance = async (method: any) => {
    const delta = Number(balanceDelta);
    if (!delta || !balanceAction) return;
    const newBalance = balanceAction.type === "add" ? (method.balance || 0) + delta : Math.max(0, (method.balance || 0) - delta);
    await fetch(`/api/payment-methods/${method.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ balance: newBalance }) });
    setBalanceDelta("");
    setBalanceAction(null);
    await load();
  };

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const r = new FileReader();
    r.onload = e => setF("icon", e.target?.result as string);
    r.readAsDataURL(file);
  };

  const getMethodSpend = (methodId: number) => subs.filter(s => s.active && s.payment_method_id === methodId).reduce((a, s) => a + convertToDisplay(toMonthly(s.amount, s.cycle), s.currency), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }} className="fade-in">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div><h1 style={{ fontSize: 22, fontWeight: 700 }}>Wallet</h1><p style={{ color: "var(--muted)", fontSize: 13, marginTop: 2 }}>Manage your payment methods and account balances</p></div>
        <button className="btn-primary" onClick={() => { setEditMethod(null); setForm({ label: "", account_type: "bank", last4: "", icon: "", currency: settings.currency || "USD", balance: "", member_id: null, is_default: false }); setIconMode("auto"); setShowModal(true); }}>+ Add Account</button>
      </div>

      {methods.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 48 }}>
          <div style={{ fontSize: 38, marginBottom: 10 }}>💳</div>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>No payment methods yet</div>
          <button className="btn-primary" onClick={() => setShowModal(true)}>Add First Account</button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
          {methods.map(m => {
            const spend = getMethodSpend(m.id);
            const member = members.find(mb => mb.id === m.member_id);
            const sym = CURRENCY_SYMBOLS[m.currency] || m.currency || currencySymbol;
            const at = ACCOUNT_TYPES.find(a => a.value === m.account_type) || ACCOUNT_TYPES[ACCOUNT_TYPES.length - 1];
            const displayIcon = m.icon && (m.icon.startsWith("data:") || m.icon.startsWith("http")) ? null : (m.icon && m.icon.length <= 4 ? m.icon : at.icon);
            
            // Checking if THIS specific wallet is being edited
            const isEditingThis = balanceAction?.id === m.id;
            const isAdding = isEditingThis && balanceAction?.type === "add";
            const isRemoving = isEditingThis && balanceAction?.type === "remove";

            return (
              <div key={m.id} className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: "var(--surface2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, overflow: "hidden", flexShrink: 0 }}>
                      {m.icon && (m.icon.startsWith("data:") || m.icon.startsWith("http"))
                        ? <img src={m.icon} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" onError={e => (e.currentTarget.style.display = "none")} />
                        : displayIcon}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{m.label}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>{at.label}{m.last4 ? ` •••• ${m.last4}` : ""}</div>
                      {member && <div style={{ fontSize: 11, color: "var(--accent)" }}>{member.name}</div>}
                    </div>
                  </div>
                  {m.is_default && <span style={{ background: "rgba(var(--accent-rgb),0.1)", color: "var(--accent)", fontSize: 10, borderRadius: 5, padding: "2px 6px", fontWeight: 700 }}>DEFAULT</span>}
                </div>

                {/* Balance */}
                <div style={{ padding: "10px 12px", background: "var(--surface2)", borderRadius: 8 }}>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 2 }}>Balance</div>
                  <div style={{ fontSize: 22, fontWeight: 800 }}>
                    {sym}{fmt(m.balance || 0)}
                    {m.currency !== settings.currency && (
                      <span style={{ fontSize: 13, color: "var(--muted)", marginLeft: 8, fontWeight: 600 }}>
                        ≈ {currencySymbol}{fmt(convertToDisplay(m.balance || 0, m.currency))}
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                    <button onClick={() => { setBalanceAction(p => p?.id === m.id && p?.type === "add" ? null : { id: m.id, type: "add" }); setBalanceDelta(""); }} style={{ flex: 1, padding: "5px", borderRadius: 6, border: `1px solid ${isAdding ? "var(--accent)" : "var(--border-color)"}`, background: isAdding ? "rgba(var(--accent-rgb), 0.1)" : "transparent", color: "#10B981", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>+ Add</button>
                    <button onClick={() => { setBalanceAction(p => p?.id === m.id && p?.type === "remove" ? null : { id: m.id, type: "remove" }); setBalanceDelta(""); }} style={{ flex: 1, padding: "5px", borderRadius: 6, border: `1px solid ${isRemoving ? "rgba(239,68,68,0.5)" : "var(--border-color)"}`, background: isRemoving ? "rgba(239,68,68,0.1)" : "transparent", color: "#EF4444", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>− Remove</button>
                  </div>
                  {isEditingThis && (
                    <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                      <input className="input" type="number" step="0.01" min="0" placeholder="Amount" value={balanceDelta} onChange={e => setBalanceDelta(e.target.value)} style={{ flex: 1, height: 32, fontSize: 12 }} />
                      <button onClick={() => updateBalance(m)} style={{ padding: "0 10px", borderRadius: 6, border: "none", background: "var(--accent)", color: "white", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>OK</button>
                      <button onClick={() => { setBalanceAction(null); setBalanceDelta(""); }} style={{ padding: "0 8px", borderRadius: 6, border: "1px solid var(--border-color)", background: "transparent", color: "var(--muted)", fontSize: 12, cursor: "pointer" }}>✕</button>
                    </div>
                  )}
                </div>

                <div style={{ fontSize: 12, color: "var(--muted)" }}>Monthly spend: <span style={{ fontWeight: 700, color: "var(--text)" }}>{currencySymbol}{fmt(spend)}</span></div>

                <div style={{ display: "flex", gap: 6 }}>
                  {!m.is_default && <button className="btn-ghost" style={{ fontSize: 11, padding: "4px 8px" }} onClick={() => setDefault(m.id)}>Set Default</button>}
                  <button className="btn-ghost" style={{ fontSize: 11, padding: "4px 8px" }} onClick={() => { setEditMethod(m); setForm({ ...m, balance: m.balance || 0, is_default: !!m.is_default }); setIconMode(m.icon?.startsWith("data:") ? "upload" : m.icon?.startsWith("http") ? "url" : "auto"); setShowModal(true); }}>✏️ Edit</button>
                  <button style={{ background: "none", border: "none", color: "#EF4444", cursor: "pointer", fontSize: 13, padding: "4px 6px", marginLeft: "auto" }} onClick={() => del(m.id, m.label)}>🗑️</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <ModalPortal><div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(5px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "var(--surface)", borderRadius: 14, width: "100%", maxWidth: 460, maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden", border: "1px solid var(--border-color)" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", flexShrink: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{editMethod ? "Edit Account" : "Add Account"}</div>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 16 }}>✕</button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "18px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Account Type */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 8, display: "block" }}>Account Type *</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                  {ACCOUNT_TYPES.map(at => (
                    <button key={at.value} type="button" onClick={() => setF("account_type", at.value)} style={{ padding: "8px 6px", borderRadius: 8, border: `1.5px solid ${form.account_type === at.value ? "var(--accent)" : "var(--border-color)"}`, background: form.account_type === at.value ? "rgba(var(--accent-rgb),0.08)" : "var(--surface2)", color: form.account_type === at.value ? "var(--accent)" : "var(--muted)", fontSize: 11, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                      <span style={{ fontSize: 18 }}>{at.icon}</span>
                      <span style={{ fontWeight: 500, textAlign: "center", lineHeight: 1.2 }}>{at.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div><label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 4, display: "block" }}>Label *</label><input className="input" placeholder="e.g. Main Bank Account" value={form.label} onChange={e => setF("label", e.target.value)} /></div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div><label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 4, display: "block" }}>Currency</label>
                  <select className="select" style={{ width: "100%" }} value={form.currency || settings.currency || "USD"} onChange={e => setF("currency", e.target.value)}>
                    {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
                  </select>
                </div>
                <div><label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 4, display: "block" }}>Balance</label><input className="input" type="number" step="0.01" min="0" placeholder="0.00" value={form.balance || ""} onChange={e => setF("balance", e.target.value)} /></div>
              </div>

              <div><label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 4, display: "block" }}>Last 4 digits (optional)</label><input className="input" placeholder="1234" maxLength={4} value={form.last4 || ""} onChange={e => setF("last4", e.target.value.replace(/\D/g, "").slice(0, 4))} /></div>

              {/* Custom icon (only for "other" type) */}
              {form.account_type === "other" && (
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 8, display: "block" }}>Custom Icon</label>
                  <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                    {(["auto","upload","url"] as const).map(m => (
                      <button key={m} type="button" onClick={() => setIconMode(m)} style={{ padding: "5px 10px", borderRadius: 6, border: `1px solid ${iconMode === m ? "var(--accent)" : "var(--border-color)"}`, background: iconMode === m ? "rgba(var(--accent-rgb),0.1)" : "transparent", color: iconMode === m ? "var(--accent)" : "var(--muted)", fontSize: 11, cursor: "pointer" }}>
                        {m === "auto" ? "Auto" : m === "upload" ? "Upload" : "URL"}
                      </button>
                    ))}
                  </div>
                  {iconMode === "upload" && (
                    <div>
                      <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
                      <div onClick={() => fileRef.current?.click()} style={{ border: "2px dashed var(--border-color)", borderRadius: 8, padding: "12px", textAlign: "center", cursor: "pointer" }}>
                        {form.icon?.startsWith("data:") ? <img src={form.icon} style={{ width: 40, height: 40, objectFit: "contain", borderRadius: 6 }} alt="" /> : <><div style={{ fontSize: 20, opacity: 0.4 }}>⬆</div><div style={{ fontSize: 12, color: "var(--muted)" }}>Click to upload image</div></>}
                      </div>
                    </div>
                  )}
                  {iconMode === "url" && <input className="input" placeholder="https://example.com/icon.png" value={form.icon || ""} onChange={e => setF("icon", e.target.value)} />}
                </div>
              )}

              <div><label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 4, display: "block" }}>Assigned Member (optional)</label>
                <select className="select" style={{ width: "100%" }} value={form.member_id || ""} onChange={e => setF("member_id", e.target.value ? Number(e.target.value) : null)}>
                  <option value="">None</option>
                  {members.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>

              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
                <input type="checkbox" checked={!!form.is_default} onChange={e => setF("is_default", e.target.checked)} style={{ accentColor: "var(--accent)" }} />
                Set as default payment method
              </label>
            </div>
            <div style={{ padding: "13px 20px", borderTop: "1px solid var(--border-color)", display: "flex", justifyContent: "flex-end", gap: 8, flexShrink: 0 }}>
              <button className="btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={save} disabled={saving || !form.label}>{saving ? "Saving..." : editMethod ? "Save" : "Add Account"}</button>
            </div>
          </div>
        </div></ModalPortal>
      )}
    </div>
  );
}