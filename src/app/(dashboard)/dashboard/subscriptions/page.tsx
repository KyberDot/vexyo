"use client";
import { useState, useEffect, useMemo } from "react";
import { useSubscriptions } from "@/lib/useSubscriptions";
import { useSettings } from "@/lib/SettingsContext";
import { toMonthly, fmt, daysUntil, Subscription, CURRENCY_SYMBOLS } from "@/types";
import SubModal from "@/components/SubModal";
import AttachmentsPanel from "@/components/AttachmentsPanel";
import PaymentHistory from "@/components/PaymentHistory";
import { useSearch } from "@/app/(dashboard)/layout";
import { useToast } from "@/components/Toast";

function displayAmount(s: Subscription, convertToDisplay: (a: number, c: string) => number, currencySymbol: string) {
  if (s.cycle === "variable") return { main: "Variable", sub: "", isVariable: true };
  const conv = convertToDisplay(s.amount, s.currency);
  
  if (s.cycle === "yearly") return { main: `${currencySymbol}${fmt(conv)}`, sub: " / Year", isVariable: false };
  if (s.cycle === "6-months") return { main: `${currencySymbol}${fmt(conv)}`, sub: " / 6-Months", isVariable: false };
  if (s.cycle === "quarterly") return { main: `${currencySymbol}${fmt(conv)}`, sub: " / Quarter", isVariable: false };
  if (s.cycle === "weekly") return { main: `${currencySymbol}${fmt(conv)}`, sub: " / Week", isVariable: false };
  
  return { main: `${currencySymbol}${fmt(convertToDisplay(toMonthly(s.amount, s.cycle), s.currency))}`, sub: " / Month", isVariable: false };
}

export default function SubscriptionsPage() {
  const { subs, loading, add, update, remove } = useSubscriptions();
  const { settings, currencySymbol, convertToDisplay, platform } = useSettings();
  // FIXED: Changed { query } to { search } to match the hook's return type
  const { search } = useSearch();
  const { success } = useToast();

  const [showModal, setShowModal] = useState(false);
  const [editSub, setEditSub] = useState<Subscription | null>(null);
  const [payHistorySub, setPayHistorySub] = useState<Subscription | null>(null);

  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/family").then(r => r.json()).then(setFamilyMembers).catch(() => {});
    fetch("/api/payment-methods").then(r => r.json()).then(setPaymentMethods).catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    let list = subs.filter(s => s.type === "subscription");
    // FIXED: Using 'search' here instead of 'query'
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(s => s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q));
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [subs, search]);

  if (loading) return <div style={{ color: "var(--muted)", padding: 24 }}>Loading...</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>Subscriptions</h1>
        <button className="btn-primary" onClick={() => { setEditSub(null); setShowModal(true); }} style={{ background: platform.primary_color || "#6366F1" }}>
          + Add New
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.length === 0 && <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>No subscriptions found</div>}
        
        {filtered.map(s => {
          const amt = displayAmount(s, convertToDisplay, currencySymbol);
          const days = s.next_date ? daysUntil(s.next_date) : null;

          return (
            <div key={s.id} className="card" style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", opacity: s.active ? 1 : 0.6, position: "relative" }}>
              <div style={{ 
                width: 44, 
                height: 44, 
                borderRadius: 12, 
                background: "var(--surface2)", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center", 
                overflow: "hidden", 
                flexShrink: 0, 
                position: "relative",
                zIndex: 1
              }}>
                {s.icon ? (
                  <img src={s.icon} width={32} height={32} style={{ objectFit: "contain", position: "relative", zIndex: 2 }} alt={s.name} onError={e => (e.currentTarget.style.display = "none")} />
                ) : (
                  <span style={{ fontSize: 20 }}>📦</span>
                )}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontWeight: 600, fontSize: 15 }}>{s.name}</span>
                  {s.trial && (
                    <span style={{ 
                      background: "rgba(239, 68, 68, 0.15)", 
                      color: "#EF4444", 
                      fontSize: 10, 
                      padding: "2px 8px", 
                      borderRadius: 6, 
                      fontWeight: 800,
                      marginLeft: 10,
                      display: "inline-block",
                      lineHeight: "1.2",
                      border: "1px solid rgba(239, 68, 68, 0.2)"
                    }}>
                      TRIAL
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>
                  {amt.main} <span style={{ fontSize: 11, opacity: 0.7 }}>{amt.sub}</span>
                </div>
              </div>

              <div style={{ textAlign: "right", marginRight: 10 }}>
                {s.next_date && (
                  <>
                    <div style={{ fontSize: 12, fontWeight: 600, color: days !== null && days <= 3 ? "#EF4444" : "var(--text)" }}>
                      {days === 0 ? "Today" : days === 1 ? "Tomorrow" : `in ${days} days`}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>{new Date(s.next_date).toLocaleDateString()}</div>
                  </>
                )}
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setPayHistorySub(s)} title="Payment history" style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 13, padding: "2px 2px", lineHeight: 1, flexShrink: 0 }}>💰</button>
                <AttachmentsPanel subId={s.id} label="" />
                <button title="Edit" style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 13, padding: "2px 2px", flexShrink: 0 }} onClick={() => { setEditSub(s); setShowModal(true); }}>✏️</button>
                <button title="Delete" style={{ background: "none", border: "none", color: "#EF4444", cursor: "pointer", fontSize: 13, padding: "2px 2px", flexShrink: 0 }} onClick={async () => { if (confirm(`Delete ${s.name}?`)) { await remove(s.id); success("Subscription deleted"); } }}>🗑️</button>
              </div>
            </div>
          );
        })}
      </div>

      {payHistorySub && <PaymentHistory sub={payHistorySub} onClose={() => setPayHistorySub(null)} />}
      
      {showModal && (
        <SubModal 
          sub={editSub} 
          defaultType="subscription" 
          familyMembers={familyMembers} 
          paymentMethods={paymentMethods} 
          onSave={async (data: any) => { 
            try { 
              if (editSub) { await update(editSub.id, data); } 
              else { await add(data); } 
              success(editSub ? "Subscription updated" : "Subscription added"); 
              setShowModal(false); 
            } catch(e) {} 
          }} 
          onClose={() => setShowModal(false)} 
        />
      )}
    </div>
  );
}