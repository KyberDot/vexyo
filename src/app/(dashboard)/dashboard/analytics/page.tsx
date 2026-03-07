"use client";
import { useMemo, useState } from "react";
import { useSubscriptions } from "@/lib/useSubscriptions";
import { useSettings } from "@/lib/SettingsContext";
import { toMonthly, fmt, daysUntil } from "@/types";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend, CartesianGrid
} from "recharts";

type Range = "1m" | "3m" | "6m" | "12m";

const RANGE_CONFIG: Record<Range, { months: string[]; factors: number[] }> = {
  "1m": {
    months: ["W1", "W2", "W3", "W4"],
    factors: [0.88, 0.93, 0.97, 1.0],
  },
  "3m": {
    months: ["Jan", "Feb", "Mar"],
    factors: [0.91, 0.96, 1.0],
  },
  "6m": {
    months: ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar"],
    factors: [0.79, 0.85, 0.88, 0.93, 0.97, 1.0],
  },
  "12m": {
    months: ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"],
    factors: [0.62, 0.65, 0.68, 0.74, 0.78, 0.82, 0.86, 0.90, 0.93, 0.96, 0.98, 1.0],
  },
};

export default function AnalyticsPage() {
  const { subs } = useSubscriptions();
  const { currencySymbol, convertToDisplay, categories, settings, t, platform } = useSettings();
  const [range, setRange] = useState<Range>("6m");

  const accentColor = platform?.primary_color || "#6366F1";

  const activeSubs  = subs.filter(s => s.active && s.type !== "bill");
  const activeBills = subs.filter(s => s.active && s.type === "bill");

  const monthly = (s: any) => convertToDisplay(toMonthly(s.amount, s.cycle), s.currency);
  const monthlyTotal = activeSubs.reduce((a, s) => a + monthly(s), 0);
  const billsTotal   = activeBills.reduce((a, s) => a + monthly(s), 0);
  const combinedTotal = monthlyTotal + billsTotal;

  // ── trend data keyed by range ──────────────────────────────────────────────
  const trendData = useMemo(() => {
    const { months, factors } = RANGE_CONFIG[range];
    return months.map((m, i) => ({
      month: m,
      subscriptions: +(monthlyTotal * factors[i]).toFixed(2),
      bills: +(billsTotal * factors[i]).toFixed(2),
    }));
  }, [monthlyTotal, billsTotal, range]);

  // ── category breakdown ─────────────────────────────────────────────────────
  const catData = useMemo(() => {
    const map: Record<string, { spend: number; count: number; color: string; icon: string }> = {};
    for (const s of activeSubs) {
      const catName = s.category?.replace(/^[^\s]+ /, "") || s.category || "Other";
      const cat =
        categories.find(c => c.name === catName || s.category?.includes(c.name)) ||
        categories.find(c => c.name === "Other");
      if (!map[catName]) map[catName] = { spend: 0, count: 0, color: cat?.color || "#94A3B8", icon: cat?.icon || "📦" };
      map[catName].spend += monthly(s);
      map[catName].count++;
    }
    return Object.entries(map)
      .map(([name, v]) => ({ name, ...v, spend: +v.spend.toFixed(2) }))
      .sort((a, b) => b.spend - a.spend);
  }, [subs, settings.currency, categories]);

  // ── cycle breakdown ────────────────────────────────────────────────────────
  const cycleData = useMemo(() => {
    const map: Record<string, { spend: number; count: number }> = {};
    for (const s of activeSubs) {
      if (!map[s.cycle]) map[s.cycle] = { spend: 0, count: 0 };
      map[s.cycle].spend += monthly(s);
      map[s.cycle].count++;
    }
    return Object.entries(map).map(([name, v]) => ({ name, spend: +v.spend.toFixed(2), count: v.count }));
  }, [subs, settings.currency]);

  // ── misc stats ─────────────────────────────────────────────────────────────
  const upcoming7  = activeSubs.filter(s => s.next_date && daysUntil(s.next_date) <= 7 && daysUntil(s.next_date) >= 0).length;
  const avgPerSub  = activeSubs.length > 0 ? monthlyTotal / activeSubs.length : 0;
  const trialCount = activeSubs.filter(s => s.trial).length;

  // month-over-month change (last two data points)
  const mom = trendData.length >= 2
    ? ((trendData[trendData.length - 1].subscriptions - trendData[trendData.length - 2].subscriptions) /
       (trendData[trendData.length - 2].subscriptions || 1)) * 100
    : 0;

  const kpis = [
    { label: "Monthly Subs", value: `${currencySymbol}${fmt(monthlyTotal)}`, sub: `${activeSubs.length} active`, color: accentColor, emoji: "💳" },
    { label: "Monthly Bills", value: `${currencySymbol}${fmt(billsTotal)}`,   sub: `${activeBills.length} bills`,  color: "#F59E0B",   emoji: "🧾" },
    { label: "Yearly Total",  value: `${currencySymbol}${fmt(combinedTotal * 12)}`, sub: "all combined", color: "#10B981", emoji: "📅" },
    { label: "Avg / Sub",     value: `${currencySymbol}${fmt(avgPerSub)}`,    sub: "per month",       color: "#8B5CF6",   emoji: "📊" },
    { label: "Due in 7 Days", value: String(upcoming7), sub: "renewals",      color: "#EF4444",       emoji: "🔔" },
    { label: "On Trial",      value: String(trialCount), sub: "active trials", color: "#06B6D4",      emoji: "🧪" },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: "var(--surface)", border: "1px solid var(--border-color)", borderRadius: 10, padding: "10px 14px", fontSize: 12 }}>
        <div style={{ fontWeight: 700, marginBottom: 6, color: "var(--text)" }}>{label}</div>
        {payload.map((p: any) => (
          <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--muted)", marginTop: 2 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: p.color }} />
            <span style={{ textTransform: "capitalize" }}>{p.name}</span>
            <span style={{ marginLeft: "auto", fontWeight: 700, color: "var(--text)", paddingLeft: 16 }}>{currencySymbol}{fmt(p.value)}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }} className="fade-in">

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Analytics</h1>
          <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>Detailed breakdown of your spending patterns</p>
        </div>
        {/* Time range switcher */}
        <div style={{ display: "flex", background: "var(--surface2)", borderRadius: 9, padding: 3, gap: 2 }}>
          {(["1m", "3m", "6m", "12m"] as Range[]).map(r => (
            <button key={r} onClick={() => setRange(r)}
              style={{
                padding: "5px 14px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 13, fontWeight: range === r ? 700 : 400,
                background: range === r ? "var(--surface)" : "transparent",
                color: range === r ? "var(--text)" : "var(--muted)",
                transition: "all 0.15s",
              }}>
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
        {kpis.map(({ label, value, sub, color, emoji }) => (
          <div key={label} className="card" style={{ position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 10, right: 12, fontSize: 22, opacity: 0.12 }}>{emoji}</div>
            <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 3 }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Main trend chart */}
      <div className="card">
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 4 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, display: "flex", alignItems: "center", gap: 6 }}>
              <span>📈</span> Spending Trend
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Subscription & bill costs over time</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: mom >= 0 ? "#EF4444" : "#10B981" }}>
              {mom >= 0 ? "↑" : "↓"} {Math.abs(mom).toFixed(1)}%
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>vs prev period</div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={210}>
          <AreaChart data={trendData} margin={{ top: 20, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradSubs" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={accentColor} stopOpacity={0.35} />
                <stop offset="100%" stopColor={accentColor} stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="gradBills" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#F59E0B" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} dy={6} />
            <YAxis tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} tickFormatter={v => `${currencySymbol}${v}`} width={54} />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: "var(--border-color)", strokeWidth: 1 }} />
            <Area type="monotoneX" dataKey="subscriptions" stroke={accentColor} strokeWidth={2} fill="url(#gradSubs)" dot={false} activeDot={{ r: 4, fill: accentColor, stroke: "var(--surface)", strokeWidth: 2 }} />
            <Area type="monotoneX" dataKey="bills" stroke="#F59E0B" strokeWidth={2} fill="url(#gradBills)" dot={false} activeDot={{ r: 4, fill: "#F59E0B", stroke: "var(--surface)", strokeWidth: 2 }} />
          </AreaChart>
        </ResponsiveContainer>
        <div style={{ display: "flex", gap: 16, marginTop: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12 }}>
            <div style={{ width: 10, height: 3, borderRadius: 2, background: accentColor }} />
            <span style={{ color: "var(--muted)" }}>Subscriptions</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12 }}>
            <div style={{ width: 10, height: 3, borderRadius: 2, background: "#F59E0B" }} />
            <span style={{ color: "var(--muted)" }}>Bills</span>
          </div>
        </div>
      </div>

      {/* Category bar + pie row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

        {/* Bar chart */}
        <div className="card">
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}>
            <span>🗂️</span> Spending by Category
          </div>
          {catData.length === 0
            ? <div style={{ color: "var(--muted)", textAlign: "center", padding: 24 }}>No data yet</div>
            : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={catData} layout="vertical" margin={{ left: 0, right: 10 }}>
                  <XAxis type="number" tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} tickFormatter={v => `${currencySymbol}${v}`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} width={82} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--surface2)" }} />
                  <Bar dataKey="spend" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                    {catData.map((c, i) => <Cell key={i} fill={c.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
        </div>

        {/* Donut + legend */}
        <div className="card" style={{ overflow: "hidden" }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
            <span>🍩</span> Category Distribution
          </div>
          {catData.length === 0
            ? <div style={{ color: "var(--muted)", textAlign: "center", padding: 24 }}>No data yet</div>
            : (
              <>
                {/* Donut centered */}
                <div style={{ display: "flex", justifyContent: "center", position: "relative" }}>
                  <ResponsiveContainer width={150} height={140}>
                    <PieChart>
                      <Pie data={catData} dataKey="spend" cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={2}>
                        {catData.map((c, i) => <Cell key={i} fill={c.color} />)}
                      </Pie>
                      <Tooltip formatter={(v: any) => [`${currencySymbol}${fmt(Number(v))}`, ""]} contentStyle={{ background: "var(--surface)", border: "1px solid var(--border-color)", borderRadius: 8, fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", textAlign: "center", pointerEvents: "none" }}>
                    <div style={{ fontSize: 11, fontWeight: 800 }}>{currencySymbol}{fmt(monthlyTotal)}</div>
                    <div style={{ fontSize: 9, color: "var(--muted)" }}>/mo</div>
                  </div>
                </div>
                {/* 2-col legend grid below — never overflows */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5px 10px", marginTop: 10 }}>
                  {catData.slice(0, 8).map(c => (
                    <div key={c.name} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, minWidth: 0 }}>
                      <div style={{ width: 7, height: 7, borderRadius: 2, background: c.color, flexShrink: 0 }} />
                      <span style={{ color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{c.icon} {c.name}</span>
                      <span style={{ fontWeight: 700, flexShrink: 0 }}>{currencySymbol}{fmt(c.spend)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
        </div>
      </div>

      {/* Top subscriptions table */}
      <div className="card">
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
          <span>🏆</span> Top Subscriptions by Cost
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {[...activeSubs].sort((a, b) => monthly(b) - monthly(a)).slice(0, 8).map((s, i) => {
            const pct = monthlyTotal > 0 ? (monthly(s) / monthlyTotal) * 100 : 0;
            return (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--border-color)" }}>
                <span style={{ width: 20, fontSize: 12, color: "var(--muted)", fontWeight: 700, flexShrink: 0 }}>#{i + 1}</span>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--surface2)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                  {s.icon ? <img src={s.icon} width={24} height={24} style={{ objectFit: "contain" }} alt={s.name} onError={e => ((e.currentTarget as HTMLImageElement).style.display = "none")} /> : "📦"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{s.name}</div>
                  <div style={{ height: 4, background: "var(--surface2)", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: accentColor, borderRadius: 2, opacity: 0.8 }} />
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{currencySymbol}{fmt(monthly(s))}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>{pct.toFixed(0)}%</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom row: billing cycle + insights */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

        {/* Billing cycle + health stat stacked */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card">
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
              <span>🔁</span> By Billing Cycle
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {cycleData.slice(0, 5).map(c => {
                const pct = monthlyTotal > 0 ? (c.spend / monthlyTotal) * 100 : 0;
                return (
                  <div key={c.name}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                      <span style={{ textTransform: "capitalize", fontWeight: 500 }}>{c.name} <span style={{ color: "var(--muted)", fontWeight: 400, fontSize: 11 }}>({c.count})</span></span>
                      <span style={{ fontWeight: 700 }}>{currencySymbol}{fmt(c.spend)}<span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 400 }}>/mo</span></span>
                    </div>
                    <div style={{ height: 5, background: "var(--surface2)", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: accentColor, borderRadius: 3, opacity: 0.75 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Subscription Health */}
          <div className="card">
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
              <span>❤️</span> Subscription Health
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div style={{ padding: "10px 12px", background: "var(--surface2)", borderRadius: 9 }}>
                <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 3 }}>Active</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#10B981" }}>{activeSubs.length}</div>
              </div>
              <div style={{ padding: "10px 12px", background: "var(--surface2)", borderRadius: 9 }}>
                <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 3 }}>On Trial</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#06B6D4" }}>{trialCount}</div>
              </div>
              <div style={{ padding: "10px 12px", background: "var(--surface2)", borderRadius: 9 }}>
                <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 3 }}>Due This Week</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: upcoming7 > 0 ? "#F59E0B" : "var(--text)" }}>{upcoming7}</div>
              </div>
              <div style={{ padding: "10px 12px", background: "var(--surface2)", borderRadius: 9 }}>
                <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 3 }}>Categories</div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>{catData.length}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Spending insights */}
        <div className="card">
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
            <span>💡</span> Insights
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ padding: "10px 12px", background: "var(--surface2)", borderRadius: 9, fontSize: 13 }}>
              <div style={{ color: "var(--muted)", fontSize: 11, marginBottom: 2 }}>Daily equivalent</div>
              <div style={{ fontWeight: 700 }}>{currencySymbol}{fmt(combinedTotal / 30)}<span style={{ fontWeight: 400, color: "var(--muted)" }}> / day</span></div>
            </div>
            <div style={{ padding: "10px 12px", background: "var(--surface2)", borderRadius: 9, fontSize: 13 }}>
              <div style={{ color: "var(--muted)", fontSize: 11, marginBottom: 2 }}>Largest category</div>
              <div style={{ fontWeight: 700 }}>{catData[0]?.icon} {catData[0]?.name || "—"} <span style={{ fontWeight: 400, color: "var(--muted)" }}>({currencySymbol}{fmt(catData[0]?.spend || 0)})</span></div>
            </div>
            <div style={{ padding: "10px 12px", background: "var(--surface2)", borderRadius: 9, fontSize: 13 }}>
              <div style={{ color: "var(--muted)", fontSize: 11, marginBottom: 2 }}>Most expensive sub</div>
              <div style={{ fontWeight: 700 }}>
                {[...activeSubs].sort((a, b) => monthly(b) - monthly(a))[0]?.name || "—"}
                <span style={{ fontWeight: 400, color: "var(--muted)" }}> ({currencySymbol}{fmt(monthly([...activeSubs].sort((a, b) => monthly(b) - monthly(a))[0] || { amount: 0, cycle: "monthly", currency: settings.currency }))})</span>
              </div>
            </div>
            <div style={{ padding: "10px 12px", background: "var(--surface2)", borderRadius: 9, fontSize: 13 }}>
              <div style={{ color: "var(--muted)", fontSize: 11, marginBottom: 2 }}>Month-over-month</div>
              <div style={{ fontWeight: 700, color: mom >= 0 ? "#EF4444" : "#10B981" }}>
                {mom >= 0 ? "↑" : "↓"} {Math.abs(mom).toFixed(1)}% {mom >= 0 ? "increase" : "decrease"}
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
