import { getDb } from "@/lib/db";
import { toMonthly, fmt, CURRENCY_SYMBOLS } from "@/types";
import { notFound } from "next/navigation";

export default function SharedPage({ params }: { params: { token: string } }) {
  const db = getDb();
  
  // Fetch the shared link details
  const link = db.prepare(`
    SELECT sl.*, u.name as sharer_name
    FROM shared_links sl
    LEFT JOIN users u ON u.id = sl.user_id
    WHERE sl.token = ? AND sl.active = 1
  `).get(params.token) as any;

  if (!link) notFound();

  // Updated query to only fetch subscriptions mapped to this specific link
  const subs = db.prepare(`
    SELECT s.* FROM subscriptions s
    INNER JOIN shared_link_items sli ON sli.subscription_id = s.id
    WHERE sli.link_id = ? AND s.active = 1
    ORDER BY s.name
  `).all(link.id) as any[];

  const currency = link.currency || "USD";
  const sym = CURRENCY_SYMBOLS[currency] || currency;
  const monthlyTotal = subs.reduce((a: number, s: any) => a + toMonthly(s.amount, s.cycle), 0);

  return (
    <div style={{ minHeight: "100vh", background: "#0F1117", padding: 32, fontFamily: "DM Sans, sans-serif" }}>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>💰</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#fff" }}>Shared Subscriptions</h1>
          {link.sharer_name && (
            <p style={{ color: "#9CA3AF", fontSize: 14, marginTop: 4 }}>
              Shared by <strong style={{ color: "#fff" }}>{link.sharer_name}</strong> via Vexyo · Read-only view
            </p>
          )}
          <div style={{ marginTop: 12, fontSize: 20, fontWeight: 700, color: "#6366F1" }}>{sym}{fmt(monthlyTotal)}/mo</div>
        </div>

        <div style={{ background: "#1A1D27", border: "1px solid #2A2D3A", borderRadius: 12, overflow: "hidden" }}>
          {subs.length === 0 ? (
             <div style={{ padding: 48, textAlign: "center", color: "#9CA3AF" }}>No items shared in this link.</div>
          ) : subs.map((s: any, i: number) => (
            <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: i < subs.length - 1 ? "1px solid #2A2D3A" : "none" }}>
              {/* Fixed icon background for dark mode */}
              {s.icon ? (
                <img 
                  src={s.icon} 
                  width={32} 
                  height={32} 
                  style={{ borderRadius: 8, background: "#2A2D3A", padding: 2, objectFit: "contain" }} 
                  alt={s.name} 
                />
              ) : (
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "#2A2D3A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>📦</div>
              )}
              
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: "#fff" }}>{s.name}</div>
                <div style={{ fontSize: 12, color: "#9CA3AF" }}>{s.category} · {s.cycle}</div>
              </div>
              <div style={{ fontWeight: 700, color: "#fff" }}>
                {s.cycle === "variable" ? <span style={{ color: "#9CA3AF" }}>Variable</span> : `${sym}${fmt(toMonthly(s.amount, s.cycle))}/mo`}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}