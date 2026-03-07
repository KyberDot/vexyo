"use client";
import ModalPortal from "@/components/ModalPortal";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useSettings } from "@/lib/SettingsContext";
import { fmt } from "@/types";
import AttachmentsPanel from "@/components/AttachmentsPanel";

const COLORS = ["#EF4444","#F97316","#F59E0B","#8B5CF6","#6366F1","#3B82F6","#10B981","#EC4899","#06B6D4"];
const ICONS_D = ["💸","🏦","🏠","🚗","💳","🎓","🏥","✈️","📱","💰","🔑","⚡"];

interface Debt {
  id: number; name: string; amount: number; currency: string; paid: number;
  icon?: string; color: string; member_id?: number; member_name?: string;
  company?: string; due_date?: string; notes?: string; active: boolean;
  term?: string;
}

let _debtsCache: Debt[] | null = null;
let _debtsMembers: any[] | null = null;
let _debtsTime = 0;

export default function DebtsPage() {
  const { currencySymbol, convertToDisplay, settings } = useSettings();
  const [debts, setDebts] = useState<Debt[]>(_debtsCache || []);
  const [members, setMembers] = useState<any[]>(_debtsMembers || []);
  const [loading, setLoading] = useState(!_debtsCache);
  const [showModal, setShowModal] = useState(false);
  const [editDebt, setEditDebt] = useState<Debt | null>(null);
  const [termFilter, setTermFilter] = useState<"all" | "short" | "long">("all");
  const [form, setForm] = useState<any>({
    name: "", amount: "", currency: settings.currency, paid: "0",
    icon: "💸", color: "#EF4444", member_id: null, company: "",
    due_date: "", notes: "", term: "short",
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (force = false) => {
    if (!force && _debtsCache && _debtsMembers && (Date.now() - _debtsTime < 30000)) {
      setLoading(false); return;
    }
    if (!_debtsCache) setLoading(true);
    try {
      const [dr, mr] = await Promise.all([
        fetch("/api/debts").then(r => r.json()),
        fetch("/api/family-members").then(r => r.json()),
      ]);
      const debtArr = Array.isArray(dr) ? dr.map((d: any) => ({ ...d, active: !!d.active })) : [];
      const memberArr = Array.isArray(mr) ? mr : [];
      _debtsCache = debtArr; _debtsMembers = memberArr; _debtsTime = Date.now();
      setDebts(debtArr); setMembers(memberArr);
    } catch (e) { console.error("Failed to load debts", e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditDebt(null);
    setForm({ name: "", amount: "", currency: settings.currency, paid: "0", icon: "💸", color: "#EF4444", member_id: null, company: "", due_date: "", notes: "", term: "short" });
    setShowModal(true);
  };

  const openEdit = (d: Debt) => {
    setEditDebt(d);
    setForm({ ...d, amount: String(d.amount), paid: String(d.paid), term: d.term || "short" });
    setShowModal(true);
  };

  const save = async () => {
    setSaving(true);
    const body = { ...form, amount: Number(form.amount), paid: Number(form.paid) };
    if (editDebt) await fetch(`/api/debts/${editDebt.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    else await fetch("/api/debts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    await load(true);
    setShowModal(false); setSaving(false);
  };

  const del = async (id: number, name: string) => {
    if (!confirm(`Delete debt "${name}"?`)) return;
    await fetch(`/api/debts/${id}`, { method: "DELETE" });
    const next = debts.filter(d => d.id !== id);
    _debtsCache = next; setDebts(next);
  };

  const activeDebts = debts.filter(d => d.active);

  // term filter — no fallback default, treat null/undefined as "short"
  const filtered = useMemo(() => {
    if (termFilter === "all") return activeDebts;
    return activeDebts.filter(d => (d.term ?? "short") === termFilter);
  }, [debts, termFilter]);

  const totalOwed    = activeDebts.reduce((a, d) => a + convertToDisplay(d.amount - d.paid, d.currency), 0);
  const totalDebt    = activeDebts.reduce((a, d) => a + convertToDisplay(d.amount, d.currency), 0);
  const totalPaid    = activeDebts.reduce((a, d) => a + convertToDisplay(d.paid, d.currency), 0);
  const overallPct   = totalDebt > 0 ? (totalPaid / totalDebt) * 100 : 0;
  const shortCount   = activeDebts.filter(d => (d.term ?? "short") === "short").length;
  const longCount    = activeDebts.filter(d => d.term === "long").length;
  const overdueCount = activeDebts.filter(d => d.due_date && new Date(d.due_date) < new Date() && (d.amount - d.paid) > 0).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }} className="fade-in">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Debts</h1>
          <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 2 }}>Track what you owe and monitor your progress</p>
        </div>
        <button className="btn-primary" onClick={openAdd}>+ Add Debt</button>
      </div>

      {/* 5 stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
        <div className="card">
          <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>Total Owed</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#EF4444" }}>{currencySymbol}{fmt(totalOwed)}</div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{activeDebts.length} active debt{activeDebts.length !== 1 ? "s" : ""}</div>
        </div>
        <div className="card">
          <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>Total Debt</div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>{currencySymbol}{fmt(totalDebt)}</div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>original balance</div>
        </div>
        <div className="card">
          <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>Total Paid</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#10B981" }}>{currencySymbol}{fmt(totalPaid)}</div>
          <div style={{ marginTop: 6, height: 4, background: "var(--surface2)", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ width: `${overallPct}%`, height: "100%", background: "#10B981", borderRadius: 2 }} />
          </div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 3 }}>{overallPct.toFixed(0)}% overall</div>
        </div>
        <div className="card">
          <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>Short / Long Term</div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>{shortCount} <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 500 }}>/ {longCount}</span></div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>overview</div>
        </div>
        <div className="card">
          <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>Overdue</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: overdueCount > 0 ? "#EF4444" : "var(--text)" }}>{overdueCount}</div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{overdueCount > 0 ? "needs attention" : "all on track"}</div>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ display: "flex", background: "var(--surface2)", borderRadius: 8, padding: 3, gap: 2 }}>
          {(["all", "short", "long"] as const).map(tab => (
            <button key={tab} onClick={() => setTermFilter(tab)}
              style={{ padding: "5px 14px", borderRadius: 6, border: "none", background: termFilter === tab ? "var(--surface)" : "transparent", color: termFilter === tab ? "var(--text)" : "var(--muted)", fontSize: 12, fontWeight: termFilter === tab ? 600 : 400, cursor: "pointer" }}>
              {tab === "all" ? "All" : tab === "short" ? "Short Term" : "Long Term"}
            </button>
          ))}
        </div>
        <span style={{ fontSize: 13, color: "var(--muted)", marginLeft: "auto" }}>{filtered.length} debt{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {loading && !debts.length ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>Loading debts...</div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 48 }}>
          <div style={{ fontSize: 38, marginBottom: 10 }}>💸</div>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>{termFilter === "all" ? "No debts tracked" : `No ${termFilter}-term debts`}</div>
          <div style={{ color: "var(--muted)", fontSize: 13, marginBottom: 16 }}>Track loans, credit card debt, or money owed</div>
          {termFilter === "all" && <button className="btn-primary" onClick={openAdd}>Add First Debt</button>}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map(d => {
            const owed  = convertToDisplay(d.amount - d.paid, d.currency);
            const total = convertToDisplay(d.amount, d.currency);
            const pct   = total > 0 ? Math.min((convertToDisplay(d.paid, d.currency) / total) * 100, 100) : 0;
            const done  = pct >= 100;
            const isOverdue = d.due_date && new Date(d.due_date) < new Date() && !done;
            const isLong = d.term === "long";
            const termLabel = isLong ? "Long Term" : "Short Term";
            const termColor = isLong ? "#6366F1" : "#F59E0B";
            return (
              <div key={d.id} className="card" style={{ opacity: d.active && !done ? 1 : 0.65 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 10, background: d.color + "20", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0, overflow: "hidden" }}>
                    {d.icon && d.icon.startsWith("data:") ? <img src={d.icon} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" /> : d.icon || "💸"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 700, fontSize: 15 }}>{d.name}</span>
                      {done && <span className="badge" style={{ background: "rgba(16,185,129,0.1)", color: "#10B981", fontSize: 10 }}>Paid off</span>}
                      {isOverdue && <span className="badge" style={{ background: "rgba(239,68,68,0.12)", color: "#EF4444", fontSize: 10 }}>Overdue</span>}
                      <span style={{ fontSize: 10, background: termColor + "18", color: termColor, borderRadius: 5, padding: "2px 7px", fontWeight: 700 }}>{termLabel}</span>
                      {d.member_name && <span className="badge" style={{ background: "var(--surface2)", color: "var(--muted)", fontSize: 10 }}>{d.member_name}</span>}
                    </div>
                    {d.company && <div style={{ fontSize: 12, color: "var(--muted)" }}>{d.company}</div>}
                    {d.due_date && <div style={{ fontSize: 12, color: isOverdue ? "#EF4444" : "var(--muted)" }}>Due: {d.due_date}{isOverdue ? " — overdue" : ""}</div>}
                    <div style={{ marginTop: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5 }}>
                        <span style={{ color: "var(--muted)" }}>
                          {currencySymbol}{fmt(convertToDisplay(d.paid, d.currency))} paid
                          {d.currency !== settings.currency && <span style={{ fontSize: 11, marginLeft: 5 }}>({fmt(d.paid)} {d.currency})</span>}
                        </span>
                        <span style={{ fontWeight: 700, color: done ? "#10B981" : "#EF4444" }}>
                          {currencySymbol}{fmt(owed)} remaining
                          {d.currency !== settings.currency && <span style={{ fontSize: 11, fontWeight: 400, color: "var(--muted)", marginLeft: 5 }}>{fmt(d.amount - d.paid)} {d.currency}</span>}
                        </span>
                      </div>
                      <div style={{ height: 6, background: "var(--surface2)", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: done ? "#10B981" : d.color, borderRadius: 3, transition: "width 0.5s" }} />
                      </div>
                      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 3 }}>
                        {pct.toFixed(0)}% paid · {currencySymbol}{fmt(total)} total
                        {d.currency !== settings.currency && <span style={{ marginLeft: 5 }}>({fmt(d.amount)} {d.currency})</span>}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                    <AttachmentsPanel debtId={d.id} label="Files" />
                    <button onClick={() => openEdit(d)} style={{ background: "none", border: "1px solid var(--border-color)", borderRadius: 6, padding: "4px 8px", cursor: "pointer", color: "var(--muted)", fontSize: 12 }}>✏️</button>
                    <button onClick={() => del(d.id, d.name)} style={{ background: "none", border: "none", color: "#EF4444", cursor: "pointer", fontSize: 14, padding: 4 }}>🗑️</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <ModalPortal>
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(5px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
            <div onClick={e => e.stopPropagation()} style={{ background: "var(--surface)", borderRadius: 14, width: "100%", maxWidth: 480, maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden", border: "1px solid var(--border-color)" }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", flexShrink: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{editDebt ? "Edit Debt" : "Add Debt"}</div>
                <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 16 }}>✕</button>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: "18px 20px", display: "flex", flexDirection: "column", gap: 14 }}>

                {/* Icon + Color */}
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 50, height: 50, borderRadius: 12, background: form.color + "20", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0, overflow: "hidden" }}>
                    {form.icon?.startsWith("data:") ? <img src={form.icon} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" /> : form.icon || "💸"}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 6 }}>
                      {ICONS_D.map(ic => <button key={ic} type="button" onClick={() => setForm((p: any) => ({ ...p, icon: ic }))} style={{ width: 28, height: 28, borderRadius: 6, border: `1.5px solid ${form.icon === ic ? "var(--accent)" : "var(--border-color)"}`, background: "var(--surface2)", fontSize: 14, cursor: "pointer" }}>{ic}</button>)}
                    </div>
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                      {COLORS.map(c => <div key={c} onClick={() => setForm((p: any) => ({ ...p, color: c }))} style={{ width: 20, height: 20, borderRadius: 5, background: c, cursor: "pointer", border: form.color === c ? "2.5px solid var(--text)" : "2.5px solid transparent" }} />)}
                    </div>
                  </div>
                </div>

                {/* Term selector */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 6, display: "block" }}>Term Type</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    {([["short", "⚡ Short Term", "#F59E0B"], ["long", "📆 Long Term", "#6366F1"]] as const).map(([val, label, color]) => (
                      <button key={val} type="button" onClick={() => setForm((p: any) => ({ ...p, term: val }))}
                        style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: `2px solid ${form.term === val ? color : "var(--border-color)"}`, background: form.term === val ? color + "15" : "var(--surface2)", color: form.term === val ? color : "var(--muted)", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div><label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 4, display: "block" }}>Name *</label><input className="input" placeholder="e.g. Student Loan" value={form.name} onChange={e => setForm((p: any) => ({ ...p, name: e.target.value }))} /></div>
                  <div><label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 4, display: "block" }}>Company / Lender</label><input className="input" placeholder="e.g. Chase Bank" value={form.company || ""} onChange={e => setForm((p: any) => ({ ...p, company: e.target.value }))} /></div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                  <div><label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 4, display: "block" }}>Total Amount *</label><input className="input" type="number" min="0" step="0.01" placeholder="0.00" value={form.amount} onChange={e => setForm((p: any) => ({ ...p, amount: e.target.value }))} /></div>
                  <div><label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 4, display: "block" }}>Amount Paid</label><input className="input" type="number" min="0" step="0.01" placeholder="0.00" value={form.paid} onChange={e => setForm((p: any) => ({ ...p, paid: e.target.value }))} /></div>
                  <div><label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 4, display: "block" }}>Currency</label>
                    <select className="select" style={{ width: "100%" }} value={form.currency} onChange={e => setForm((p: any) => ({ ...p, currency: e.target.value }))}>
                      {["USD","EUR","GBP","CAD","AUD","EGP","JPY","INR"].map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div><label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 4, display: "block" }}>Due Date</label><input className="input" type="date" value={form.due_date || ""} onChange={e => setForm((p: any) => ({ ...p, due_date: e.target.value }))} /></div>
                  <div><label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 4, display: "block" }}>Assigned To</label>
                    <select className="select" style={{ width: "100%" }} value={form.member_id || ""} onChange={e => setForm((p: any) => ({ ...p, member_id: e.target.value ? Number(e.target.value) : null }))}>
                      <option value="">None</option>
                      {members.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
                </div>
                <div><label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 4, display: "block" }}>Notes</label><textarea className="input" placeholder="Details about this debt..." value={form.notes || ""} onChange={e => setForm((p: any) => ({ ...p, notes: e.target.value }))} style={{ minHeight: 70, resize: "vertical" }} /></div>
              </div>
              <div style={{ padding: "13px 20px", borderTop: "1px solid var(--border-color)", display: "flex", justifyContent: "flex-end", gap: 8, flexShrink: 0 }}>
                <button className="btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="btn-primary" onClick={save} disabled={saving || !form.name || !form.amount}>{saving ? "Saving..." : editDebt ? "Save" : "Add Debt"}</button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
