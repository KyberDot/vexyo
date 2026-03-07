"use client";
import ModalPortal from "@/components/ModalPortal";
import { useState, useEffect } from "react";
import { useSubscriptions } from "@/lib/useSubscriptions";
import { useToast } from "@/components/Toast";

export default function SharesPage() {
  const { subs } = useSubscriptions();
  const { success, error: toastError } = useToast();
  const [links, setLinks] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState("");
  
  // Selection states
  const [showSelector, setShowSelector] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const load = async () => {
    setLoading(true); // Start loading
    const res = await fetch("/api/shares");
    const data = await res.json();
    setLinks(Array.isArray(data) ? data : []);
	setLoading(false); // Stop loading
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!label.trim() || selectedIds.length === 0) return;
    setCreating(true);
    
    try {
      const res = await fetch("/api/shares", { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ label, subscription_ids: selectedIds }) 
      });
      
      const data = await res.json();
      
      if (res.ok) {
        // Fix: Ensure the new link shows the label immediately
        setLinks(prev => [data, ...prev]); 
        setLabel("");
        setSelectedIds([]);
        setShowSelector(false);
        success("Shared link created!");
      } else {
        toastError(data.error || "Failed to create link");
      }
    } catch (e) {
      toastError("Error creating link");
    } finally {
      setCreating(false);
    }
  };

  const deactivate = async (id: number, linkLabel: string) => {
    if (!confirm(`Delete shared link "${linkLabel}"?`)) return;
    await fetch(`/api/shares/${id}`, { method: "DELETE" });
    setLinks(prev => prev.filter(l => l.id !== id));
    success("Link deleted");
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  // Common styles for the colored buttons
  const btnStyle: React.CSSProperties = {
    padding: "6px 14px",
    borderRadius: "8px",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
    border: "none",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    transition: "all 0.15s ease",
    textDecoration: "none"
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }} className="fade-in">
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Shared Links</h1>
      <p style={{ color: "var(--muted)", fontSize: 14 }}>Share a read-only view of your subscriptions with family members.</p>

      {/* ORIGINAL DESIGN: Create Section */}
      <div className="card">
        <div style={{ fontWeight: 600, marginBottom: 12 }}>Create New Link</div>
        <div style={{ display: "flex", gap: 8 }}>
          <input 
            className="input" 
            placeholder="Label (e.g. Partner, Family)" 
            value={label} 
            onChange={e => setLabel(e.target.value)} 
            onKeyDown={e => e.key === "Enter" && label.trim() && setShowSelector(true)} 
          />
          <button 
            className="btn-primary" 
            onClick={() => setShowSelector(true)} 
            disabled={creating || !label.trim()}
          >
            Create
          </button>
        </div>
      </div>

      {/* ORIGINAL DESIGN: List Section */}
      {links.length > 0 && (
        <div className="card" style={{ padding: 0 }}>
          {links.map((l, i) => (
            <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderBottom: i < links.length - 1 ? "1px solid var(--border-color)" : "none" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Fix: Displaying the link label correctly */}
                <div style={{ fontWeight: 600, fontSize: 14 }}>{l.label || "Shared Link"}</div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2, fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {baseUrl}/shared/{l.token}
                </div>
              </div>

              {/* COLORED BUTTONS */}
              <a 
                href={`${baseUrl}/shared/${l.token}`} 
                target="_blank" 
                rel="noopener noreferrer" 
                style={{ ...btnStyle, background: "rgba(99, 102, 241, 0.1)", color: "#6366F1" }}
              >
                👁️ View
              </a>

              <button 
                style={{ ...btnStyle, background: "#6366F1", color: "white" }}
                onClick={() => { navigator.clipboard.writeText(`${baseUrl}/shared/${l.token}`); success("Link copied!"); }}
              >
                📋 Copy
              </button>

              <button 
                style={{ ...btnStyle, background: "rgba(239, 68, 68, 0.1)", color: "#EF4444" }} 
                onClick={() => deactivate(l.id, l.label)}
              >
                🗑️ Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {links.length === 0 && !loading && (
        <div className="card" style={{ textAlign: "center", padding: 40, color: "var(--muted)", fontSize: 14 }}>
          No shared links yet. Create one above.
        </div>
      )}

      {/* SELECTION POPUP: MODERN DESIGN */}
      {showSelector && (
        <ModalPortal>
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(5px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => setShowSelector(false)}>
            <div onClick={e => e.stopPropagation()} style={{ background: "var(--surface)", borderRadius: 16, width: "100%", maxWidth: 420, border: "1px solid var(--border-color)", display: "flex", flexDirection: "column", maxHeight: "80vh", boxShadow: "0 24px 60px rgba(0,0,0,0.5)" }}>
              
              <div style={{ padding: "20px", borderBottom: "1px solid var(--border-color)" }}>
                <div style={{ fontWeight: 700, fontSize: 16 }}>Select Subscriptions</div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>Include items in "{label}"</div>
              </div>

              <div style={{ flex: 1, overflowY: "auto", padding: "10px 0" }}>
                {subs.filter(s => s.active).map(s => (
                  <label key={s.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 20px", cursor: "pointer", transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = "var(--surface2)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <input 
                      type="checkbox" 
                      checked={selectedIds.includes(s.id)} 
                      onChange={() => toggleSelect(s.id)} 
                      style={{ width: 18, height: 18, accentColor: "var(--accent)" }} 
                    />
                    <div style={{ width: 28, height: 28, borderRadius: 6, background: "var(--surface2)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                      {s.icon ? <img src={s.icon} width={20} height={20} style={{ objectFit: "contain" }} /> : <span style={{ fontSize: 14 }}>📦</span>}
                    </div>
                    <div style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{s.name}</div>
                  </label>
                ))}
              </div>

              <div style={{ padding: "16px 20px", borderTop: "1px solid var(--border-color)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button className="btn-ghost" onClick={() => setShowSelector(false)}>Cancel</button>
                <button 
                  className="btn-primary" 
                  onClick={create} 
                  disabled={selectedIds.length === 0 || creating}
                >
                  Confirm & Create ({selectedIds.length})
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}