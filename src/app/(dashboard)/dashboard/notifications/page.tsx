"use client";
import { useState, useEffect } from "react";

const TYPE_COLORS: Record<string, string> = {
  renewal: "#6366F1", trial: "#F59E0B", price: "#3B82F6", budget: "#EF4444", system: "#10B981"
};
const TYPE_ICONS: Record<string, string> = {
  renewal: "🔄", trial: "⏰", price: "💲", budget: "🎯", system: "📢"
};

export default function NotificationsPage() {
  const [notifs, setNotifs] = useState<any[]>([]);
  const [ns, setNs] = useState<any>(null);
  const [tab, setTab] = useState<"inbox" | "settings">("inbox");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [savingNs, setSavingNs] = useState(false);
  const [savedNs, setSavedNs] = useState(false);

  const load = async () => {
    setLoading(true);
    const [nr, nsr] = await Promise.all([
      fetch("/api/notifications").then(r => r.json()),
      fetch("/api/notifications/settings").then(r => r.json()),
    ]);
    if (Array.isArray(nr)) setNotifs(nr);
    if (nsr && !nsr.error) setNs(nsr);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const markRead = async (id?: number) => {
    await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(id ? { id, read: true } : { markAll: true }) });
    setNotifs(prev => id ? prev.map(n => n.id === id ? { ...n, read: true } : n) : prev.map(n => ({ ...n, read: true })));
  };

  const deleteNotif = async (id: number) => {
    await fetch("/api/notifications", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setNotifs(prev => prev.filter(n => n.id !== id));
  };

  const clearRead = async () => {
    await fetch("/api/notifications", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clearAll: true }) });
    setNotifs(prev => prev.filter(n => !n.read));
  };

  const saveSettings = async () => {
    setSavingNs(true);
    await fetch("/api/notifications/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(ns) });
    setSavingNs(false); setSavedNs(true); setTimeout(() => setSavedNs(false), 2000);
  };

  const filtered = notifs.filter(n => {
    if (filter === "unread") return !n.read;
    if (filter === "renewal") return n.type === "renewal";
    if (filter === "trial") return n.type === "trial";
    return true;
  });

  const unreadCount = notifs.filter(n => !n.read).length;

  const Toggle = ({ value, onChange }: { value: boolean, onChange: (v: boolean) => void }) => (
    <div onClick={() => onChange(!value)} style={{ width: 38, height: 22, borderRadius: 11, background: value ? "var(--accent)" : "var(--border-color)", cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
      <div style={{ position: "absolute", top: 3, left: value ? 19 : 3, width: 16, height: 16, borderRadius: 8, background: "white", transition: "left 0.2s" }} />
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }} className="fade-in">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
            Notifications
            {unreadCount > 0 && <span style={{ background: "#EF4444", color: "white", borderRadius: 99, fontSize: 12, fontWeight: 700, padding: "2px 8px" }}>{unreadCount}</span>}
          </h1>
          <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 2 }}>Stay on top of renewals, trials, and spending</p>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <div style={{ display: "flex", background: "var(--surface)", border: "1px solid var(--border-color)", borderRadius: 8, padding: 3, gap: 2 }}>
            {[["inbox","📥 Inbox"],["settings","⚙️ Settings"]].map(([k,l]) => (
              <button key={k} onClick={() => setTab(k as any)} style={{ padding: "5px 12px", borderRadius: 6, border: "none", background: tab === k ? "var(--accent)" : "transparent", color: tab === k ? "white" : "var(--muted)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      {tab === "inbox" && (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <div style={{ display: "flex", gap: 4 }}>
              {[["all","All"],["unread","Unread"],["renewal","Renewals"],["trial","Trials"]].map(([k,l]) => (
                <button key={k} onClick={() => setFilter(k)} style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${filter === k ? "var(--accent)" : "var(--border-color)"}`, background: filter === k ? "rgba(var(--accent-rgb),0.1)" : "transparent", color: filter === k ? "var(--accent)" : "var(--muted)", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>{l}</button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {unreadCount > 0 && <button className="btn-ghost" style={{ fontSize: 12 }} onClick={() => markRead()}>Mark all read</button>}
              <button className="btn-ghost" style={{ fontSize: 12 }} onClick={clearRead}>Clear read</button>
            </div>
          </div>

          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            {loading
              ? <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>Loading...</div>
              : filtered.length === 0
                ? <div style={{ padding: 48, textAlign: "center" }}>
                    <div style={{ fontSize: 36, marginBottom: 8 }}>🔔</div>
                    <div style={{ fontWeight: 600 }}>All clear!</div>
                    <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>No notifications in this view</div>
                  </div>
                : filtered.map((n, i) => (
                  <div key={n.id} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 16px", borderBottom: i < filtered.length - 1 ? "1px solid var(--border-color)" : "none", background: n.read ? "transparent" : "rgba(var(--accent-rgb),0.03)", transition: "background 0.15s" }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: (TYPE_COLORS[n.type] || "#6366F1") + "15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
                      {n.sub_icon
                        ? <img src={n.sub_icon} width={24} height={24} style={{ borderRadius: 4, objectFit: "contain" }} alt="" onError={e => { e.currentTarget.style.display = "none"; }} />
                        : TYPE_ICONS[n.type] || "📢"}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontWeight: n.read ? 500 : 700, fontSize: 14 }}>{n.title || n.sub_name}</span>
                        {!n.read && <span style={{ width: 7, height: 7, borderRadius: 99, background: "var(--accent)", display: "inline-block", flexShrink: 0 }} />}
                        <span className="badge" style={{ background: (TYPE_COLORS[n.type] || "#6366F1") + "15", color: TYPE_COLORS[n.type] || "#6366F1", fontSize: 10, marginLeft: "auto" }}>{n.type}</span>
                      </div>
                      <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>{n.message}</div>
                      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>{new Date(n.created_at).toLocaleDateString()}</div>
                    </div>
                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                      {!n.read && <button onClick={() => markRead(n.id)} style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: 13, padding: 4 }} title="Mark read">✓</button>}
                      <button onClick={() => deleteNotif(n.id)} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 13, padding: 4 }} title="Delete">🗑️</button>
                    </div>
                  </div>
                ))}
          </div>
        </>
      )}

      {tab === "settings" && ns && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 560 }}>
          <div className="card">
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Delivery</div>
            {[
              ["push_enabled", "In-app notifications", "Get notified inside the app"],
              ["email_enabled", "Email notifications", "Receive emails for important alerts"],
            ].map(([k, label, desc]) => (
              <div key={k} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border-color)" }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>{label}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 1 }}>{desc}</div>
                </div>
                <Toggle value={!!ns[k]} onChange={v => setNs((p: any) => ({ ...p, [k]: v }))} />
              </div>
            ))}
          </div>

          <div className="card">
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Renewal Reminders</div>
            {[
              ["remind_1d", "1 day before"],
              ["remind_3d", "3 days before"],
              ["remind_7d", "7 days before"],
              ["remind_14d", "14 days before"],
            ].map(([k, label]) => (
              <div key={k} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border-color)" }}>
                <span style={{ fontSize: 14 }}>{label}</span>
                <Toggle value={!!ns[k]} onChange={v => setNs((p: any) => ({ ...p, [k]: v }))} />
              </div>
            ))}
          </div>

          <div className="card">
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Alert Types</div>
            {[
              ["renewal_alerts", "Renewal alerts", "Notify before subscriptions renew"],
              ["price_change_alerts", "Price change alerts", "When subscription prices change"],
              ["trial_end_alerts", "Trial ending alerts", "Before free trials expire"],
              ["overdue_alerts", "Overdue alerts", "When a payment becomes overdue"],
              ["budget_alerts", "Budget alerts", "When spending approaches limits"],
            ].map(([k, label, desc]) => (
              <div key={k} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border-color)" }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>{label}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 1 }}>{desc}</div>
                </div>
                <Toggle value={!!ns[k]} onChange={v => setNs((p: any) => ({ ...p, [k]: v }))} />
              </div>
            ))}
          </div>

          <div className="card">
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Digests & Reports</div>
            {[
              ["weekly_digest", "Weekly spending digest", "Summary of weekly spending every Monday"],
              ["monthly_report", "Monthly report", "Full spending report at end of month"],
            ].map(([k, label, desc]) => (
              <div key={k} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border-color)" }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>{label}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 1 }}>{desc}</div>
                </div>
                <Toggle value={!!ns[k]} onChange={v => setNs((p: any) => ({ ...p, [k]: v }))} />
              </div>
            ))}
          </div>

          <button className="btn-primary" onClick={saveSettings} disabled={savingNs} style={{ alignSelf: "flex-start" }}>
            {savingNs ? "Saving..." : savedNs ? "✓ Saved" : "Save Notification Settings"}
          </button>
        </div>
      )}
    </div>
  );
}
