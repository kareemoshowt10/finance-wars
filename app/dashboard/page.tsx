"use client";
import { useEffect, useState } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import {
  LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid,
  PieChart as RPie, Pie, Cell, BarChart, Bar,
} from "recharts";
import { ArrowDownRight, ArrowUpRight, TrendingUp, Wallet, Swords, Flame } from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatCurrencyFull, formatDate } from "@/lib/utils";
import QuickCapture from "./_components/QuickCapture";

type Stats = {
  netWorth: number; income: number; spend: number; savingsRate: number;
  topCategories: { category: string; amount: number }[];
  recent: { id: string; amount: number; type: string; category: string; description: string; date: string; account: { name: string } }[];
  trend: { month: string; netWorth: number }[];
  accountCount: number;
  netWorthBreakdown?: {
    byType: { checking: number; savings: number; credit: number; investment: number };
    byAccount: { id: string; name: string; type: string; balance: number; sparkline: number[] }[];
  };
  activeDuel?: {
    id: string; title: string; endDate: string; daysRemaining: number;
    players: { name: string; side: string; totalPoints: number; sprintsWon: number; isMe: boolean }[];
  } | null;
  topBoss?: { name: string; hp: number; maxHp: number; hpPct: number; etaMonths: number | null } | null;
  bossCount?: number;
  bossesDefeated?: number;
  viceTaxTotal?: number;
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

      {/* Capture-first: the one habit everything else runs on. */}
      <QuickCapture />

      {stats.activeDuel && <ActiveDuelCard duel={stats.activeDuel} />}
      {(stats.topBoss || (stats.viceTaxTotal ?? 0) > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {stats.topBoss && (
            <Link href="/dashboard/debt" className="card p-5 block hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs text-black/50 dark:text-white/50 flex items-center gap-1.5"><Swords className="w-3.5 h-3.5" />Top boss</div>
                  <div className="text-lg font-semibold mt-1">{stats.topBoss.name}</div>
                  <div className="text-xs text-black/50 dark:text-white/50 mt-0.5">
                    {formatCurrency(stats.topBoss.hp, currency)} HP · {stats.topBoss.etaMonths != null ? `${stats.topBoss.etaMonths}mo ETA` : "no DPS"}
                  </div>
                </div>
                <div className="text-right text-xs text-black/50 dark:text-white/50">
                  {(stats.bossesDefeated ?? 0)}/{stats.bossCount ?? 0} defeated
                </div>
              </div>
              <div className="mt-3 h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                <div className="h-full bg-red-500 transition-all" style={{ width: `${Math.round(stats.topBoss.hpPct * 100)}%` }} />
              </div>
            </Link>
          )}
          {(stats.viceTaxTotal ?? 0) > 0 && (
            <Link href="/dashboard/vice-tax" className="card p-5 block hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition">
              <div className="text-xs text-black/50 dark:text-white/50 flex items-center gap-1.5"><Flame className="w-3.5 h-3.5" />Vice tax funneled</div>
              <div className="text-3xl font-semibold mt-1">{formatCurrency(stats.viceTaxTotal ?? 0, currency)}</div>
              <div className="text-xs text-black/50 dark:text-white/50 mt-1">Auto-saved from guilty pleasures into your goals.</div>
            </Link>
          )}
        </div>
      )}

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

      {stats.netWorthBreakdown && <NetWorthDrilldown breakdown={stats.netWorthBreakdown} currency={currency} />}

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

function NetWorthDrilldown({ breakdown, currency }: {
  breakdown: NonNullable<Stats["netWorthBreakdown"]>;
  currency: string;
}) {
  const { byType, byAccount } = breakdown;
  const cash = byType.checking + byType.savings;
  const invest = byType.investment;
  const debt = byType.credit;
  const total = Math.max(1, cash + invest + debt);
  const donut = [
    { name: "Cash", value: cash, color: "#60a5fa" },
    { name: "Investments", value: invest, color: "#a78bfa" },
    { name: "Debt", value: debt, color: "#f43f5e" },
  ].filter((d) => d.value > 0);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
      <div className="card p-5 lg:col-span-1">
        <div className="text-xs text-black/50 dark:text-white/50 mb-2">Net Worth Composition</div>
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <RPie>
              <Pie data={donut} dataKey="value" nameKey="name" innerRadius={42} outerRadius={70} strokeWidth={0}>
                {donut.map((d, i) => (<Cell key={i} fill={d.color} />))}
              </Pie>
              <Tooltip contentStyle={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }}
                formatter={(v: number) => formatCurrencyFull(v, currency)} />
            </RPie>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 space-y-2">
          {donut.map((d) => (
            <div key={d.name}>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ background: d.color }} />{d.name}</span>
                <span className="text-black/60 dark:text-white/60">{formatCurrency(d.value, currency)}</span>
              </div>
              <div className="h-1.5 mt-1 rounded-full bg-black/5 dark:bg-white/5 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${Math.min(100, (d.value / total) * 100)}%`, background: d.color }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-5 lg:col-span-2">
        <div className="text-xs text-black/50 dark:text-white/50 mb-3">Accounts</div>
        <ul className="divide-y divide-black/5 dark:divide-white/5">
          {byAccount.map((a) => (
            <li key={a.id} className="py-2.5">
              <a href={`/dashboard/transactions?account=${a.id}`} className="flex items-center justify-between gap-3 hover:opacity-80">
                <div className="min-w-0">
                  <div className="text-sm truncate">{a.name}</div>
                  <div className="text-[11px] text-black/40 dark:text-white/40 uppercase tracking-wide">{a.type}</div>
                </div>
                <Sparkline values={a.sparkline} />
                <div className={`text-sm font-medium ${a.type === "credit" ? "text-rose-400" : ""}`}>{formatCurrency(a.balance, currency)}</div>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ActiveDuelCard({ duel }: { duel: NonNullable<Stats["activeDuel"]> }) {
  const me = duel.players.find((p) => p.isMe);
  const opp = duel.players.find((p) => !p.isMe);
  const total = (me?.totalPoints || 0) + (opp?.totalPoints || 0);
  const mePct = total > 0 ? ((me?.totalPoints || 0) / total) * 100 : 50;
  return (
    <Link href={`/dashboard/duels/${duel.id}`} className="card p-5 block relative overflow-hidden hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition">
      <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-fuchsia-500/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none" />
      <div className="relative flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 flex items-center justify-center">
            <Swords className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-black/50 dark:text-white/50">Duel in progress</div>
            <div className="font-semibold">{duel.title}</div>
          </div>
        </div>
        <div className="text-xs text-black/50 dark:text-white/50">{duel.daysRemaining} day{duel.daysRemaining === 1 ? "" : "s"} left</div>
      </div>
      <div className="relative mt-4 grid grid-cols-3 items-center gap-3">
        <div>
          <div className="text-xs text-black/50 dark:text-white/50">{me?.name || "You"}</div>
          <div className="text-2xl font-semibold tabular-nums">{Math.round(me?.totalPoints || 0)}</div>
          <div className="text-[10px] opacity-50">{me?.sprintsWon || 0} sprints won</div>
        </div>
        <div className="h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-indigo-500 to-fuchsia-500" style={{ width: `${mePct}%` }} />
        </div>
        <div className="text-right">
          <div className="text-xs text-black/50 dark:text-white/50">{opp?.name || "Opponent"}</div>
          <div className="text-2xl font-semibold tabular-nums">{Math.round(opp?.totalPoints || 0)}</div>
          <div className="text-[10px] opacity-50">{opp?.sprintsWon || 0} sprints won</div>
        </div>
      </div>
    </Link>
  );
}

function Sparkline({ values }: { values: number[] }) {
  if (!values || values.length < 2) return <div className="w-20" />;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * 80;
    const y = 20 - ((v - min) / range) * 20;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return (
    <svg width="80" height="20" className="opacity-70">
      <polyline points={pts} fill="none" stroke="#a78bfa" strokeWidth="1.5" />
    </svg>
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
