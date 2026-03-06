"use client";
import ModalPortal from "@/components/ModalPortal";
import { useState, useEffect, useRef } from "react";
import { useSubscriptions } from "@/lib/useSubscriptions";
import { useSettings } from "@/lib/SettingsContext";
import { toMonthly, fmt, FamilyMember } from "@/types";


const MEMBER_EMOJIS = ["👤","👩","👨","👧","👦","👶","🧑","👴","👵","🧒","🧔","👱","🧕","👲","🎅","🤶","🦸","🦹","🧙","🧝"];
const COLORS = ["#6366F1","#10B981","#F59E0B","#EF4444","#8B5CF6","#EC4899","#06B6D4","#84CC16","#F97316","#3B82F6"];

export default function FamilyPage() {
  const { subs, loading } = useSubscriptions();
  const { currencySymbol, convertToDisplay } = useSettings();
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editMember, setEditMember] = useState<FamilyMember | null>(null);
  const [form, setForm] = useState({ name: "", color: "#6366F1", avatar: "" });
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const data = await fetch("/api/family-members").then(r => r.json());
    setMembers(Array.isArray(data) ? data : []);
  };
  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditMember(null); setForm({ name: "", color: "#6366F1", avatar: "" }); setShowModal(true); };
  const openEdit = (m: FamilyMember) => { setEditMember(m); setForm({ name: m.name, color: m.color || "#6366F1", avatar: (m as any).avatar || "" }); setShowModal(true); };

  const save = async () => {
    setSaving(true);
    if (editMember) await fetch(`/api/family-members/${editMember.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    else await fetch("/api/family-members", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    await load(); setShowModal(false); setSaving(false);
  };

  const remove = async (id: number) => {
    if (!confirm("Delete this family member?")) return;
    await fetch(`/api/family-members/${id}`, { method: "DELETE" });
    setMembers(prev => prev.filter(m => m.id !== id));
  };

  const handleAvatarFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const r = new FileReader();
    r.onload = e => setForm(p => ({ ...p, avatar: e.target?.result as string }));
    r.readAsDataURL(file);
  };

  const activeSubs = subs.filter(s => s.active);

  if (loading) return <div style={{ color: "var(--muted)" }}>Loading...</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }} className="fade-in">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div><h1 style={{ fontSize: 22, fontWeight: 700 }}>Family</h1><p style={{ color: "var(--muted)", fontSize: 13, marginTop: 2 }}>Track subscriptions per family member</p></div>
        <button className="btn-primary" onClick={openAdd}>+ Add Member</button>
      </div>

      {members.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 48 }}>
          <div style={{ fontSize: 38, marginBottom: 10 }}>👨‍👩‍👧</div>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>No family members yet</div>
          <button className="btn-primary" onClick={openAdd}>Add First Member</button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
          {members.map(m => {
            const memberSubs = activeSubs.filter(s => s.member_id === m.id);
            const monthly = memberSubs.reduce((a, s) => a + convertToDisplay(toMonthly(s.amount, s.cycle), s.currency), 0);
            return (
              <div key={m.id} className="card">
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 99, background: m.color || "#6366F1", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "white", fontSize: 20, overflow: "hidden", flexShrink: 0 }}>
                    {(m as any).avatar && MEMBER_EMOJIS.includes((m as any).avatar) ? <span style={{ fontSize: 22 }}>{(m as any).avatar}</span> : (m as any).avatar ? <img src={(m as any).avatar} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" /> : (m.name[0] || "?").toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{m.name}</div>
                    <div style={{ fontSize: 13, color: "var(--muted)" }}>{memberSubs.length} subscription{memberSubs.length !== 1 ? "s" : ""}</div>
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button onClick={() => openEdit(m)} style={{ background: "none", border: "1px solid var(--border-color)", borderRadius: 6, padding: "4px 8px", cursor: "pointer", color: "var(--muted)", fontSize: 12 }}>✏️</button>
                    <button onClick={() => remove(m.id)} style={{ background: "none", border: "none", color: "#EF4444", cursor: "pointer", padding: "4px 6px", fontSize: 13 }}>🗑️</button>
                  </div>
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>{currencySymbol}{fmt(monthly)}<span style={{ fontSize: 12, fontWeight: 400, color: "var(--muted)" }}>/mo</span></div>
                {memberSubs.length > 0 && (
                  <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 5 }}>
                    {memberSubs.slice(0, 4).map(s => (
                      <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12 }}>
                        {s.icon ? <img src={s.icon} width={16} height={16} style={{ borderRadius: 3, objectFit: "contain" }} alt="" onError={e => (e.currentTarget.style.display = "none")} /> : <span>📦</span>}
                        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</span>
                        <span style={{ color: "var(--muted)" }}>{currencySymbol}{fmt(convertToDisplay(toMonthly(s.amount, s.cycle), s.currency))}</span>
                      </div>
                    ))}
                    {memberSubs.length > 4 && <div style={{ fontSize: 11, color: "var(--muted)" }}>+{memberSubs.length - 4} more</div>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <ModalPortal><div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(5px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, overflow: "hidden" }}
          onClick={() => setShowModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: "var(--surface)", borderRadius: 16, width: "100%", maxWidth: 400, display: "flex", flexDirection: "column", overflow: "hidden", border: "1px solid var(--border-color)", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
            <div style={{ padding: "18px 22px 16px", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{editMember ? "Edit Member" : "Add Family Member"}</div>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 18, cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Avatar preview + emoji picker + upload */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 8, display: "block" }}>ICON / PHOTO</label>
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 10 }}>
                  <div style={{ width: 52, height: 52, borderRadius: 99, background: form.color, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "white", fontSize: 22, overflow: "hidden", flexShrink: 0 }}>
                    {form.avatar && MEMBER_EMOJIS.includes(form.avatar) ? <span style={{ fontSize: 26 }}>{form.avatar}</span> : form.avatar ? <img src={form.avatar} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" /> : (form.name[0] || "?").toUpperCase()}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => e.target.files?.[0] && handleAvatarFile(e.target.files[0])} />
                    <button className="btn-ghost" style={{ fontSize: 12, padding: "4px 10px" }} onClick={() => fileRef.current?.click()}>📷 Upload Photo</button>
                    {form.avatar && <button onClick={() => setForm(p => ({ ...p, avatar: "" }))} style={{ background: "none", border: "none", color: "#EF4444", cursor: "pointer", fontSize: 12 }}>✕ Remove</button>}
                  </div>
                </div>
                {/* Emoji icons */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {MEMBER_EMOJIS.map(em => (
                    <button key={em} onClick={() => setForm(p => ({ ...p, avatar: p.avatar === em ? "" : em }))} style={{ width: 34, height: 34, border: form.avatar === em ? "2px solid var(--accent)" : "1px solid var(--border-color)", borderRadius: 8, background: form.avatar === em ? "rgba(var(--accent-rgb),0.1)" : "var(--surface2)", cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>{em}</button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 5, display: "block" }}>Name *</label>
                <input className="input" placeholder="e.g. Sarah" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} autoFocus />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 8, display: "block" }}>Color</label>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {COLORS.map(c => <div key={c} onClick={() => setForm(p => ({ ...p, color: c }))} style={{ width: 26, height: 26, borderRadius: 6, background: c, cursor: "pointer", border: form.color === c ? "2.5px solid var(--text)" : "2px solid transparent" }} />)}
                </div>
              </div>
            </div>
            <div style={{ padding: "14px 22px", borderTop: "1px solid var(--border-color)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button className="btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={save} disabled={saving || !form.name}>{saving ? "Saving..." : editMember ? "Save" : "Add Member"}</button>
            </div>
          </div>
        </div>
      </ModalPortal>)}
    </div>
  );
}
