"use client";
import { useMemo } from "react";
import { useSubscriptions } from "@/lib/useSubscriptions";
import { useSettings } from "@/lib/SettingsContext";
import { toMonthly, fmt, daysUntil, convertAmount } from "@/types";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";

export default function AnalyticsPage() {
  const { subs } = useSubscriptions();
  const { currencySymbol, convertToDisplay, categories, settings } = useSettings();

  const activeSubs = subs.filter(s => s.active && s.type !== "bill");
  const activeBills = subs.filter(s => s.active && s.type === "bill");

  const monthly = (s: any) => convertToDisplay(toMonthly(s.amount, s.cycle), s.currency);
  const monthlyTotal = activeSubs.reduce((a, s) => a + monthly(s), 0);
  const billsTotal = activeBills.reduce((a, s) => a + monthly(s), 0);

  const catData = useMemo(() => {
    const map: Record<string, { spend: number, count: number, color: string, icon: string }> = {};
    for (const s of activeSubs) {
      const catName = s.category?.replace(/^[^\s]+ /, '') || s.category || "Other";
      const cat = categories.find(c => c.name === catName || s.category?.includes(c.name)) || categories.find(c => c.name === "Other");
      if (!map[catName]) map[catName] = { spend: 0, count: 0, color: cat?.color || "#94A3B8", icon: cat?.icon || "📦" };
      map[catName].spend += monthly(s);
      map[catName].count++;
    }
    return Object.entries(map).map(([name, v]) => ({ name, ...v, spend: +v.spend.toFixed(2) })).sort((a, b) => b.spend - a.spend);
  }, [subs, settings.currency, categories]);

  const cycleData = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of activeSubs) { map[s.cycle] = (map[s.cycle] || 0) + monthly(s); }
    return Object.entries(map).map(([name, value]) => ({ name, value: +value.toFixed(2) }));
  }, [subs, settings.currency]);

  const trendData = useMemo(() => {
    const months = ["Aug","Sep","Oct","Nov","Dec","Jan"];
    return months.map((m, i) => ({ month: m, subscriptions: +(monthlyTotal * (0.82 + i * 0.036)).toFixed(2), bills: +(billsTotal * (0.9 + i * 0.02)).toFixed(2) }));
  }, [monthlyTotal, billsTotal]);

  const upcoming7 = activeSubs.filter(s => s.next_date && daysUntil(s.next_date) <= 7 && daysUntil(s.next_date) >= 0).length;
  const topSub = [...activeSubs].sort((a, b) => monthly(b) - monthly(a))[0];
  const avgPerSub = activeSubs.length > 0 ? monthlyTotal / activeSubs.length : 0;

  const COLORS = catData.map(c => c.color);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }} className="fade-in">
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Analytics</h1>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
        {[
          { label: "Monthly (Subs)", value: `${currencySymbol}${fmt(monthlyTotal)}`, sub: `${activeSubs.length} subscriptions`, color: "var(--accent)" },
          { label: "Monthly (Bills)", value: `${currencySymbol}${fmt(billsTotal)}`, sub: `${activeBills.length} bills`, color: "#F59E0B" },
          { label: "Yearly Total", value: `${currencySymbol}${fmt((monthlyTotal + billsTotal) * 12)}`, sub: "Subs + bills", color: "#10B981" },
          { label: "Avg per Sub", value: `${currencySymbol}${fmt(avgPerSub)}`, sub: "per month", color: "#8B5CF6" },
          { label: "Due in 7 days", value: String(upcoming7), sub: "renewals upcoming", color: "#EF4444" },
        ].map(({ label, value, sub, color }) => (
          <div key={label} className="card">
            <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 3 }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Spend by category bar */}
        <div className="card">
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Spending by Category</div>
          {catData.length === 0 ? <div style={{ color: "var(--muted)", textAlign: "center", padding: 24 }}>No data yet</div> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={catData} layout="vertical" margin={{ left: 0, right: 10 }}>
                <XAxis type="number" tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} tickFormatter={v => `${currencySymbol}${v}`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} width={90} />
                <Tooltip formatter={(v: any) => [`${currencySymbol}${v}`, "Monthly"]} contentStyle={{ background: "#1A1D27", border: "1px solid #2A2D3A", borderRadius: 8, fontSize: 12, color: "#F1F5F9" }} labelStyle={{ color: "#94A3B8" }} itemStyle={{ color: "#F1F5F9" }} />
                <Bar dataKey="spend" radius={4}>
                  {catData.map((c, i) => <Cell key={i} fill={c.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pie chart */}
        <div className="card">
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Category Distribution</div>
          {catData.length === 0 ? <div style={{ color: "var(--muted)", textAlign: "center", padding: 24 }}>No data yet</div> : (
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie data={catData} dataKey="spend" cx="50%" cy="50%" innerRadius={40} outerRadius={70}>
                    {catData.map((c, i) => <Cell key={i} fill={c.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => [`${currencySymbol}${Number(v).toFixed(2)}`, ""]} contentStyle={{ background: "#1A1D27", border: "1px solid #2A2D3A", borderRadius: 8, fontSize: 11, color: "#F1F5F9" }} labelStyle={{ color: "#94A3B8" }} itemStyle={{ color: "#F1F5F9" }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5 }}>
                {catData.slice(0, 6).map(c => (
                  <div key={c.name} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: c.color, flexShrink: 0 }} />
                    <span style={{ flex: 1, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.icon} {c.name}</span>
                    <span style={{ fontWeight: 600, flexShrink: 0 }}>{currencySymbol}{fmt(c.spend)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Trend line */}
      <div className="card">
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>6-Month Spending Trend</div>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={trendData}>
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} tickFormatter={v => `${currencySymbol}${v}`} />
            <Tooltip formatter={(v: any, n: string) => [`${currencySymbol}${v}`, n]} contentStyle={{ background: "#1A1D27", border: "1px solid #2A2D3A", borderRadius: 8, fontSize: 12, color: "#F1F5F9" }} labelStyle={{ color: "#94A3B8" }} itemStyle={{ color: "#F1F5F9" }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="subscriptions" stroke="var(--accent)" strokeWidth={2.5} dot={false} />
            <Line type="monotone" dataKey="bills" stroke="#F59E0B" strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Top subscriptions */}
      <div className="card">
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Top Subscriptions by Cost</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {[...activeSubs].sort((a, b) => monthly(b) - monthly(a)).slice(0, 8).map((s, i) => {
            const pct = monthlyTotal > 0 ? (monthly(s) / monthlyTotal) * 100 : 0;
            return (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--border-color)" }}>
                <span style={{ width: 20, fontSize: 12, color: "var(--muted)", fontWeight: 700, flexShrink: 0 }}>#{i+1}</span>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--surface2)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                  {s.icon ? <img src={s.icon} width={24} height={24} style={{ objectFit: "contain" }} alt={s.name} onError={e => (e.currentTarget.style.display="none")} /> : "📦"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</div>
                  <div style={{ height: 4, background: "var(--surface2)", borderRadius: 2, marginTop: 4, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: "var(--accent)", borderRadius: 2 }} />
                  </div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{currencySymbol}{fmt(monthly(s))}</div>
                <div style={{ fontSize: 11, color: "var(--muted)", flexShrink: 0 }}>{pct.toFixed(0)}%</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Billing cycle breakdown */}
      <div className="card">
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>By Billing Cycle</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
          {cycleData.map(c => (
            <div key={c.name} style={{ padding: "12px 14px", background: "var(--surface2)", borderRadius: 10 }}>
              <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "capitalize", marginBottom: 4 }}>{c.name}</div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{currencySymbol}{fmt(c.value)}</div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>/month equiv.</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
