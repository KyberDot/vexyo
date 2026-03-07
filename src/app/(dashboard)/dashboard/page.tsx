"use client";
import { useState, useMemo, useEffect } from "react";
import { useSubscriptions } from "@/lib/useSubscriptions";
import { useSettings } from "@/lib/SettingsContext";
import { toMonthly, daysUntil, fmt } from "@/types";
import SubModal from "@/components/SubModal";
import Link from "next/link";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useSession } from "next-auth/react";

export default function DashboardPage() {
  const { subs, loading, add } = useSubscriptions();
  const { settings, currencySymbol, convertToDisplay, platform, t } = useSettings();
  const { data: session } = useSession();
  const [showModal, setShowModal] = useState(false);
  const [debts, setDebts] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/debts").then(r => r.json()).then(d => { if (Array.isArray(d)) setDebts(d); }).catch(() => {});
  }, []);

  const activeSubs = subs.filter(s => s.active);

  const monthlyTotal = activeSubs.reduce((a, s) =>
    a + convertToDisplay(toMonthly(s.amount, s.cycle), s.currency), 0);
  const yearlyTotal = monthlyTotal * 12;
  const budget = settings.monthly_budget || 0;
  const budgetPct = budget > 0 ? Math.min((monthlyTotal / budget) * 100, 100) : 0;
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const dayOfMonth = new Date().getDate();
  const daysRemaining = daysInMonth - dayOfMonth;

  const dailyRate = monthlyTotal / (daysInMonth || 1);
  const remainingBudget = budget > 0 ? Math.max(0, budget - monthlyTotal) : 0;
  const daysUntilBudgetHit = budget > 0 && dailyRate > 0 && remainingBudget > 0
    ? Math.floor(remainingBudget / dailyRate)
    : null;

  const topCategory = useMemo(() => {
    const map: Record<string, number> = {};
    activeSubs.forEach(s => { map[s.category] = (map[s.category] || 0) + convertToDisplay(toMonthly(s.amount, s.cycle), s.currency); });
    const top = Object.entries(map).sort((a, b) => b[1] - a[1])[0];
    return top ? { name: top[0], amount: top[1] } : null;
  }, [subs, settings.currency]);

  const nextRenewal = useMemo(() => {
    return [...activeSubs]
      .filter(s => s.next_date)
      .sort((a, b) => new Date(a.next_date!).getTime() - new Date(b.next_date!).getTime())[0];
  }, [subs]);

  const upcomingRenewals = useMemo(() =>
    [...activeSubs]
      .filter(s => s.next_date && daysUntil(s.next_date) <= 7 && daysUntil(s.next_date) >= 0)
      .sort((a, b) => new Date(a.next_date!).getTime() - new Date(b.next_date!).getTime())
      .slice(0, 5),
    [subs]);

  const upcomingCost = upcomingRenewals.reduce((a, s) => a + convertToDisplay(s.amount, s.currency), 0);

  const monthlyData = useMemo(() => {
    const months = ["Sep", "Oct", "Nov", "Dec", "Jan", "Feb"];
    const factors = [0.72, 0.85, 0.79, 0.93, 0.88, 1.0];
    return months.map((m, i) => ({ month: m, amount: +(monthlyTotal * factors[i]).toFixed(2) }));
  }, [monthlyTotal]);

  // Debt analytics
  const activeDebts = debts.filter(d => d.active && (d.amount - d.paid) > 0);
  const totalDebtOwed = activeDebts.reduce((a: number, d: any) => a + convertToDisplay(d.amount - d.paid, d.currency), 0);
  const totalDebtAmount = activeDebts.reduce((a: number, d: any) => a + convertToDisplay(d.amount, d.currency), 0);
  const totalDebtPaid = activeDebts.reduce((a: number, d: any) => a + convertToDisplay(d.paid, d.currency), 0);
  const debtPayoffPct = totalDebtAmount > 0 ? (totalDebtPaid / totalDebtAmount) * 100 : 0;
  const overdueDebts = activeDebts.filter((d: any) => d.due_date && new Date(d.due_date) < new Date());
  const shortTermDebts = activeDebts.filter((d: any) => (d.term ?? "short") === "short");
  const longTermDebts  = activeDebts.filter((d: any) => d.term === "long");

  const budgetColor = budgetPct >= 90 ? "#EF4444" : budgetPct >= 70 ? "#F59E0B" : "#10B981";
  const accentColor = platform.primary_color || "#6366F1";

  if (loading) return <div style={{ color: "var(--muted)", padding: 24 }}>Loading...</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 52, height: 52, borderRadius: 99, background: `${accentColor}20`, border: `2px solid ${accentColor}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, overflow: "hidden" }}>
            {session?.user && (session.user as any).avatar
              ? <img src={(session.user as any).avatar} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="avatar" />
              : "👤"}
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800 }}>Welcome back, {session?.user?.name?.split(" ")[0] || "User"}!</h1>
            <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 2 }}>Here's your subscription overview and spending insights</p>
          </div>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)} style={{ background: accentColor }}>+ Add</button>
      </div>

      {/* Stats Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 500 }}>Monthly Spending</div>
            <span style={{ fontSize: 18, opacity: 0.5 }}>💵</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, marginTop: 8, color: accentColor }}>{currencySymbol}{fmt(monthlyTotal)}</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>Yearly: {currencySymbol}{fmt(yearlyTotal)}</div>
        </div>

        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 500 }}>Active Subscriptions</div>
            <span style={{ fontSize: 18, opacity: 0.5 }}>📋</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, marginTop: 8 }}>{activeSubs.length}</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>Average {currencySymbol}{fmt(monthlyTotal / (activeSubs.length || 1))} each</div>
        </div>

        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 500 }}>Top Category</div>
            <span style={{ fontSize: 18, opacity: 0.5 }}>📊</span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, marginTop: 8 }}>{topCategory?.name || "—"}</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>{topCategory ? `${currencySymbol}${fmt(topCategory.amount)}/month` : "No data"}</div>
        </div>

        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 500 }}>Next Renewal</div>
            <span style={{ fontSize: 18, opacity: 0.5 }}>📅</span>
          </div>
          {nextRenewal ? (
            <>
              <div style={{ fontSize: 22, fontWeight: 800, marginTop: 8 }}>
                {daysUntil(nextRenewal.next_date!) === 0 ? "Today" : daysUntil(nextRenewal.next_date!) === 1 ? "Tomorrow" : `in ${daysUntil(nextRenewal.next_date!)} days`}
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>{nextRenewal.name} · {currencySymbol}{fmt(convertToDisplay(nextRenewal.amount, nextRenewal.currency))}</div>
            </>
          ) : <div style={{ fontSize: 20, fontWeight: 800, marginTop: 8 }}>—</div>}
        </div>
      </div>

      {/* Budget + Upcoming side by side */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

        {/* Budget tracker */}
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, display: "flex", alignItems: "center", gap: 6 }}>
                <span>🎯</span> Monthly Budget
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Track your spending against your budget</div>
            </div>
            {budget > 0 && <div style={{ fontSize: 13, color: "var(--muted)" }}>Budget: {currencySymbol}{fmt(budget)}</div>}
          </div>

          {budget > 0 ? (
            <div style={{ marginTop: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{currencySymbol}{fmt(monthlyTotal)} of {currencySymbol}{fmt(budget)}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: budgetColor }}>{Math.round(budgetPct)}%</span>
              </div>
              <div style={{ height: 8, background: "var(--surface2)", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ width: `${budgetPct}%`, height: "100%", background: budgetColor, borderRadius: 4, transition: "width 0.5s ease" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, fontSize: 13, color: "var(--muted)" }}>
                <span>vs. Last month</span>
                <span style={{ color: "#EF4444", fontWeight: 600 }}>↑ 5%</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 13, color: "var(--muted)" }}>
                <span>Days remaining</span>
                <span style={{ fontWeight: 600, color: "var(--text)" }}>{daysRemaining} days</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 13, color: "var(--muted)" }}>
                <span>Yearly projection</span>
                <span style={{ fontWeight: 600, color: "var(--text)" }}>{currencySymbol}{fmt(yearlyTotal)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 13, color: "var(--muted)" }}>
                <span>Daily burn rate</span>
                <span style={{ fontWeight: 600, color: "var(--text)" }}>{currencySymbol}{fmt(dailyRate)}/day</span>
              </div>
              {daysUntilBudgetHit !== null ? (
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 13, color: "var(--muted)" }}>
                  <span>Budget runs out in</span>
                  <span style={{ fontWeight: 600, color: daysUntilBudgetHit <= 7 ? "#EF4444" : daysUntilBudgetHit <= 14 ? "#F59E0B" : "var(--text)" }}>
                    {daysUntilBudgetHit} days
                  </span>
                </div>
              ) : budgetPct >= 100 ? (
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 13, color: "var(--muted)" }}>
                  <span>Budget runs out in</span>
                  <span style={{ fontWeight: 600, color: "#EF4444" }}>Over budget</span>
                </div>
              ) : null}
              <div style={{ marginTop: 14, padding: "10px 12px", background: `${budgetColor}12`, borderRadius: 8, fontSize: 13, color: budgetColor, display: "flex", alignItems: "center", gap: 6 }}>
                <span>{budgetPct < 70 ? "✅" : budgetPct < 90 ? "⚠️" : "🚨"}</span>
                <span>{budgetPct < 70 ? "Great job! You're well within your budget." : budgetPct < 90 ? "You're getting close to your budget." : "You've exceeded your budget!"}</span>
              </div>
            </div>
          ) : (
            <div style={{ marginTop: 20, textAlign: "center", padding: "24px 0" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🎯</div>
              <div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 12 }}>Set a monthly budget to track your spending</div>
              <Link href="/dashboard/settings" className="btn-primary" style={{ fontSize: 13, background: accentColor }}>Set Budget →</Link>
            </div>
          )}
        </div>

        {/* Upcoming renewals — original layout exactly */}
        <div className="card" style={{ maxHeight: "325px", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexShrink: 0 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>🔔 Upcoming Renewals</div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Next 7 days</div>
            </div>
            <Link href="/dashboard/subscriptions" style={{ fontSize: 13, color: accentColor, textDecoration: "none", fontWeight: 600 }}>View All →</Link>
          </div>
          <div style={{ flex: 1, overflowY: "auto", paddingRight: 20, marginRight: -4 }} className="custom-scrollbar">
            {upcomingRenewals.length === 0 ? (
              <div style={{ textAlign: "center", padding: "24px 0", color: "var(--muted)", fontSize: 14 }}>🎉 No renewals in the next 7 days</div>
            ) : upcomingRenewals.map(s => {
              const days = daysUntil(s.next_date!);
              const dayLabel = days === 0 ? "Today" : days === 1 ? "Tomorrow" : `in ${days} days`;
              return (
                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--border-color)" }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: "var(--surface2)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                    {s.icon ? <img src={s.icon} width={28} height={28} style={{ objectFit: "contain" }} alt={s.name} onError={e => (e.currentTarget.style.display = "none")} /> : <span style={{ fontSize: 16 }}>📦</span>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>{currencySymbol}{fmt(convertToDisplay(s.amount, s.currency))} / {s.cycle === "monthly" ? "Monthly" : s.cycle}</div>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: days === 0 ? "#EF4444" : days <= 3 ? "#F59E0B" : "var(--muted)", whiteSpace: "nowrap" }}>{dayLabel}</span>
                </div>
              );
            })}
          </div>
          {upcomingRenewals.length > 0 && (
            <div style={{ marginTop: 10, flexShrink: 0, padding: "7px 12px", background: `${accentColor}10`, borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
              <span style={{ color: "var(--muted)" }}>{upcomingRenewals.length} renewal{upcomingRenewals.length !== 1 ? "s" : ""} due</span>
              <span style={{ fontWeight: 700, color: accentColor }}>{currencySymbol}{fmt(upcomingCost)} total</span>
            </div>
          )}
        </div>
      </div>

      {/* Spend trend */}
      <div className="card">
        <div style={{ marginBottom: 4 }}>
          <div style={{ fontWeight: 700, fontSize: 16, display: "flex", alignItems: "center", gap: 6 }}>
            <span>📈</span> Spending Trend
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Monthly subscription spending over time</div>
        </div>
        <ResponsiveContainer width="100%" height={190}>
          <AreaChart data={monthlyData} margin={{ top: 20, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={accentColor} stopOpacity={0.35} />
                <stop offset="100%" stopColor={accentColor} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} dy={6} />
            <YAxis tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} tickFormatter={v => `${currencySymbol}${v}`} width={52} />
            <Tooltip
              formatter={(v: any) => [`${currencySymbol}${fmt(v)}`, "Spend"]}
              contentStyle={{ background: "var(--surface)", border: "1px solid var(--border-color)", borderRadius: 8, fontSize: 12 }}
              cursor={{ stroke: "var(--border-color)", strokeWidth: 1 }}
            />
            <Area type="monotoneX" dataKey="amount" stroke={accentColor} strokeWidth={2} fill="url(#spendGrad)" dot={false} activeDot={{ r: 4, fill: accentColor, stroke: "var(--surface)", strokeWidth: 2 }} />
          </AreaChart>
        </ResponsiveContainer>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, fontSize: 13, fontWeight: 600 }}>
          {monthlyData.length >= 2 && monthlyData[monthlyData.length - 1].amount <= monthlyData[monthlyData.length - 2].amount
            ? <><span style={{ color: "#10B981" }}>Trending down this month</span> <span style={{ fontSize: 16 }}>↘</span></>
            : <><span style={{ color: "#EF4444" }}>Trending up this month</span> <span style={{ fontSize: 16 }}>↗</span></>}
        </div>
        <div style={{ fontSize: 12, color: "var(--muted)" }}>Last {monthlyData.length} months</div>
      </div>

      {/* Debts analytics */}
      {activeDebts.length > 0 && (
        <div className="card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 16, display: "flex", alignItems: "center", gap: 6 }}>
              <span>💸</span> Outstanding Debts
            </div>
            <a href="/dashboard/debts" style={{ fontSize: 12, color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}>View all →</a>
          </div>

          {/* Debt stat row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
            <div style={{ padding: "10px 12px", background: "var(--surface2)", borderRadius: 10 }}>
              <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 3 }}>Total Owed</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#EF4444" }}>{currencySymbol}{fmt(totalDebtOwed)}</div>
            </div>
            <div style={{ padding: "10px 12px", background: "var(--surface2)", borderRadius: 10 }}>
              <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 3 }}>Paid Off</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#10B981" }}>{debtPayoffPct.toFixed(0)}%</div>
              <div style={{ marginTop: 4, height: 3, background: "var(--border-color)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ width: `${debtPayoffPct}%`, height: "100%", background: "#10B981", borderRadius: 2 }} />
              </div>
            </div>
            <div style={{ padding: "10px 12px", background: "var(--surface2)", borderRadius: 10 }}>
              <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 3 }}>Short / Long</div>
              <div style={{ fontSize: 16, fontWeight: 800 }}>
                {shortTermDebts.length}
                <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 400 }}> / {longTermDebts.length}</span>
              </div>
            </div>
            <div style={{ padding: "10px 12px", background: "var(--surface2)", borderRadius: 10 }}>
              <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 3 }}>Overdue</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: overdueDebts.length > 0 ? "#EF4444" : "var(--text)" }}>
                {overdueDebts.length}
                <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 400, marginLeft: 4 }}>{overdueDebts.length > 0 ? "urgent" : "clear"}</span>
              </div>
            </div>
          </div>

          {/* Individual debt bars */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {activeDebts.slice(0, 4).map((d: any) => {
              const owed  = convertToDisplay(d.amount - d.paid, d.currency);
              const total = convertToDisplay(d.amount, d.currency);
              const pct   = total > 0 ? (convertToDisplay(d.paid, d.currency) / total) * 100 : 0;
              const isOverdue = d.due_date && new Date(d.due_date) < new Date();
              return (
                <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{d.icon && !d.icon.startsWith("data:") ? d.icon : "💸"}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 500, marginBottom: 3 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        {d.name}
                        {isOverdue && <span style={{ fontSize: 9, background: "rgba(239,68,68,0.12)", color: "#EF4444", borderRadius: 3, padding: "1px 4px", fontWeight: 700 }}>OVERDUE</span>}
                      </span>
                      <span style={{ color: "#EF4444", fontWeight: 700 }}>{currencySymbol}{fmt(owed)}</span>
                    </div>
                    <div style={{ height: 4, background: "var(--surface2)", borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: "#10B981", borderRadius: 2 }} />
                    </div>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{pct.toFixed(0)}% paid · {currencySymbol}{fmt(total)} total</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 12, padding: "10px 12px", background: "rgba(239,68,68,0.06)", borderRadius: 8, display: "flex", justifyContent: "space-between", fontSize: 13 }}>
            <span style={{ color: "var(--muted)" }}>Total outstanding across {activeDebts.length} debt{activeDebts.length !== 1 ? "s" : ""}</span>
            <span style={{ fontWeight: 800, color: "#EF4444" }}>{currencySymbol}{fmt(totalDebtOwed)}</span>
          </div>
        </div>
      )}

      {showModal && <SubModal onSave={async (data: any) => { await add(data); setShowModal(false); }} onClose={() => setShowModal(false)} />}
    </div>
  );
}
