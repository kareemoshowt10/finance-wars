"use client";
import { useEffect, useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid,
  LineChart, Line,
} from "recharts";
import { ArrowUp, ArrowDown, AlertCircle } from "lucide-react";
import { formatCurrency, formatCurrencyFull, formatDate } from "@/lib/utils";

type Insights = {
  mom: { category: string; current: number; previous: number; change: number }[];
  forecast: { date: string; value: number; low: number; high: number; actual?: number }[];
  anomalies: { id: string; amount: number; category: string; description: string; date: string; categoryMean: number }[];
  heat: { week: number; dow: number; amount: number }[];
  savings: { month: string; rate: number }[];
};

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function InsightsPage() {
  const [data, setData] = useState<Insights | null>(null);
  const [currency, setCurrency] = useState("USD");

  useEffect(() => {
    (async () => {
      const [d, me] = await Promise.all([
        fetch("/api/stats/insights").then((r) => r.json()),
        fetch("/api/auth/me").then((r) => r.json()),
      ]);
      setData(d);
      if (me?.currency) setCurrency(me.currency);
    })();
  }, []);

  if (!data) return <div className="text-sm opacity-50">Loading…</div>;

  const maxHeat = Math.max(1, ...data.heat.map((h) => h.amount));
  const weeks = Math.max(0, ...data.heat.map((h) => h.week)) + 1;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-4xl font-semibold tracking-[-0.03em]">Insights</h1>
        <p className="text-black/50 dark:text-white/50 mt-1 text-sm">Patterns, forecasts, and anomalies.</p>
      </header>

      <section className="card p-5">
        <div className="text-xs text-black/50 dark:text-white/50 mb-3">Net Worth — 90 days actual + 90 days forecast</div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.forecast}>
              <defs>
                <linearGradient id="band" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#a78bfa" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(127,127,127,0.1)" vertical={false} />
              <XAxis dataKey="date" fontSize={10} tickLine={false} axisLine={false} minTickGap={40} />
              <YAxis fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${Math.round(v/1000)}k`} width={42} />
              <Tooltip contentStyle={{ background: "rgba(10,10,10,0.95)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", borderRadius: 12, fontSize: 12 }} formatter={(v: number) => formatCurrencyFull(v, currency)} />
              <Area type="monotone" dataKey="high" stroke="none" fill="url(#band)" />
              <Area type="monotone" dataKey="low" stroke="none" fill="white" fillOpacity={0} />
              <Line type="monotone" dataKey="value" stroke="#a78bfa" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="actual" stroke="#34d399" dot={false} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="grid md:grid-cols-2 gap-3">
        <div className="card p-5">
          <div className="text-xs text-black/50 dark:text-white/50 mb-3">Month-over-Month by Category</div>
          {data.mom.length === 0 ? <div className="text-sm opacity-50">Not enough data.</div> : (
            <ul className="divide-y divide-black/5 dark:divide-white/5">
              {data.mom.slice(0, 8).map((m) => (
                <li key={m.category} className="py-2 flex items-center justify-between">
                  <div className="text-sm">{m.category}</div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-black/60 dark:text-white/60">{formatCurrency(m.current, currency)}</span>
                    <span className={`flex items-center gap-1 ${m.change > 0 ? "text-rose-500" : "text-emerald-500"}`}>
                      {m.change > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                      {Math.abs(Math.round(m.change))}%
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-5">
          <div className="text-xs text-black/50 dark:text-white/50 mb-3">Savings Rate — last 6 months</div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.savings}>
                <CartesianGrid stroke="rgba(127,127,127,0.1)" vertical={false} />
                <XAxis dataKey="month" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} width={36} />
                <Tooltip contentStyle={{ background: "rgba(10,10,10,0.95)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", borderRadius: 12, fontSize: 12 }} />
                <Line type="monotone" dataKey="rate" stroke="#34d399" strokeWidth={2} dot={{ fill: "#34d399", r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="card p-5">
        <div className="text-xs text-black/50 dark:text-white/50 mb-3">Spending Anomalies</div>
        {data.anomalies.length === 0 ? <div className="text-sm opacity-50">No anomalies detected.</div> : (
          <ul className="divide-y divide-black/5 dark:divide-white/5">
            {data.anomalies.map((a) => (
              <li key={a.id} className="py-3 flex items-center gap-3">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">{a.description}</div>
                  <div className="text-xs text-black/40 dark:text-white/40">{a.category} · usually ~{formatCurrency(a.categoryMean, currency)} · {formatDate(a.date)}</div>
                </div>
                <div className="text-sm font-medium">{formatCurrency(a.amount, currency)}</div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card p-5">
        <div className="text-xs text-black/50 dark:text-white/50 mb-3">Spending Heatmap — last 12 weeks</div>
        <div className="overflow-x-auto">
          <div className="inline-grid gap-1" style={{ gridTemplateColumns: `auto repeat(${weeks}, minmax(0, 1fr))` }}>
            <div />
            {Array.from({ length: weeks }).map((_, w) => <div key={`w${w}`} className="text-[9px] text-black/30 dark:text-white/30 text-center">{w + 1}</div>)}
            {DOW.map((d, di) => (
              <>
                <div key={`d${di}`} className="text-[10px] text-black/40 dark:text-white/40 pr-2 self-center">{d}</div>
                {Array.from({ length: weeks }).map((_, w) => {
                  const cell = data.heat.find((h) => h.week === w && h.dow === di);
                  const intensity = cell ? cell.amount / maxHeat : 0;
                  return (
                    <div key={`c${di}-${w}`} title={cell ? `${DOW[di]} W${w + 1}: ${formatCurrency(cell.amount, currency)}` : ""}
                      className="w-5 h-5 rounded"
                      style={{ background: intensity > 0 ? `rgba(167,139,250,${0.15 + intensity * 0.85})` : "rgba(127,127,127,0.08)" }} />
                  );
                })}
              </>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
