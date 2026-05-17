"use client";
import { useEffect, useState } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import {
  LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid,
  PieChart as RPie, Pie, Cell, BarChart, Bar,
} from "recharts";
import { ArrowDownRight, ArrowUpRight, TrendingUp, Wallet } from "lucide-react";
import { formatCurrency, formatCurrencyFull, formatDate } from "@/lib/utils";

type Stats = {
  netWorth: number; income: number; spend: number; savingsRate: number;
  topCategories: { category: string; amount: number }[];
  recent: { id: string; amount: number; type: string; category: string; description: string; date: string; account: { name: string } }[];
  trend: { month: string; netWorth: number }[];
  accountCount: number;
};

const CHART_COLORS = ["#a78bfa", "#60a5fa", "#34d399", "#fbbf24", "#f472b6", "#f87171"];

export default function OverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [currency, setCurrency] = useState("USD");

  useEffect(() => {
    (async () => {
      const [s, me] = await Promise.all([
        fetch("/api/stats/overview").then((r) => r.json()),
        fetch("/api/auth/me").then((r) => r.json()),
      ]);
      setStats(s);
      if (me?.currency) setCurrency(me.currency);
    })();
  }, []);

  if (!stats) {
    return <div className="text-black/40 dark:text-white/40 text-sm">Loading…</div>;
  }

  const net = stats.income - stats.spend;
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-4xl md:text-5xl font-semibold tracking-[-0.03em]">Overview</h1>
        <p className="text-black/50 dark:text-white/50 mt-1 text-sm">Your money at a glance.</p>
      </header>

      <motion.div
        className="grid grid-cols-2 lg:grid-cols-4 gap-3"
        initial="hidden" animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07 } } }}
      >
        <Stat label="Net Worth" value={stats.netWorth} formatted={formatCurrency(stats.netWorth, currency)} currency={currency} icon={<Wallet className="w-4 h-4" />} accent animate />
        <Stat label="Income (mo)" value={stats.income} formatted={formatCurrency(stats.income, currency)} currency={currency} icon={<ArrowDownRight className="w-4 h-4 text-emerald-400" />} />
        <Stat label="Spend (mo)" value={stats.spend} formatted={formatCurrency(stats.spend, currency)} currency={currency} icon={<ArrowUpRight className="w-4 h-4 text-rose-400" />} />
        <Stat label="Savings Rate" value={Math.round(stats.savingsRate)} formatted={`${Math.round(stats.savingsRate)}%`} currency={currency} icon={<TrendingUp className="w-4 h-4" />} percent />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-baseline justify-between">
            <div>
              <div className="text-xs text-black/50 dark:text-white/50">Net Worth — 6 months</div>
              <div className="text-2xl font-semibold mt-1">{formatCurrency(stats.netWorth, currency)}</div>
            </div>
            <div className={`text-xs ${net >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {net >= 0 ? "+" : ""}{formatCurrency(net, currency)} this month
            </div>
          </div>
          <div className="h-64 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.trend}>
                <defs>
                  <linearGradient id="lg" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.7} />
                    <stop offset="100%" stopColor="#a78bfa" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="month" stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${Math.round(v/1000)}k`} width={36} />
                <Tooltip contentStyle={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }}
                  formatter={(v: number) => formatCurrencyFull(v, currency)} />
                <Line type="monotone" dataKey="netWorth" stroke="#a78bfa" strokeWidth={2} dot={{ fill: "#a78bfa", r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-5">
          <div className="text-xs text-black/50 dark:text-white/50">Top Spending Categories</div>
          {stats.topCategories.length === 0 ? (
            <div className="text-sm text-black/40 dark:text-white/40 mt-6">No spending yet this month.</div>
          ) : (
            <>
              <div className="h-44 mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <RPie>
                    <Pie data={stats.topCategories} dataKey="amount" nameKey="category" innerRadius={36} outerRadius={66} strokeWidth={0}>
                      {stats.topCategories.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }}
                      formatter={(v: number) => formatCurrencyFull(v, currency)} />
                  </RPie>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1.5 mt-2">
                {stats.topCategories.map((c, i) => (
                  <div key={c.category} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-black/70 dark:text-white/70">
                      <span className="w-2 h-2 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                      {c.category}
                    </span>
                    <span className="text-black/60 dark:text-white/60">{formatCurrency(c.amount, currency)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="card p-5">
          <div className="text-xs text-black/50 dark:text-white/50 mb-3">Spending by Category</div>
          {stats.topCategories.length === 0 ? (
            <div className="text-sm text-black/40 dark:text-white/40">Nothing to show.</div>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.topCategories}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="category" stroke="rgba(255,255,255,0.4)" fontSize={10} tickLine={false} axisLine={false} interval={0} angle={-20} textAnchor="end" height={50} />
                  <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${Math.round(v/100)}h`} width={36} />
                  <Tooltip contentStyle={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }}
                    formatter={(v: number) => formatCurrencyFull(v, currency)} />
                  <Bar dataKey="amount" fill="#60a5fa" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="card p-5">
          <div className="text-xs text-black/50 dark:text-white/50 mb-3">Recent Transactions</div>
          {stats.recent.length === 0 ? (
            <div className="text-sm text-black/40 dark:text-white/40">No transactions yet.</div>
          ) : (
            <ul className="divide-y divide-black/5 dark:divide-white/5">
              {stats.recent.map((t) => (
                <li key={t.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <div className="text-sm">{t.description}</div>
                    <div className="text-xs text-black/40 dark:text-white/40">{t.category} · {t.account?.name} · {formatDate(t.date)}</div>
                  </div>
                  <div className={`text-sm font-medium ${t.type === "income" ? "text-emerald-400" : "text-white"}`}>
                    {t.type === "income" ? "+" : "−"}{formatCurrency(t.amount, currency)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Counter({ to, formatted, currency, percent }: { to: number; formatted: string; currency: string; percent?: boolean }) {
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => {
    if (percent) return `${Math.round(v)}%`;
    try {
      return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(v);
    } catch { return formatted; }
  });
  useEffect(() => {
    const controls = animate(mv, to, { duration: 1.1, ease: [0.16, 1, 0.3, 1] });
    return () => controls.stop();
  }, [to, mv]);
  return <motion.span>{rounded}</motion.span>;
}

function Stat({ label, value, formatted, currency, icon, accent, animate: shouldAnimate, percent }:
  { label: string; value: number; formatted: string; currency: string; icon: React.ReactNode; accent?: boolean; animate?: boolean; percent?: boolean }) {
  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 90, damping: 18 } } }}
      className={`card p-4 ${accent ? "relative overflow-hidden" : ""}`}
    >
      {accent && <div className="absolute -top-12 -right-10 w-32 h-32 rounded-full bg-purple-500/20 blur-3xl" />}
      <div className="relative flex items-center justify-between text-black/50 dark:text-white/50 text-xs">
        <span>{label}</span>{icon}
      </div>
      <div className="relative mt-2 text-2xl md:text-3xl font-semibold tracking-tight">
        {shouldAnimate ? <Counter to={value} formatted={formatted} currency={currency} percent={percent} /> : formatted}
      </div>
    </motion.div>
  );
}
