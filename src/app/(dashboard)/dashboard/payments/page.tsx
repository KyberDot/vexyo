"use client";
import ModalPortal from "@/components/ModalPortal";
import { useState, useEffect, useRef, useMemo } from "react";
import { useSettings } from "@/lib/SettingsContext";
import { toMonthly, fmt, CURRENCIES, CURRENCY_SYMBOLS } from "@/types";
import { useSubscriptions } from "@/lib/useSubscriptions";
import AttachmentsPanel from "@/components/AttachmentsPanel";
import { useSearch } from "@/app/(dashboard)/layout";

const ACCOUNT_TYPES = [
  { value: "bank",     label: "Bank",         icon: "🏦",  group: "debit"  },
  { value: "chequing", label: "Chequing",     icon: "🏛️", group: "debit"  },
  { value: "savings",  label: "Savings",      icon: "🪙",  group: "debit"  },
  { value: "cash",     label: "Cash",         icon: "💵",  group: "debit"  },
  { value: "crypto",   label: "Crypto",       icon: "🔐",  group: "debit"  },
  { value: "paypal",   label: "PayPal",       icon: "🅿️", group: "debit"  },
  { value: "ewallet",  label: "E-Wallet",     icon: "📱",  group: "debit"  },
  { value: "other",    label: "Other",        icon: "💰",  group: "debit"  },
  { value: "credit",   label: "Credit Card",  icon: "💳",  group: "credit" },
  { value: "bnpl",     label: "Buy Now Pay Later", icon: "🛍️", group: "credit" },
  { value: "multicurrency", label: "Multi-Currency", icon: "🌍", group: "debit" },
];

let _cache: any[] | null = null;
let _membersCache: any[] | null = null;
let _cacheTime = 0;

export default function PaymentsPage() {
  const { currencySymbol, convertToDisplay, settings } = useSettings();
  const { subs } = useSubscriptions();
  const [methods, setMethods] = useState<any[]>(_cache || []);
  const [members, setMembers] = useState<any[]>(_membersCache || []);
  const [showModal, setShowModal] = useState(false);
  const [editMethod, setEditMethod] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const { search } = useSearch();
  const [activeTab, setActiveTab] = useState<"all" | "debit" | "credit">("all");
  const [balanceAction, setBalanceAction] = useState<{ id: number; type: "add" | "remove" | "owed" | "paid" } | null>(null);
  const [balanceDelta, setBalanceDelta] = useState("");
  const [iconMode, setIconMode] = useState<"auto" | "upload" | "url">("auto");
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<any>({
    label: "", account_type: "bank", last4: "", icon: "",
    currency: settings.currency || "USD",
    balance_currency: settings.currency || "USD",
    balance: "", member_id: null, is_default: false,
    credit_limit: "", bnpl_owed: "", bnpl_paid: "", bnpl_limit: "", bnpl_flexible: false,
  });

  const load = async (force = false) => {
    if (!force && _cache && _membersCache && Date.now() - _cacheTime < 30000) return;
    const [mr, fmr] = await Promise.all([
      fetch("/api/payment-methods").then(r => r.json()),
      fetch("/api/family-members").then(r => r.json()),
    ]);
    const mArr = Array.isArray(mr) ? mr.map((m: any) => ({ ...m, is_default: !!m.is_default })) : [];
    const fArr = Array.isArray(fmr) ? fmr : [];
    _cache = mArr; _membersCache = fArr; _cacheTime = Date.now();
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
      credit_limit: "", bnpl_owed: "", bnpl_paid: "", bnpl_limit: "", bnpl_flexible: false,
    });
    setIconMode("auto");
    setShowModal(true);
  };

  const openEdit = (m: any) => {
    setEditMethod(m);
    setForm({
      ...m,
      balance: m.balance != null ? String(m.balance) : "",
      balance_currency: m.balance_currency || m.currency || settings.currency || "USD",
      credit_limit: m.credit_limit != null ? String(m.credit_limit) : "",
      bnpl_owed: m.bnpl_owed != null ? String(m.bnpl_owed) : "",
      bnpl_paid: m.bnpl_paid != null ? String(m.bnpl_paid) : "",
      bnpl_limit: m.bnpl_limit != null ? String(m.bnpl_limit) : "",
      bnpl_flexible: !!m.bnpl_flexible,
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
      balance_currency: form.balance_currency || form.currency || settings.currency || "USD",
      icon: iconMode === "auto" ? (at?.icon || "💰") : (form.icon || at?.icon || "💰"),
      balance: Number(form.balance) || 0,
      is_default: !!form.is_default,
      credit_limit: form.account_type === "credit" ? (Number(form.credit_limit) || 0) : null,
      bnpl_owed: form.account_type === "bnpl" ? (Number(form.bnpl_owed) || 0) : null,
      bnpl_paid: form.account_type === "bnpl" ? (Number(form.bnpl_paid) || 0) : null,
      bnpl_limit: form.account_type === "bnpl" ? (form.bnpl_flexible ? null : (Number(form.bnpl_limit) || null)) : null,
      bnpl_flexible: form.account_type === "bnpl" ? (form.bnpl_flexible ? 1 : 0) : 0,
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
    if (_cache) _cache = _cache.filter(m => m.id !== id);
  };

  const updateBalance = async (m: any) => {
    const delta = Number(balanceDelta);
    if (!delta || !balanceAction) return;
    let body: any = {};
    if (balanceAction.type === "add") {
      body = { balance: (Number(m.balance) || 0) + delta };
    } else if (balanceAction.type === "remove") {
      body = { balance: Math.max(0, (Number(m.balance) || 0) - delta) };
    } else if (balanceAction.type === "owed") {
      body = { bnpl_owed: (Number(m.bnpl_owed) || 0) + delta };
    } else if (balanceAction.type === "paid") {
      const newPaid = (Number(m.bnpl_paid) || 0) + delta;
      const newOwed = Math.max(0, (Number(m.bnpl_owed) || 0) - delta);
      body = { bnpl_paid: newPaid, bnpl_owed: newOwed };
    }
    await fetch(`/api/payment-methods/${m.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
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

  const totalBalance = methods
    .filter(m => ACCOUNT_TYPES.find(a => a.value === m.account_type)?.group === "debit")
    .reduce((a, m) => a + convertToDisplay(Number(m.balance) || 0, m.balance_currency || m.currency || "USD"), 0);

  const totalCredit = methods
    .filter(m => m.account_type === "credit")
    .reduce((a, m) => a + convertToDisplay(Number(m.balance) || 0, m.currency || "USD"), 0);

  const totalCreditLimit = methods
    .filter(m => m.account_type === "credit")
    .reduce((a, m) => a + convertToDisplay(Number(m.credit_limit) || 0, m.currency || "USD"), 0);

  const totalBnplOwed = methods
    .filter(m => m.account_type === "bnpl")
    .reduce((a, m) => a + convertToDisplay(Number(m.bnpl_owed) || 0, m.currency || "USD"), 0);

  const filtered = useMemo(() => {
    return methods
      .filter(m => {
        const at = ACCOUNT_TYPES.find(a => a.value === m.account_type);
        if (activeTab === "debit") return at?.group === "debit";
        if (activeTab === "credit") return at?.group === "credit";
        return true;
      })
      .filter(m => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          m.label?.toLowerCase().includes(q) ||
          m.account_type?.toLowerCase().includes(q) ||
          m.last4?.includes(q) ||
          m.currency?.toLowerCase().includes(q)
        );
      });
  }, [methods, activeTab, search]);

  const debitCount = methods.filter(m => ACCOUNT_TYPES.find(a => a.value === m.account_type)?.group === "debit").length;
  const creditCount = methods.filter(m => ACCOUNT_TYPES.find(a => a.value === m.account_type)?.group === "credit").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }} className="fade-in">

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Wallet</h1>
          <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 2 }}>Manage accounts and balances</p>
        </div>
        <button className="btn-primary" onClick={openAdd}>+ Add Account</button>
      </div>

      {/* Stat cards */}
      {methods.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
          <div className="card">
            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 5 }}>Total Accounts</div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{methods.length}</div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{debitCount} debit · {creditCount} credit</div>
          </div>
          <div className="card">
            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 5 }}>Debit Balance</div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{currencySymbol}{fmt(totalBalance)}</div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>across debit accounts</div>
          </div>
          <div className="card">
            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 5 }}>Credit Used</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: totalCredit > 0 ? "#F59E0B" : "var(--text)" }}>{currencySymbol}{fmt(totalCredit)}</div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
              {totalCreditLimit > 0 ? `of ${currencySymbol}${fmt(totalCreditLimit)} limit` : "no credit limit set"}
            </div>
          </div>
          <div className="card">
            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 5 }}>BNPL Owed</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: totalBnplOwed > 0 ? "#EF4444" : "var(--text)" }}>{currencySymbol}{fmt(totalBnplOwed)}</div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>outstanding balance</div>
          </div>
        </div>
      )}

      {/* Tab switcher */}
      {methods.length > 0 && (
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ display: "flex", background: "var(--surface2)", borderRadius: 10, padding: 3, gap: 2 }}>
            {([["all", "All", methods.length], ["debit", "Debit", debitCount], ["credit", "Credit", creditCount]] as const).map(([tab, label, count]) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: activeTab === tab ? "var(--surface)" : "transparent", color: activeTab === tab ? "var(--text)" : "var(--muted)", fontSize: 13, fontWeight: activeTab === tab ? 700 : 400, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, transition: "all 0.15s" }}>
                {label}
                <span style={{ fontSize: 10, background: activeTab === tab ? "rgba(var(--accent-rgb),0.15)" : "transparent", color: activeTab === tab ? "var(--accent)" : "var(--muted)", borderRadius: 10, padding: "1px 6px", fontWeight: 700 }}>{count}</span>
              </button>
            ))}
          </div>
          {search && <span style={{ fontSize: 13, color: "var(--muted)", marginLeft: 4 }}>{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>}
        </div>
      )}

      {/* Empty state */}
      {methods.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 48 }}>
          <div style={{ fontSize: 38, marginBottom: 10 }}>🏦</div>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>No accounts yet</div>
          <div style={{ color: "var(--muted)", fontSize: 13, marginBottom: 16 }}>Add bank accounts, wallets, or payment cards</div>
          <button className="btn-primary" onClick={openAdd}>Add First Account</button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 36 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🔍</div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>No accounts found</div>
          <div style={{ color: "var(--muted)", fontSize: 13 }}>Try a different search or filter</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
          {filtered.map(m => {
            const at = ACCOUNT_TYPES.find(a => a.value === m.account_type) || ACCOUNT_TYPES[ACCOUNT_TYPES.length - 1];
            const balSym = CURRENCY_SYMBOLS[m.balance_currency || m.currency] || currencySymbol;
            const hasCustomIcon = m.icon && (m.icon.startsWith("data:") || m.icon.startsWith("http"));
            const spend = getMethodSpend(m.id);
            const isCredit = m.account_type === "credit";
            const isBnpl = m.account_type === "bnpl";
            const isDebit = !isCredit && !isBnpl;

            // Credit calculations
            const creditUsed = Number(m.balance) || 0;
            const creditLimit = Number(m.credit_limit) || 0;
            const creditAvailable = creditLimit - creditUsed;
            const creditPct = creditLimit > 0 ? (creditUsed / creditLimit) * 100 : 0;
            const creditColor = creditPct > 80 ? "#EF4444" : creditPct > 50 ? "#F59E0B" : creditPct > 0 ? "#F59E0B" : "var(--muted)";

            // BNPL calculations
            const bnplOwed = Number(m.bnpl_owed) || 0;
            const bnplPaid = Number(m.bnpl_paid) || 0;
            const bnplTotal = bnplOwed + bnplPaid;
            const bnplLimit = m.bnpl_flexible ? null : (Number(m.bnpl_limit) || null);
            const bnplPct = bnplTotal > 0 ? Math.min(100, (bnplPaid / bnplTotal) * 100) : 0;
            const bnplUsedPct = bnplLimit ? Math.min(100, (bnplOwed / bnplLimit) * 100) : 0;
            const bnplLimitColor = bnplUsedPct > 80 ? "#EF4444" : bnplUsedPct > 50 ? "#F59E0B" : "#10B981";

            return (
              <div key={m.id} className="card" style={{ display: "flex", flexDirection: "column", gap: 0, padding: 0, overflow: "hidden" }}>

                {/* Card header */}
                <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border-color)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--surface2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, overflow: "hidden", flexShrink: 0 }}>
                      {hasCustomIcon
                        ? <img src={m.icon} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" onError={e => ((e.currentTarget as HTMLElement).style.display = "none")} />
                        : (m.icon && m.icon.length <= 4 ? m.icon : at.icon)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
                        {m.label}
                        {m.is_default && <span style={{ background: "rgba(var(--accent-rgb),0.12)", color: "var(--accent)", fontSize: 9, borderRadius: 4, padding: "1px 5px", fontWeight: 800 }}>DEFAULT</span>}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--muted)" }}>{at.label}{m.last4 ? ` •••• ${m.last4}` : ""}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--muted)", textAlign: "right" }}>
                    <div>{m.currency || "USD"}</div>
                    {spend > 0 && <div style={{ color: "var(--text)", fontWeight: 600 }}>{currencySymbol}{fmt(spend)}/mo</div>}
                  </div>
                </div>

                {/* Balance section — debit */}
                {isDebit && (
                  <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 2 }}>Balance</div>
                        <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.5px" }}>
                          {balSym}{fmt(m.balance || 0)}
                        </div>
                        {(m.balance_currency || m.currency) !== settings.currency && (
                          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 1 }}>
                            ≈ {currencySymbol}{fmt(convertToDisplay(m.balance || 0, m.balance_currency || m.currency))}
                          </div>
                        )}
                      </div>
                    </div>
                    {balanceAction?.id === m.id ? (
                      <div style={{ display: "flex", gap: 6 }}>
                        <input className="input" type="number" step="0.01" min="0"
                          placeholder={`Amount to ${balanceAction?.type ?? "adjust"}`}
                          value={balanceDelta} onChange={e => setBalanceDelta(e.target.value)}
                          autoFocus style={{ flex: 1, height: 34, fontSize: 13 }} />
                        <button onClick={() => updateBalance(m)} className="btn-primary" style={{ padding: "0 12px", fontSize: 13, height: 34, flexShrink: 0 }}>OK</button>
                        <button onClick={() => setBalanceAction(null)} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 16, padding: "0 4px" }}>✕</button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => { setBalanceAction({ id: m.id, type: "add" }); setBalanceDelta(""); }}
                          style={{ flex: 1, padding: "6px 0", borderRadius: 7, border: "1px solid rgba(16,185,129,0.3)", background: "rgba(16,185,129,0.07)", color: "#10B981", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
                          + Add
                        </button>
                        <button onClick={() => { setBalanceAction({ id: m.id, type: "remove" }); setBalanceDelta(""); }}
                          style={{ flex: 1, padding: "6px 0", borderRadius: 7, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.07)", color: "#EF4444", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
                          − Remove
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Balance section — credit */}
                {isCredit && (
                  <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 2 }}>Used</div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: creditUsed > 0 ? creditColor : "var(--text)" }}>{balSym}{fmt(creditUsed)}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 2 }}>Available</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: creditAvailable < 0 ? "#EF4444" : "#10B981" }}>{creditAvailable < 0 ? "-" : ""}{balSym}{fmt(Math.abs(creditAvailable))}</div>
                        {creditLimit > 0 && <div style={{ fontSize: 10, color: "var(--muted)" }}>of {balSym}{fmt(creditLimit)} limit</div>}
                      </div>
                    </div>
                    {creditLimit > 0 && (
                      <div>
                        <div style={{ height: 6, background: "var(--surface2)", borderRadius: 3, overflow: "hidden" }}>
                          <div style={{ width: `${Math.min(100, creditPct)}%`, height: "100%", background: creditPct > 100 ? "#EF4444" : creditColor, borderRadius: 3, transition: "width 0.4s ease" }} />
                        </div>
                        <div style={{ fontSize: 10, color: creditPct > 100 ? "#EF4444" : "var(--muted)", marginTop: 3, fontWeight: creditPct > 100 ? 700 : 400 }}>
                          {creditPct > 100 ? `⚠ ${creditPct.toFixed(0)}% — over limit` : `${creditPct.toFixed(0)}% used`}
                        </div>
                      </div>
                    )}
                    {balanceAction?.id === m.id ? (
                      <div style={{ display: "flex", gap: 6 }}>
                        <input className="input" type="number" step="0.01" min="0"
                          placeholder="Amount"
                          value={balanceDelta} onChange={e => setBalanceDelta(e.target.value)}
                          autoFocus style={{ flex: 1, height: 34, fontSize: 13 }} />
                        <button onClick={() => updateBalance(m)} className="btn-primary" style={{ padding: "0 12px", fontSize: 13, height: 34, flexShrink: 0 }}>OK</button>
                        <button onClick={() => setBalanceAction(null)} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 16, padding: "0 4px" }}>✕</button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => { setBalanceAction({ id: m.id, type: "add" }); setBalanceDelta(""); }}
                          style={{ flex: 1, padding: "6px 0", borderRadius: 7, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.07)", color: "#EF4444", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
                          + Charge
                        </button>
                        <button onClick={() => { setBalanceAction({ id: m.id, type: "remove" }); setBalanceDelta(""); }}
                          style={{ flex: 1, padding: "6px 0", borderRadius: 7, border: "1px solid rgba(16,185,129,0.3)", background: "rgba(16,185,129,0.07)", color: "#10B981", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
                          − Pay Off
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Balance section — BNPL */}
                {isBnpl && (
                  <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 2 }}>Owed</div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: bnplOwed > 0 ? "#EF4444" : "var(--text)" }}>{balSym}{fmt(bnplOwed)}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 2 }}>Paid</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: "#10B981" }}>{balSym}{fmt(bnplPaid)}</div>
                      </div>
                    </div>

                    {/* Limit bar — if limit set */}
                    {bnplLimit ? (
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--muted)", marginBottom: 3 }}>
                          <span>Limit: {balSym}{fmt(bnplLimit)}</span>
                          <span style={{ color: bnplLimitColor }}>{bnplUsedPct.toFixed(0)}% used</span>
                        </div>
                        <div style={{ height: 6, background: "var(--surface2)", borderRadius: 3, overflow: "hidden" }}>
                          <div style={{ width: `${bnplUsedPct}%`, height: "100%", background: bnplLimitColor, borderRadius: 3, transition: "width 0.4s ease" }} />
                        </div>
                        <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>
                          {balSym}{fmt(Math.max(0, bnplLimit - bnplOwed))} available
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: 10, color: "var(--muted)", display: "flex", alignItems: "center", gap: 4 }}>
                        <span>♾️</span> Flexible limit
                      </div>
                    )}

                    {/* Repayment progress */}
                    {bnplTotal > 0 && (
                      <div>
                        <div style={{ height: 4, background: "var(--surface2)", borderRadius: 2, overflow: "hidden" }}>
                          <div style={{ width: `${bnplPct}%`, height: "100%", background: "#10B981", borderRadius: 2, transition: "width 0.4s ease" }} />
                        </div>
                        <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>{bnplPct.toFixed(0)}% repaid of total</div>
                      </div>
                    )}

                    {balanceAction?.id === m.id ? (
                      <div style={{ display: "flex", gap: 6 }}>
                        <input className="input" type="number" step="0.01" min="0"
                          placeholder="Amount"
                          value={balanceDelta} onChange={e => setBalanceDelta(e.target.value)}
                          autoFocus style={{ flex: 1, height: 34, fontSize: 13 }} />
                        <button onClick={() => updateBalance(m)} className="btn-primary" style={{ padding: "0 12px", fontSize: 13, height: 34, flexShrink: 0 }}>OK</button>
                        <button onClick={() => setBalanceAction(null)} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 16, padding: "0 4px" }}>✕</button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => { setBalanceAction({ id: m.id, type: "owed" }); setBalanceDelta(""); }}
                          style={{ flex: 1, padding: "6px 0", borderRadius: 7, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.07)", color: "#EF4444", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
                          + Add Owed
                        </button>
                        <button onClick={() => { setBalanceAction({ id: m.id, type: "paid" }); setBalanceDelta(""); }}
                          style={{ flex: 1, padding: "6px 0", borderRadius: 7, border: "1px solid rgba(16,185,129,0.3)", background: "rgba(16,185,129,0.07)", color: "#10B981", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
                          ✓ Mark Paid
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Footer actions */}
                <div style={{ padding: "10px 16px", borderTop: "1px solid var(--border-color)", display: "flex", gap: 6, alignItems: "center" }}>
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

      {/* Add/Edit Modal */}
      {showModal && (
        <ModalPortal>
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
            <div onClick={e => e.stopPropagation()} style={{ background: "var(--surface)", borderRadius: 16, width: "100%", maxWidth: 500, maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden", border: "1px solid var(--border-color)", boxShadow: "0 20px 50px rgba(0,0,0,0.5)" }}>

              <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 18 }}>{editMethod ? "Edit Account" : "Add Account"}</div>
                <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 22 }}>✕</button>
              </div>

              <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20 }}>

                {/* Account type — grouped */}
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", marginBottom: 8, display: "block", textTransform: "uppercase", letterSpacing: "0.05em" }}>Debit Accounts</label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginBottom: 14 }}>
                    {ACCOUNT_TYPES.filter(a => a.group === "debit").map(at => (
                      <button key={at.value} type="button" onClick={() => setF("account_type", at.value)}
                        style={{ padding: "10px 4px", borderRadius: 9, border: `2px solid ${form.account_type === at.value ? "var(--accent)" : "var(--border-color)"}`, background: form.account_type === at.value ? "rgba(var(--accent-rgb),0.1)" : "var(--surface2)", color: form.account_type === at.value ? "var(--accent)" : "var(--text)", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                        <span style={{ fontSize: 18 }}>{at.icon}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, textAlign: "center", lineHeight: 1.2 }}>{at.label}</span>
                      </button>
                    ))}
                  </div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", marginBottom: 8, display: "block", textTransform: "uppercase", letterSpacing: "0.05em" }}>Credit Accounts</label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6 }}>
                    {ACCOUNT_TYPES.filter(a => a.group === "credit").map(at => (
                      <button key={at.value} type="button" onClick={() => setF("account_type", at.value)}
                        style={{ padding: "10px 4px", borderRadius: 9, border: `2px solid ${form.account_type === at.value ? "var(--accent)" : "var(--border-color)"}`, background: form.account_type === at.value ? "rgba(var(--accent-rgb),0.1)" : "var(--surface2)", color: form.account_type === at.value ? "var(--accent)" : "var(--text)", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
                        <span style={{ fontSize: 18 }}>{at.icon}</span>
                        <span style={{ fontSize: 11, fontWeight: 700 }}>{at.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Basic info */}
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 5, display: "block" }}>Account Name *</label>
                    <input className="input" placeholder={form.account_type === "bnpl" ? "e.g. Klarna" : "e.g. Main Bank Account"} value={form.label} onChange={e => setF("label", e.target.value)} autoFocus />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 5, display: "block" }}>Last 4 digits</label>
                      <input className="input" placeholder="1234" maxLength={4} value={form.last4 || ""} onChange={e => setF("last4", e.target.value.replace(/\D/g, "").slice(0, 4))} />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 5, display: "block" }}>Currency</label>
                      <select className="select" style={{ width: "100%" }} value={form.currency}
                        onChange={e => setForm((p: any) => ({ ...p, currency: e.target.value, balance_currency: e.target.value }))}>
                        {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Balance fields — varies by type */}
                <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "16px", background: "rgba(255,255,255,0.02)", borderRadius: 10, border: "1px solid var(--border-color)" }}>
                  {form.account_type === "credit" ? (
                    <>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 5, display: "block" }}>Credit Limit</label>
                        <input className="input" type="number" step="0.01" min="0" placeholder="e.g. 5000.00" value={form.credit_limit || ""} onChange={e => setF("credit_limit", e.target.value)} />
                      </div>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 5, display: "block" }}>Current Balance Used</label>
                        <input className="input" type="number" step="0.01" min="0" placeholder="0.00" value={form.balance || ""} onChange={e => setF("balance", e.target.value)} />
                      </div>
                    </>
                  ) : form.account_type === "bnpl" ? (
                    <>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 8, display: "block" }}>Spending Limit</label>
                        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: 10, fontSize: 13 }}>
                          <input type="checkbox" checked={!!form.bnpl_flexible} onChange={e => setF("bnpl_flexible", e.target.checked)} style={{ width: 15, height: 15, accentColor: "var(--accent)" }} />
                          <span style={{ fontWeight: 500 }}>♾️ Flexible / Open limit</span>
                        </label>
                        {!form.bnpl_flexible && (
                          <input className="input" type="number" step="0.01" min="0" placeholder="e.g. 1000.00" value={form.bnpl_limit || ""} onChange={e => setF("bnpl_limit", e.target.value)} />
                        )}
                      </div>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 5, display: "block" }}>Amount Owed</label>
                        <input className="input" type="number" step="0.01" min="0" placeholder="0.00" value={form.bnpl_owed || ""} onChange={e => setF("bnpl_owed", e.target.value)} />
                      </div>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 5, display: "block" }}>Amount Paid So Far</label>
                        <input className="input" type="number" step="0.01" min="0" placeholder="0.00" value={form.bnpl_paid || ""} onChange={e => setF("bnpl_paid", e.target.value)} />
                      </div>
                    </>
                  ) : (
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 5, display: "block" }}>
                        {form.account_type === "multicurrency" ? "Primary Balance" : "Opening Balance"}
                      </label>
                      <input className="input" type="number" step="0.01" min="0" placeholder="0.00" value={form.balance || ""} onChange={e => setF("balance", e.target.value)} />
                    </div>
                  )}
                </div>

                {/* Icon */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 10, display: "block" }}>Brand Icon</label>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <div style={{ width: 48, height: 48, borderRadius: 10, background: "var(--surface2)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", border: "1px solid var(--border-color)", flexShrink: 0 }}>
                      {form.icon?.startsWith("http") || form.icon?.startsWith("data:")
                        ? <img src={form.icon} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
                        : <span style={{ fontSize: 24 }}>{ACCOUNT_TYPES.find(a => a.value === form.account_type)?.icon || "💳"}</span>}
                    </div>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                      <div style={{ display: "flex", gap: 5 }}>
                        {(["auto", "upload", "url"] as const).map(md => (
                          <button key={md} type="button" onClick={() => setIconMode(md)}
                            style={{ padding: "4px 9px", borderRadius: 6, fontSize: 11, border: iconMode === md ? "1px solid var(--accent)" : "1px solid var(--border-color)", background: iconMode === md ? "rgba(var(--accent-rgb),0.1)" : "transparent", color: iconMode === md ? "var(--accent)" : "var(--muted)", fontWeight: 700, cursor: "pointer" }}>
                            {md.toUpperCase()}
                          </button>
                        ))}
                      </div>
                      {iconMode === "url" && <input className="input" style={{ height: 32, fontSize: 12 }} placeholder="https://logo.url" value={form.icon || ""} onChange={e => setF("icon", e.target.value)} />}
                      {iconMode === "upload" && (
                        <>
                          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleIconUpload} />
                          <button type="button" className="btn-ghost" style={{ fontSize: 12, padding: "4px 10px", alignSelf: "flex-start" }} onClick={() => fileRef.current?.click()}>
                            {form.icon?.startsWith("data:") ? "✓ Uploaded — Change" : "⬆ Choose Image"}
                          </button>
                        </>
                      )}
                      {iconMode === "auto" && <div style={{ fontSize: 11, color: "var(--muted)" }}>Using default icon</div>}
                    </div>
                  </div>
                </div>

                <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 14, fontWeight: 500 }}>
                  <input type="checkbox" checked={!!form.is_default} onChange={e => setF("is_default", e.target.checked)} style={{ width: 16, height: 16, accentColor: "var(--accent)" }} />
                  Set as default payment method
                </label>
              </div>

              <div style={{ padding: "14px 24px", borderTop: "1px solid var(--border-color)", display: "flex", justifyContent: "flex-end", gap: 10, background: "var(--surface2)", flexShrink: 0 }}>
                <button className="btn-ghost" onClick={() => setShowModal(false)} style={{ fontWeight: 600 }}>Cancel</button>
                <button className="btn-primary" onClick={save} disabled={saving || !form.label} style={{ padding: "10px 24px", fontWeight: 700 }}>{saving ? "Saving..." : "Save Account"}</button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
