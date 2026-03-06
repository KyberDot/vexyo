"use client";
import ModalPortal from "@/components/ModalPortal";
import { useState, useEffect } from "react";
import { Subscription, fmt } from "@/types";
import { useSettings } from "@/lib/SettingsContext";
import { useToast } from "@/components/Toast";
import { useSubscriptions } from "@/lib/useSubscriptions";

interface Props {
  sub: Subscription;
  onClose: () => void;
}

export default function PaymentHistory({ sub, onClose }: Props) {
  const { currencySymbol } = useSettings();
  const { update } = useSubscriptions();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");
  const [amount, setAmount] = useState(sub.cycle === "variable" ? "" : String(sub.amount));
  const [saving, setSaving] = useState(false);
  const { success, error: toastError } = useToast();

  const load = async () => {
    setLoading(true);
    const d = await fetch(`/api/payment-history?sub_id=${sub.id}`).then(r => r.json());
    setHistory(Array.isArray(d) ? d : []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const markPaid = async () => {
    setSaving(true);
    await fetch("/api/payment-history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sub_id: sub.id, amount: Number(amount) || sub.amount, currency: sub.currency, note, advance_date: sub.cycle !== "variable" }),
    });
    // Also update sub in cache
    if (sub.cycle !== "variable" && sub.next_date) {
      const d = new Date(sub.next_date);
      if (sub.cycle === "monthly") d.setMonth(d.getMonth() + 1);
      else if (sub.cycle === "yearly") d.setFullYear(d.getFullYear() + 1);
      else if (sub.cycle === "weekly") d.setDate(d.getDate() + 7);
      else if (sub.cycle === "quarterly") d.setMonth(d.getMonth() + 3);
      else if (sub.cycle === "6-months") d.setMonth(d.getMonth() + 6);
      await update(sub.id, { next_date: d.toISOString().split("T")[0] });
    }
    setNote("");
    await load();
    setSaving(false);
    success("Payment recorded");
  };

  const deletePayment = async (id: number) => {
    await fetch("/api/payment-history", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setHistory(h => h.filter(p => p.id !== id));
  };

  const days = sub.next_date ? Math.floor((new Date(sub.next_date).getTime() - Date.now()) / 86400000) : null;
  const isOverdue = days !== null && days < 0;
  const isSoon = days !== null && days >= 0 && days <= 3;

  return (
    <ModalPortal><div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, overflow: "hidden" }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: "var(--surface)", borderRadius: 16, width: "100%", maxWidth: 480, maxHeight: "88vh", display: "flex", flexDirection: "column", border: "1px solid var(--border-color)", boxShadow: "0 24px 64px rgba(0,0,0,0.5)", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--border-color)", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: "var(--surface2)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
            {sub.icon ? <img src={sub.icon} width={28} height={28} style={{ objectFit: "contain" }} alt="" onError={e => (e.currentTarget.style.display="none")} /> : <span>📦</span>}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{sub.name}</div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>
              {sub.next_date && (
                <span style={{ color: isOverdue ? "#EF4444" : isSoon ? "#F59E0B" : "var(--muted)", fontWeight: isOverdue || isSoon ? 600 : 400 }}>
                  {isOverdue ? `⚠️ ${Math.abs(days!)} days overdue` : isSoon && days === 0 ? "Due today" : isSoon ? `Due in ${days} days` : `Next: ${sub.next_date}`}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 20, cursor: "pointer", lineHeight: 1 }}>✕</button>
        </div>

        {/* Mark paid section */}
        <div style={{ padding: "16px 22px", borderBottom: "1px solid var(--border-color)", background: "var(--surface2)", flexShrink: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>Record Payment</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 3 }}>Amount</label>
              <input className="input" type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder={sub.cycle === "variable" ? "Enter amount" : String(sub.amount)} style={{ height: 34, fontSize: 13 }} />
            </div>
            <div style={{ flex: 1.5 }}>
              <label style={{ fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 3 }}>Note (optional)</label>
              <input className="input" value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Auto-pay, receipt #123" style={{ height: 34, fontSize: 13 }} />
            </div>
          </div>
          <button className="btn-primary" onClick={markPaid} disabled={saving || (!amount && sub.cycle === "variable")} style={{ width: "100%", justifyContent: "center", height: 36, fontSize: 13 }}>
            {saving ? "Recording..." : "✓ Mark as Paid" + (sub.cycle !== "variable" && sub.next_date ? " & Advance Date" : "")}
          </button>
        </div>

        {/* History */}
        <div style={{ flex: 1, overflowY: "auto", padding: "14px 22px" }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10, color: "var(--muted)" }}>Payment History ({history.length})</div>
          {loading ? <div style={{ color: "var(--muted)", fontSize: 13 }}>Loading...</div>
            : history.length === 0 ? <div style={{ color: "var(--muted)", fontSize: 13, textAlign: "center", padding: "20px 0" }}>No payments recorded yet</div>
            : history.map(p => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: "1px solid var(--border-color)" }}>
                <div style={{ width: 7, height: 7, borderRadius: 99, background: "#10B981", flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{currencySymbol}{fmt(p.amount || 0)}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>
                    {new Date(p.paid_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    {p.note && <span> · {p.note}</span>}
                  </div>
                </div>
                <button onClick={() => deletePayment(p.id)} style={{ background: "none", border: "none", color: "#EF4444", cursor: "pointer", fontSize: 13, opacity: 0.6, padding: "2px 4px" }} title="Delete payment record">🗑️</button>
              </div>
            ))}
        </div>
      </div>
    </div></ModalPortal>
  );
}
