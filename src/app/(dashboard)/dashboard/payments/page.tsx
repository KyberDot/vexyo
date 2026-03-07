"use client";
import ModalPortal from "@/components/ModalPortal";
import { useState, useEffect, useRef } from "react";
import { useSettings } from "@/lib/SettingsContext";
import { toMonthly, fmt, CURRENCIES, CURRENCY_SYMBOLS } from "@/types";
import { useSubscriptions } from "@/lib/useSubscriptions";
import AttachmentsPanel from "@/components/AttachmentsPanel";

const ACCOUNT_TYPES = [
  { value: "bank",     label: "Bank Account",    icon: "🏦" },
  { value: "chequing", label: "Chequing Account", icon: "🏛️" },
  { value: "savings",  label: "Savings Account",  icon: "🪙" },
  { value: "crypto",   label: "Crypto Wallet",    icon: "🔐" },
  { value: "paypal",   label: "PayPal",           icon: "🅿️" },
  { value: "ewallet",  label: "E-wallet",         icon: "📱" },
  { value: "credit",   label: "Credit Account",   icon: "💳" },
  { value: "cash",     label: "Cash",             icon: "💵" },
  { value: "other",    label: "Other",            icon: "💰" },
];

let _methodsCache: any[] | null = null;
let _methodsMembers: any[] | null = null;
let _methodsTime = 0;

export default function PaymentsPage() {
  const { currencySymbol, convertToDisplay, settings } = useSettings();
  const { subs } = useSubscriptions();
  const [methods, setMethods] = useState<any[]>(_methodsCache || []);
  const [members, setMembers] = useState<any[]>(_methodsMembers || []);
  const [showModal, setShowModal] = useState(false);
  const [editMethod, setEditMethod] = useState<any>(null);
  const [form, setForm] = useState<any>({
    label: "", account_type: "bank", last4: "", icon: "",
    currency: settings.currency || "USD",
    balance_currency: settings.currency || "USD",
    balance: "", member_id: null, is_default: false,
  });
  const [saving, setSaving] = useState(false);
  const [iconMode, setIconMode] = useState<"auto" | "upload" | "url">("auto");
  const [balanceAction, setBalanceAction] = useState<{ id: number; type: "add" | "remove" } | null>(null);
  const [balanceDelta, setBalanceDelta] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async (force = false) => {
    if (!force && _methodsCache && _methodsMembers && Date.now() - _methodsTime < 30000) return;
    const [mr, fmr] = await Promise.all([
      fetch("/api/payment-methods").then(r => r.json()),
      fetch("/api/family-members").then(r => r.json()),
    ]);
    const mArr = Array.isArray(mr) ? mr.map((m: any) => ({ ...m, is_default: !!m.is_default })) : [];
    const fArr = Array.isArray(fmr) ? fmr : [];
    _methodsCache = mArr; _methodsMembers = fArr; _methodsTime = Date.now();
    setMethods(mArr); setMembers(fArr);
  };

  useEffect(() => { load(); }, []);

  const setF = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const openAdd = () => {
    setEditMethod(null);
    setForm({
      label: "", account_type: "bank", last4: "", icon: "",
      currency: settings.currency || "USD",
      balance_currency: settings.currency || "USD",
      balance: "", member_id: null, is_default: false,
    });
    setIconMode("auto");
    setShowModal(true);
  };

  const openEdit = (m: any) => {
    setEditMethod(m);
    setForm({
      ...m,
      balance: m.balance != null ? String(m.balance) : "",
      // FIX: explicitly carry balance_currency from the saved record
      balance_currency: m.balance_currency || m.currency || settings.currency || "USD",
    });
    setIconMode(m.icon?.startsWith("data:") ? "upload" : m.icon?.startsWith("http") ? "url" : "auto");
    setShowModal(true);
  };

  const save = async () => {
    setSaving(true);
    const at = ACCOUNT_TYPES.find(a => a.value === form.account_type);
    const body = {
      ...form,
      currency: form.currency || settings.currency || "USD",
      // FIX: balance_currency always mirrors whatever currency was selected
      balance_currency: form.balance_currency || form.currency || settings.currency || "USD",
      icon: iconMode === "auto" ? (at?.icon || "💰") : (form.icon || at?.icon || "💰"),
      balance: Number(form.balance) || 0,
      is_default: !!form.is_default,
    };
    const url = editMethod ? `/api/payment-methods/${editMethod.id}` : "/api/payment-methods";
    const method = editMethod ? "PATCH" : "POST";
    await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    await load(true);
    setShowModal(false);
    setSaving(false);
  };

  const setDefault = async (id: number) => {
    await fetch(`/api/payment-methods/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_default: true }) });
    await load(true);
  };

  const del = async (id: number, label: string) => {
    if (!confirm(`Delete "${label}"?`)) return;
    await fetch(`/api/payment-methods/${id}`, { method: "DELETE" });
    setMethods(p => p.filter(m => m.id !== id));
  };

  const updateBalance = async (m: any) => {
    const delta = Number(balanceDelta);
    if (!delta || !balanceAction) return;
    const newBalance = balanceAction.type === "add"
      ? (m.balance || 0) + delta
      : Math.max(0, (m.balance || 0) - delta);
    await fetch(`/api/payment-methods/${m.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ balance: newBalance }) });
    setBalanceDelta(""); setBalanceAction(null);
    await load(true);
  };

  const handleIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const r = new FileReader();
    r.onload = ev => setF("icon", ev.target?.result as string);
    r.readAsDataURL(file);
  };

  const getMethodSpend = (methodId: number) =>
    subs.filter(s => s.active && s.payment_method_id === methodId)
      .reduce((a, s) => a + convertToDisplay(toMonthly(s.amount, s.cycle), s.currency), 0);

  const totalBalance = methods.reduce((a, m) => {
    return a + convertToDisplay(Number(m.balance) || 0, m.balance_currency || m.currency || "USD");
  }, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }} className="fade-in">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Wallet</h1>
          <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 2 }}>Manage accounts and balances</p>
        </div>
        <button className="btn-primary" onClick={openAdd}>+ Add Account</button>
      </div>

      {methods.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
          {[
            ["Accounts", String(methods.length), "total"],
            ["Monthly Spend", currencySymbol + fmt(methods.reduce((a, m) => a + getMethodSpend(m.id), 0)), "across all methods"],
            ["Total Balance", currencySymbol + fmt(totalBalance), "converted to " + settings.currency],
          ].map(([l, v, s]) => (
            <div key={l} className="card">
              <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 5 }}>{l}</div>
              <div style={{ fontSize: 20, fontWeight: 800 }}>{v}</div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{s}</div>
            </div>
          ))}
        </div>
      )}

      {methods.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 48 }}>
          <div style={{ fontSize: 38, marginBottom: 10 }}>🏦</div>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>No accounts yet</div>
          <div style={{ color: "var(--muted)", fontSize: 13, marginBottom: 16 }}>Add bank accounts, wallets, or payment cards</div>
          <button className="btn-primary" onClick={openAdd}>Add First Account</button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
          {methods.map(m => {
            const spend = getMethodSpend(m.id);
            const at = ACCOUNT_TYPES.find(a => a.value === m.account_type) || ACCOUNT_TYPES[ACCOUNT_TYPES.length - 1];
            const balSym = CURRENCY_SYMBOLS[m.balance_currency || m.currency] || currencySymbol;
            const hasCustomIcon = m.icon && (m.icon.startsWith("data:") || m.icon.startsWith("http"));

            return (
              <div key={m.id} className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: "var(--surface2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, overflow: "hidden", flexShrink: 0 }}>
                      {hasCustomIcon
                        ? <img src={m.icon} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" onError={e => ((e.currentTarget as HTMLElement).style.display = "none")} />
                        : (m.icon && m.icon.length <= 4 ? m.icon : at.icon)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{m.label}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>{at.label}{m.last4 ? ` •••• ${m.last4}` : ""}</div>
                    </div>
                  </div>
                  {m.is_default && (
                    <span style={{ background: "rgba(var(--accent-rgb),0.1)", color: "var(--accent)", fontSize: 10, borderRadius: 5, padding: "2px 7px", fontWeight: 700, flexShrink: 0 }}>DEFAULT</span>
                  )}
                </div>

                <div style={{ padding: "12px 14px", background: "var(--surface2)", borderRadius: 10 }}>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>Balance ({m.balance_currency || m.currency || "USD"})</div>
                  <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>
                    {balSym}{fmt(m.balance || 0)}
                    {(m.balance_currency || m.currency) && (m.balance_currency || m.currency) !== settings.currency && (
                      <span style={{ fontSize: 13, color: "var(--muted)", marginLeft: 8, fontWeight: 600 }}>
                        ≈ {currencySymbol}{fmt(convertToDisplay(m.balance || 0, m.balance_currency || m.currency))}
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => { setBalanceAction({ id: m.id, type: "add" }); setBalanceDelta(""); }}
                      style={{ flex: 1, padding: "5px 0", borderRadius: 6, border: "1px solid rgba(16,185,129,0.3)", background: "rgba(16,185,129,0.08)", color: "#10B981", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
                      + Add
                    </button>
                    <button onClick={() => { setBalanceAction({ id: m.id, type: "remove" }); setBalanceDelta(""); }}
                      style={{ flex: 1, padding: "5px 0", borderRadius: 6, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)", color: "#EF4444", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
                      − Remove
                    </button>
                  </div>
                  {balanceAction?.id === m.id && (
                    <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                      <input className="input" type="number" step="0.01" min="0"
                        placeholder={`Amount to ${balanceAction?.type}`}
                        value={balanceDelta} onChange={e => setBalanceDelta(e.target.value)}
                        autoFocus style={{ flex: 1, height: 34, fontSize: 13 }} />
                      <button onClick={() => updateBalance(m)} className="btn-primary" style={{ padding: "0 12px", fontSize: 13, height: 34, flexShrink: 0 }}>OK</button>
                      <button onClick={() => setBalanceAction(null)} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 16, padding: "0 4px" }}>✕</button>
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>Monthly spend</div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{currencySymbol}{fmt(spend)}</div>
                </div>

                <div style={{ display: "flex", gap: 6, alignItems: "center", paddingTop: 4, borderTop: "1px solid var(--border-color)" }}>
                  <button className="btn-ghost" style={{ fontSize: 12, padding: "5px 10px" }} onClick={() => openEdit(m)}>✏️ Edit</button>
                  <AttachmentsPanel methodId={m.id} label="Docs" />
                  {!m.is_default && (
                    <button className="btn-ghost" style={{ fontSize: 12, padding: "5px 10px" }} onClick={() => setDefault(m.id)}>Set Default</button>
                  )}
                  <button onClick={() => del(m.id, m.label)}
                    style={{ background: "none", border: "none", color: "#EF4444", cursor: "pointer", fontSize: 15, padding: "5px 6px", marginLeft: "auto" }}>
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <ModalPortal>
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
            <div onClick={e => e.stopPropagation()} style={{ background: "var(--surface)", borderRadius: 16, width: "100%", maxWidth: 480, maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden", border: "1px solid var(--border-color)", boxShadow: "0 20px 50px rgba(0,0,0,0.5)" }}>

              <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 18 }}>{editMethod ? "Edit Account" : "Add Account"}</div>
                <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 22 }}>✕</button>
              </div>

              <div style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: 24 }}>
                <section>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", marginBottom: 12, display: "block", textTransform: "uppercase", letterSpacing: "0.05em" }}>Account Type</label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                    {ACCOUNT_TYPES.map(at => (
                      <button key={at.value} type="button" onClick={() => setF("account_type", at.value)}
                        style={{ padding: "12px 6px", borderRadius: 10, border: `2px solid ${form.account_type === at.value ? "var(--accent)" : "var(--border-color)"}`, background: form.account_type === at.value ? "rgba(var(--accent-rgb),0.1)" : "var(--surface2)", color: form.account_type === at.value ? "var(--accent)" : "var(--text)", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, transition: "all 0.2s" }}>
                        <span style={{ fontSize: 22 }}>{at.icon}</span>
                        <span style={{ fontSize: 11, fontWeight: 700 }}>{at.label}</span>
                      </button>
                    ))}
                  </div>
                </section>

                <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 5, display: "block" }}>Account Name *</label>
                    <input className="input" placeholder="e.g. Main Bank Account" value={form.label} onChange={e => setF("label", e.target.value)} autoFocus />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 5, display: "block" }}>Last 4 digits (optional)</label>
                    <input className="input" placeholder="1234" maxLength={4} value={form.last4 || ""} onChange={e => setF("last4", e.target.value.replace(/\D/g, "").slice(0, 4))} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 10, display: "block" }}>Brand Icon / Logo</label>
                    <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                      <div style={{ width: 52, height: 52, borderRadius: 12, background: "var(--surface2)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", border: "1px solid var(--border-color)", flexShrink: 0 }}>
                        {form.icon?.startsWith("http") || form.icon?.startsWith("data:")
                          ? <img src={form.icon} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
                          : <span style={{ fontSize: 26 }}>{ACCOUNT_TYPES.find(a => a.value === form.account_type)?.icon || "💳"}</span>}
                      </div>
                      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          {(["auto", "upload", "url"] as const).map(md => (
                            <button key={md} type="button" onClick={() => setIconMode(md)}
                              style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, border: iconMode === md ? "1px solid var(--accent)" : "1px solid var(--border-color)", background: iconMode === md ? "rgba(var(--accent-rgb),0.1)" : "transparent", color: iconMode === md ? "var(--accent)" : "var(--muted)", fontWeight: 700, cursor: "pointer" }}>
                              {md.toUpperCase()}
                            </button>
                          ))}
                        </div>
                        {iconMode === "url" && <input className="input" style={{ height: 34, fontSize: 12 }} placeholder="https://logo.url" value={form.icon || ""} onChange={e => setF("icon", e.target.value)} />}
                        {iconMode === "upload" && (
                          <>
                            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleIconUpload} />
                            <button type="button" className="btn-ghost" style={{ fontSize: 12, padding: "5px 10px", alignSelf: "flex-start" }} onClick={() => fileRef.current?.click()}>
                              {form.icon?.startsWith("data:") ? "✓ Uploaded — Change" : "⬆ Choose Image"}
                            </button>
                          </>
                        )}
                        {iconMode === "auto" && <div style={{ fontSize: 12, color: "var(--muted)" }}>Using default icon for selected type</div>}
                      </div>
                    </div>
                  </div>
                </section>

                <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, padding: "18px 20px", background: "rgba(255,255,255,0.02)", borderRadius: 12, border: "1px solid var(--border-color)" }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 5, display: "block" }}>Currency</label>
                    <select className="select" style={{ width: "100%" }} value={form.currency}
                      onChange={e => {
                        // FIX: update both currency and balance_currency together
                        setForm((p: any) => ({ ...p, currency: e.target.value, balance_currency: e.target.value }));
                      }}>
                      {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 5, display: "block" }}>Opening Balance</label>
                    <input className="input" type="number" step="0.01" min="0" placeholder="0.00" value={form.balance || ""} onChange={e => setF("balance", e.target.value)} />
                  </div>
                </section>

                <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer", fontSize: 14, fontWeight: 500 }}>
                  <input type="checkbox" checked={!!form.is_default} onChange={e => setF("is_default", e.target.checked)} style={{ width: 18, height: 18, accentColor: "var(--accent)" }} />
                  Set as default payment method
                </label>
              </div>

              <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border-color)", display: "flex", justifyContent: "flex-end", gap: 10, background: "var(--surface2)", flexShrink: 0 }}>
                <button className="btn-ghost" onClick={() => setShowModal(false)} style={{ fontWeight: 600 }}>Cancel</button>
                <button className="btn-primary" onClick={save} disabled={saving || !form.label} style={{ padding: "10px 28px", fontWeight: 700 }}>{saving ? "Saving..." : "Save Account"}</button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
