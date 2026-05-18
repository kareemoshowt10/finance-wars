"use client";
import { useEffect, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceDot } from "recharts";
import { TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type Series = { date: string; projectedBalance: number; scheduledIncome: number; scheduledExpense: number };
type Upcoming = { date: string; amount: number; type: string; description: string; category: string };
type Data = {
  series: Series[];
  upcoming: Upcoming[];
  summary: {
    startBalance: number; lowPoint: number; lowDate: string;
    totalScheduledIncome: number; totalScheduledExpense: number; endBalance: number;
    baselineDailyExpense: number;
  };
};

function weekKey(iso: string) {
  const d = new Date(iso);
  const day = d.getDay();
  const diff = d.getDate() - day;
  const w = new Date(d);
  w.setDate(diff);
  w.setHours(0, 0, 0, 0);
  return w.toISOString().slice(0, 10);
}

export default function CashflowPage() {
  const [data, setData] = useState<Data | null>(null);
  const [currency, setCurrency] = useState("USD");

  useEffect(() => {
    (async () => {
      const [c, me] = await Promise.all([
        fetch("/api/insights/cashflow").then((r) => r.json()),
        fetch("/api/auth/me").then((r) => r.json()),
      ]);
      setData(c);
      if (me?.currency) setCurrency(me.currency);
    })();
  }, []);

  if (!data) return <div className="text-black/40 dark:text-white/40 text-sm">Loading…</div>;

  const lowEntry = data.series.find((s) => s.date === data.summary.lowDate);

  const byWeek: Record<string, Upcoming[]> = {};
  for (const u of data.upcoming) {
    const k = weekKey(u.date);
    byWeek[k] = byWeek[k] || [];
    byWeek[k].push(u);
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-4xl font-semibold tracking-[-0.03em]">Cash Flow</h1>
        <p className="text-black/50 dark:text-white/50 mt-1 text-sm">Projected balance for the next 90 days.</p>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Tile icon={<Wallet className="w-4 h-4" />} label="Starting" value={formatCurrency(data.summary.startBalance, currency)} />
        <Tile icon={<TrendingDown className="w-4 h-4 text-rose-400" />} label="Low point" value={formatCurrency(data.summary.lowPoint, currency)} sub={data.summary.lowDate} />
        <Tile icon={<TrendingUp className="w-4 h-4 text-emerald-400" />} label="Scheduled income" value={formatCurrency(data.summary.totalScheduledIncome, currency)} />
        <Tile icon={<Wallet className="w-4 h-4" />} label="End balance" value={formatCurrency(data.summary.endBalance, currency)} />
      </div>

      <div className="card p-5">
        <div className="text-xs text-black/50 dark:text-white/50">Projected liquid balance</div>
        <div className="h-72 mt-3">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.series}>
              <defs>
                <linearGradient id="cf" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#60a5fa" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="date" stroke="rgba(255,255,255,0.4)" fontSize={10} tickLine={false} axisLine={false} interval={Math.floor(data.series.length / 8)} />
              <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} tickLine={false} axisLine={false} width={50} tickFormatter={(v) => `$${Math.round(v / 1000)}k`} />
              <Tooltip contentStyle={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="projectedBalance" stroke="#60a5fa" strokeWidth={2} fill="url(#cf)" />
              {lowEntry && (
                <ReferenceDot x={lowEntry.date} y={lowEntry.projectedBalance} r={5} fill="#f43f5e" stroke="#fff" />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card p-5">
        <div className="text-sm font-medium mb-3">Upcoming scheduled events</div>
        {Object.keys(byWeek).length === 0 ? (
          <div className="text-xs text-black/40 dark:text-white/40">No recurring items in the next 90 days.</div>
        ) : (
          <div className="space-y-4">
            {Object.entries(byWeek).slice(0, 12).map(([wk, items]) => (
              <div key={wk}>
                <div className="text-[11px] uppercase tracking-wider text-black/40 dark:text-white/40 mb-1">Week of {wk}</div>
                <ul className="divide-y divide-black/5 dark:divide-white/5">
                  {items.map((u, i) => (
                    <li key={i} className="flex items-center justify-between py-2 text-sm">
                      <div>
                        <div className="font-medium">{u.description}</div>
                        <div className="text-xs text-black/50 dark:text-white/50">{u.date} • {u.category}</div>
                      </div>
                      <div className={u.type === "income" ? "text-emerald-400" : "text-rose-400"}>
                        {u.type === "income" ? "+" : "-"}{formatCurrency(u.amount, currency)}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Tile({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 text-xs text-black/50 dark:text-white/50">{icon}{label}</div>
      <div className="text-2xl font-semibold mt-2 tracking-tight">{value}</div>
      {sub && <div className="text-xs text-black/40 dark:text-white/40 mt-1">{sub}</div>}
    </div>
  );
}
