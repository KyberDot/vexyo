"use client";
import { useState, useEffect } from "react";
import { useSubscriptions } from "@/lib/useSubscriptions";
import { useSettings } from "@/lib/SettingsContext";
import { toMonthly, fmt, FamilyMember } from "@/types";

const COLORS = ["#6366F1", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#06B6D4", "#84CC16"];

export default function FamilyPage() {
  const { subs, loading } = useSubscriptions();
  const { currencySymbol, convertToDisplay } = useSettings();
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editMember, setEditMember] = useState<FamilyMember | null>(null);
  const [form, setForm] = useState({ name: "", color: "#6366F1", avatar: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const res = await fetch("/api/family-members");
    const data = await res.json();
    setMembers(Array.isArray(data) ? data : []);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    if (editMember) {
      await fetch(`/api/family-members/${editMember.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    } else {
      await fetch("/api/family-members", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    }
    await load();
    setShowAdd(false);
    setEditMember(null);
    setForm({ name: "", color: "#6366F1", avatar: "" });
    setSaving(false);
  };

  const remove = async (id: number) => {
    if (!confirm("Delete this family member?")) return;
    await fetch(`/api/family-members/${id}`, { method: "DELETE" });
    setMembers(prev => prev.filter(m => m.id !== id));
  };

  const activeSubs = subs.filter(s => s.active);

  const Modal = () => (
    <div className="modal-overlay" onClick={() => { setShowAdd(false); setEditMember(null); }}>
      <div className="modal-box" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 style={{ fontSize: 17, fontWeight: 700 }}>{editMember ? "Edit Member" : "Add Family Member"}</h2>
          <button onClick={() => { setShowAdd(false); setEditMember(null); }} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 18, cursor: "pointer" }}>✕</button>
        </div>
        <div className="modal-body">
          <div>
            <label style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4, display: "block" }}>Name *</label>
            <input className="input" placeholder="e.g. Sarah" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8, display: "block" }}>Color</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {COLORS.map(c => (
                <div key={c} onClick={() => setForm(p => ({ ...p, color: c }))} style={{ width: 28, height: 28, borderRadius: 99, background: c, cursor: "pointer", border: form.color === c ? "3px solid var(--text)" : "3px solid transparent", transition: "all 0.15s" }} />
              ))}
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-ghost" onClick={() => { setShowAdd(false); setEditMember(null); }}>Cancel</button>
          <button className="btn-primary" onClick={save} disabled={saving || !form.name.trim()}>{saving ? "Saving..." : "Save"}</button>
        </div>
      </div>
    </div>
  );

  if (loading) return <div style={{ color: "var(--muted)" }}>Loading...</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }} className="fade-in">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Family</h1>
          <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 2 }}>Monthly spending breakdown by family member</p>
        </div>
        <button className="btn-primary" onClick={() => { setForm({ name: "", color: "#6366F1", avatar: "" }); setShowAdd(true); }}>+ Add Member</button>
      </div>

      {members.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 48 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>👨‍👩‍👧</div>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>No family members yet</div>
          <div style={{ color: "var(--muted)", fontSize: 14, marginBottom: 16 }}>Add family members to track who uses which subscriptions</div>
          <button className="btn-primary" onClick={() => { setForm({ name: "", color: "#6366F1", avatar: "" }); setShowAdd(true); }}>Add First Member</button>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-color)", fontWeight: 600, fontSize: 15 }}>Family Spending</div>
          {members.map((m, i) => {
            const mSubs = activeSubs.filter(s => s.member_id === m.id);
            const total = mSubs.reduce((a, s) => a + convertToDisplay(toMonthly(s.amount, s.cycle), s.currency), 0);
            return (
              <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 20px", borderBottom: i < members.length - 1 ? "1px solid var(--border-color)" : "none" }}>
                <div style={{ width: 38, height: 38, borderRadius: 99, background: m.color, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "white", fontSize: 14, flexShrink: 0 }}>
                  {m.name[0]?.toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{m.name} <span style={{ color: "var(--muted)", fontWeight: 400, fontSize: 13 }}>({mSubs.length} apps)</span></div>
                  {mSubs.length > 0 && (
                    <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                      {mSubs.slice(0, 4).map(s => (
                        <span key={s.id} style={{ fontSize: 11, color: "var(--muted)", background: "var(--surface2)", padding: "1px 6px", borderRadius: 4 }}>{s.name}</span>
                      ))}
                      {mSubs.length > 4 && <span style={{ fontSize: 11, color: "var(--muted)" }}>+{mSubs.length - 4} more</span>}
                    </div>
                  )}
                </div>
                <div style={{ fontWeight: 700, fontSize: 15, color: "var(--accent)", minWidth: 90, textAlign: "right" }}>{currencySymbol}{fmt(total)}/month</div>
                <button onClick={() => { setEditMember(m); setForm({ name: m.name, color: m.color, avatar: m.avatar || "" }); setShowAdd(true); }} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 14, padding: 4 }}>✏️</button>
                <button onClick={() => remove(m.id)} style={{ background: "none", border: "none", color: "#EF4444", cursor: "pointer", fontSize: 14, padding: 4 }}>🗑️</button>
              </div>
            );
          })}
        </div>
      )}

      {/* Category breakdown */}
      {members.length > 0 && (
        <div className="card">
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 16 }}>Unassigned Subscriptions</div>
          {activeSubs.filter(s => !s.member_id).length === 0
            ? <div style={{ color: "var(--muted)", fontSize: 14 }}>All subscriptions are assigned to family members ✅</div>
            : activeSubs.filter(s => !s.member_id).map(s => (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--border-color)", fontSize: 14 }}>
                {s.icon && <img src={s.icon} width={22} height={22} style={{ borderRadius: 4 }} alt={s.name} onError={e => (e.currentTarget.style.display = "none")} />}
                <span style={{ flex: 1 }}>{s.name}</span>
                <span style={{ color: "var(--muted)" }}>{currencySymbol}{fmt(convertToDisplay(toMonthly(s.amount, s.cycle), s.currency))}/mo</span>
              </div>
            ))}
        </div>
      )}

      {(showAdd || editMember) && <Modal />}
    </div>
  );
}
