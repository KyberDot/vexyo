"use client";
import ModalPortal from "@/components/ModalPortal";
import { useState, useEffect } from "react";
import { useToast } from "@/components/Toast";
import { useSubscriptions } from "@/lib/useSubscriptions";
import { useSettings } from "@/lib/SettingsContext";

export default function SharedLinksPage() {
  const { subs } = useSubscriptions();
  const { success, error: toastError } = useToast();
  const { currencySymbol } = useSettings();
  const [links, setLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSelector, setShowSelector] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const loadLinks = async () => {
    const r = await fetch("/api/shares").then(r => r.json());
    if (Array.isArray(r)) setLinks(r);
    setLoading(false);
  };

  useEffect(() => { loadLinks(); }, []);

  const createLink = async () => {
    if (selectedIds.length === 0) return toastError("Select at least one item to share");
    
    const r = await fetch("/api/shares", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription_ids: selectedIds })
    });
    
    if (r.ok) {
      success("Shared link created!");
      setSelectedIds([]);
      setShowSelector(false);
      loadLinks();
    }
  };

  const deleteLink = async (id: number) => {
    await fetch(`/api/shares/${id}`, { method: "DELETE" });
    setLinks(p => p.filter(l => l.id !== id));
    success("Link deleted");
  };

  const getFullUrl = (token: string) => `${window.location.origin}/shared/${token}`;

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }} className="fade-in">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Shared Links</h1>
          <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 2 }}>Create read-only links to share your subscriptions</p>
        </div>
        <button className="btn-primary" onClick={() => setShowSelector(true)}>+ Create New Link</button>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {loading ? <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>Loading...</div> :
        links.length === 0 ? <div style={{ padding: 48, textAlign: "center", color: "var(--muted)" }}>No shared links created yet.</div> :
        links.map((l, i) => (
          <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderBottom: i < links.length - 1 ? "1px solid var(--border-color)" : "none" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis" }}>{getFullUrl(l.token)}</div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Created {new Date(l.created_at).toLocaleDateString()} · {l.view_count || 0} views</div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {/* NEW VIEW BUTTON */}
              <a href={getFullUrl(l.token)} target="_blank" rel="noopener noreferrer" className="btn-ghost" style={{ padding: "6px 12px", fontSize: 12, textDecoration: "none" }}>👁️ View</a>
              
              <button className="btn-ghost" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => { navigator.clipboard.writeText(getFullUrl(l.token)); success("Link copied!"); }}>📋 Copy</button>
              <button style={{ background: "none", border: "none", color: "#EF4444", cursor: "pointer", padding: 4 }} onClick={() => deleteLink(l.id)}>🗑️</button>
            </div>
          </div>
        ))}
      </div>

      {/* SELECTION MODAL */}
      {showSelector && (
        <ModalPortal>
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(5px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
            <div onClick={e => e.stopPropagation()} style={{ background: "var(--surface)", borderRadius: 16, width: "100%", maxWidth: 440, border: "1px solid var(--border-color)", display: "flex", flexDirection: "column", maxHeight: "85vh" }}>
              <div style={{ padding: "20px 22px", borderBottom: "1px solid var(--border-color)" }}>
                <div style={{ fontWeight: 700, fontSize: 17 }}>Share Subscriptions</div>
                <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>Select the items you want to include in this link</div>
              </div>
              
              <div style={{ flex: 1, overflowY: "auto", padding: "10px 0" }}>
                {subs.filter(s => s.active).map(s => (
                  <label key={s.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 22px", cursor: "pointer", transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = "var(--surface2)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <input type="checkbox" checked={selectedIds.includes(s.id)} onChange={() => toggleSelect(s.id)} style={{ width: 18, height: 18, accentColor: "var(--accent)" }} />
                    {s.icon ? <img src={s.icon} width={24} height={24} style={{ borderRadius: 4, objectFit: "contain" }} /> : <span style={{ fontSize: 18 }}>📦</span>}
                    <div style={{ flex: 1, fontWeight: 500, fontSize: 14 }}>{s.name}</div>
                  </label>
                ))}
              </div>

              <div style={{ padding: "16px 22px", borderTop: "1px solid var(--border-color)", display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button className="btn-ghost" onClick={() => setShowSelector(false)}>Cancel</button>
                <button className="btn-primary" onClick={createLink} disabled={selectedIds.length === 0}>Create Link ({selectedIds.length})</button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}