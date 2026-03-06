"use client";
import ModalPortal from "@/components/ModalPortal";
import { useState, useEffect } from "react";
import { useSubscriptions } from "@/lib/useSubscriptions";
import { useSettings } from "@/lib/SettingsContext";
import { toMonthly, fmt, convertAmount, UserCategory } from "@/types";

const ICON_OPTS = ["📦","🎬","🎵","💻","☁️","⚡","❤️","📰","🎮","📚","🔧","⚙️","🏠","🚗","✈️","🍕","💰","🛡️","📱","🎨","🏋️","🌐","🔑","📧","🛒","📷"];
const COLOR_OPTS = ["#6366F1","#8B5CF6","#EC4899","#EF4444","#F59E0B","#10B981","#3B82F6","#06B6D4","#84CC16","#F97316","#14B8A6","#94A3B8"];

export default function CategoriesPage() {
  const { subs } = useSubscriptions();
  const { categories, reloadCategories, currencySymbol, convertToDisplay, settings } = useSettings();
  const [showModal, setShowModal] = useState(false);
  const [editCat, setEditCat] = useState<UserCategory | null>(null);
  const [form, setForm] = useState({ name: "", icon: "📦", color: "#6366F1", budget: "" });
  const [saving, setSaving] = useState(false);

  const activeSubs = subs.filter(s => s.active && s.type !== "bill");

  const totalBudget = categories.reduce((a, c) => a + (c.budget || 0), 0);
  const totalSpend = activeSubs.reduce((a, s) => a + convertToDisplay(toMonthly(s.amount, s.cycle), s.currency), 0);

  const getCatStats = (catName: string) => {
    const catSubs = activeSubs.filter(s => s.category?.replace(/^[^\s]+ /, '') === catName || s.category === catName);
    const spend = catSubs.reduce((a, s) => a + convertToDisplay(toMonthly(s.amount, s.cycle), s.currency), 0);
    return { subs: catSubs, spend };
  };

  const openAdd = () => { setEditCat(null); setForm({ name: "", icon: "📦", color: "#6366F1", budget: "" }); setShowModal(true); };
  const openEdit = (c: UserCategory) => { setEditCat(c); setForm({ name: c.name, icon: c.icon, color: c.color, budget: c.budget ? String(c.budget) : "" }); setShowModal(true); };

  const save = async () => {
    setSaving(true);
    if (editCat && editCat.id > 0) {
      await fetch(`/api/categories/${editCat.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.name, icon: form.icon, color: form.color, budget: Number(form.budget) || 0 }) });
    } else {
      await fetch("/api/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.name, icon: form.icon, color: form.color, budget: Number(form.budget) || 0 }) });
    }
    await reloadCategories(); setShowModal(false); setSaving(false);
  };

  const remove = async (c: UserCategory) => {
    if (!confirm(`Delete category "${c.name}"? Subscriptions in this category will be moved to "Other".`)) return;
    if (c.id > 0) {
      await fetch(`/api/categories/${c.id}`, { method: "DELETE" });
    } else {
      // Default category - create a "hidden" user record to suppress it
      await fetch("/api/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: c.name, icon: c.icon, color: c.color, budget: 0, hidden: true }) });
    }
    await reloadCategories();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }} className="fade-in">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700 }}>Categories</h1>
            {totalBudget > 0 && <span style={{ fontSize: 13, color: "var(--muted)" }}>{currencySymbol}{fmt(convertToDisplay(totalBudget, "USD"))} total budgets</span>}
          </div>
          <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 2 }}>Organize your subscriptions and set budget limits for each category</p>
        </div>
        <button className="btn-primary" onClick={openAdd}>+ Add Category</button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        <div className="card">
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>Total Categories</div>
          <div style={{ fontSize: 26, fontWeight: 800 }}>{categories.length}</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{categories.filter(c => c.budget > 0).length} with budget limits</div>
        </div>
        <div className="card">
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>Total Monthly Budget</div>
          <div style={{ fontSize: 26, fontWeight: 800 }}>{currencySymbol}{fmt(convertToDisplay(totalBudget, "USD"))}</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Across all categories</div>
        </div>
        <div className="card">
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>Budget Utilization</div>
          <div style={{ fontSize: 26, fontWeight: 800 }}>{totalBudget > 0 ? Math.round((totalSpend / convertToDisplay(totalBudget, "USD")) * 100) : 0}%</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>of budget</div>
        </div>
      </div>

      {/* Category cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
        {categories.map(cat => {
          const stats = getCatStats(cat.name);
          const budget = convertToDisplay(cat.budget || 0, "USD");
          const pct = budget > 0 ? Math.min((stats.spend / budget) * 100, 110) : 0;
          const barColor = pct >= 100 ? "#EF4444" : pct >= 75 ? "#F59E0B" : "#10B981";
          const overBudget = budget > 0 && stats.spend > budget;
          return (
            <div key={cat.name} className="card" style={{ position: "relative" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: cat.color + "20", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{cat.icon}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{cat.name}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>{stats.subs.length} subscription{stats.subs.length !== 1 ? "s" : ""}</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 2 }}>
                  <button onClick={() => openEdit(cat)} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", padding: "4px 6px", borderRadius: 6, fontSize: 13 }} title="Edit">✏️</button>
                  {cat.id > 0 && <button onClick={() => remove(cat)} style={{ background: "none", border: "none", color: "#EF4444", cursor: "pointer", padding: "4px 6px", borderRadius: 6, fontSize: 13 }} title="Delete">🗑️</button>}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                <span style={{ color: "var(--muted)" }}>spent this month</span>
                <span style={{ fontWeight: 700 }}>{currencySymbol}{fmt(stats.spend)}</span>
              </div>
              {budget > 0 && (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 8 }}>
                    <span style={{ color: "var(--muted)" }}>Budget Limit</span>
                    <span style={{ fontWeight: 600 }}>{currencySymbol}{fmt(budget)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                    <span style={{ color: overBudget ? "#EF4444" : "#10B981", fontWeight: 600 }}>{overBudget ? "Over budget" : "On track"}</span>
                    <span style={{ color: barColor, fontWeight: 700 }}>{Math.round(pct)}%</span>
                  </div>
                  <div style={{ height: 5, background: "var(--surface2)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ width: `${Math.min(pct, 100)}%`, height: "100%", background: barColor, borderRadius: 3, transition: "width 0.5s ease" }} />
                  </div>
                </>
              )}
              {stats.subs.length > 0 && (
                <div style={{ marginTop: 10, display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {stats.subs.slice(0, 4).map(s => (
                    <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 4, background: "var(--surface2)", borderRadius: 6, padding: "2px 7px", fontSize: 11 }}>
                      {s.icon && <img src={s.icon} width={12} height={12} style={{ borderRadius: 2 }} alt="" onError={e => (e.currentTarget.style.display = "none")} />}
                      <span style={{ color: "var(--muted)" }}>{s.name}</span>
                    </div>
                  ))}
                  {stats.subs.length > 4 && <span style={{ fontSize: 11, color: "var(--muted)", alignSelf: "center" }}>+{stats.subs.length - 4}</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {showModal && (
        <ModalPortal><div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(5px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, overflow: "hidden" }} onClick={() => setShowModal(false)}>
          <div style={{ background: "var(--surface)", borderRadius: 16, width: "100%", maxWidth: 460, maxHeight: "88vh", display: "flex", flexDirection: "column", overflow: "hidden", border: "1px solid var(--border-color)", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "18px 22px 16px", borderBottom: "1px solid var(--border-color)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700 }}>{editCat ? "Edit Category" : "Add Category"}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 18, cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 14, overflowY: "auto", flex: 1 }}>
              {/* Icon preview */}
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 4 }}>
                <div style={{ width: 56, height: 56, borderRadius: 14, background: form.color + "20", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>{form.icon}</div>
              </div>
              <div>
                <label style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6, display: "block" }}>Icon</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {ICON_OPTS.map(ic => (
                    <button key={ic} type="button" onClick={() => setForm(p => ({ ...p, icon: ic }))} style={{ width: 34, height: 34, borderRadius: 8, border: `2px solid ${form.icon === ic ? "var(--accent)" : "var(--border-color)"}`, background: form.icon === ic ? "rgba(var(--accent-rgb),0.1)" : "var(--surface2)", fontSize: 16, cursor: "pointer" }}>{ic}</button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4, display: "block" }}>Name *</label>
                <input className="input" placeholder="e.g. Entertainment" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6, display: "block" }}>Color</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {COLOR_OPTS.map(c => (
                    <div key={c} onClick={() => setForm(p => ({ ...p, color: c }))} style={{ width: 28, height: 28, borderRadius: 8, background: c, cursor: "pointer", border: form.color === c ? "3px solid var(--text)" : "3px solid transparent" }} />
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4, display: "block" }}>Monthly Budget Limit (optional)</label>
                <input className="input" type="number" min="0" step="1" placeholder="0 = no limit" value={form.budget} onChange={e => setForm(p => ({ ...p, budget: e.target.value }))} />
              </div>
            </div>
            <div style={{ padding: "14px 22px", borderTop: "1px solid var(--border-color)", display: "flex", gap: 8, justifyContent: "flex-end", flexShrink: 0 }}>
              <button className="btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={save} disabled={saving || !form.name.trim()}>{saving ? "Saving..." : "Save"}</button>
            </div>
          </div>
        </div>
      </ModalPortal>)}
    </div>
  );
}
