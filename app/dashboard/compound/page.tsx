"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Flame, TrendingUp, Users, Sparkles, ArrowRight } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import QuickCapture from "../_components/QuickCapture";

// The Compound page — the trajectory view the capture spec was built for:
// not "you spent $412 this week" but where the current pace lands if it
// keeps compounding. Consistency (days logged ÷ days active) is the north
// star; the clan panel shows the household's combined shared picture.

type Week = { label: string; income: number; expense: number; net: number };
type Data = {
  consistency: { daysLogged: number; daysActive: number; rate: number; streak: number };
  weeks: Week[];
  projection: { monthlyNet: number; y1: number; y5: number; y10: number; apy: number };
  clan: null | {
    householdName: string | null;
    month: string;
    combinedNet: number;
    members: { name: string; isMe: boolean; income: number; expense: number; net: number }[];
  };
};

export default function CompoundPage() {
  const [data, setData] = useState<Data | null>(null);
  const [currency, setCurrency] = useState("USD");
  const [loading, setLoading] = useState(true);

  async function load() {
    const [j, me] = await Promise.all([
      fetch("/api/compound").then((r) => r.json()).catch(() => null),
      fetch("/api/auth/me").then((r) => r.json()).catch(() => null),
    ]);
    setData(j?.data ?? j);
    if (me?.currency) setCurrency(me.currency);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  if (loading) return <div className="text-sm text-black/50 dark:text-white/50">Loading…</div>;
  if (!data) return <div className="text-sm text-black/50 dark:text-white/50">No data yet.</div>;

  const { consistency, weeks, projection, clan } = data;
  const maxAbs = Math.max(1, ...weeks.map((w) => Math.abs(w.net)));
  const positivePace = projection.monthlyNet > 0;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-4xl font-semibold tracking-[-0.03em] flex items-center gap-3">
          <Sparkles className="w-8 h-8" /> The Compound
        </h1>
        <p className="text-black/50 dark:text-white/50 mt-1 text-sm">
          Small entries, repeated. This is where they're taking you.
        </p>
      </header>

      <QuickCapture onSaved={load} />

      {/* Consistency — the north star */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat
          label="Logging streak"
          value={`${consistency.streak}d`}
          icon={<Flame className="w-4 h-4 text-orange-500" />}
        />
        <Stat
          label="Days logged / active"
          value={`${consistency.daysLogged}/${consistency.daysActive}`}
        />
        <Stat
          label="Consistency"
          value={`${Math.round(consistency.rate * 100)}%`}
          accent={consistency.rate >= 0.9 ? "emerald" : consistency.rate >= 0.6 ? undefined : "red"}
        />
        <Stat
          label="Monthly net pace"
          value={`${projection.monthlyNet >= 0 ? "+" : ""}${formatCurrency(projection.monthlyNet, currency)}`}
          accent={positivePace ? "emerald" : "red"}
        />
      </div>

      {/* Weekly net — trajectory, not a snapshot */}
      <section className="card p-5">
        <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" /> Weekly net, last 12 weeks
        </h2>
        <div className="flex items-end gap-1.5 h-36">
          {weeks.map((w, i) => {
            const h = Math.round((Math.abs(w.net) / maxAbs) * 100);
            return (
              <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-1" title={`${w.label}: ${w.net >= 0 ? "+" : ""}${formatCurrency(w.net, currency)}`}>
                <div
                  className={`w-full rounded-sm transition-all ${w.net >= 0 ? "bg-emerald-500/80" : "bg-red-500/70"}`}
                  style={{ height: `${Math.max(3, h)}%` }}
                />
                <span className="text-[9px] text-black/30 dark:text-white/30 rotate-0 hidden sm:block">{w.label}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* The compound projection */}
      <section className="card p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-emerald-500/5 pointer-events-none" />
        <div className="relative">
          <h2 className="text-sm font-semibold">If this pace keeps compounding</h2>
          <p className="text-xs text-black/50 dark:text-white/50 mt-1">
            Current 4-week net pace, parked at {Math.round(projection.apy * 100 * 10) / 10}% APY. Conservative on purpose.
          </p>
          {positivePace ? (
            <div className="mt-5 grid grid-cols-3 gap-3">
              <Horizon label="1 year" value={formatCurrency(projection.y1, currency)} />
              <Horizon label="5 years" value={formatCurrency(projection.y5, currency)} />
              <Horizon label="10 years" value={formatCurrency(projection.y10, currency)} big />
            </div>
          ) : (
            <div className="mt-5 text-sm text-black/60 dark:text-white/60">
              Your recent pace is negative — the compounding is working against you right now.
              Start with the <Link href="/dashboard/inflation" className="text-violet-500 hover:underline">Lifestyle Creep report</Link> to find where it's leaking.
            </div>
          )}
        </div>
      </section>

      {/* Clan view */}
      <section className="card p-5">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Users className="w-4 h-4" /> The clan{clan?.householdName ? ` · ${clan.householdName}` : ""}
        </h2>
        {!clan ? (
          <p className="mt-2 text-sm text-black/50 dark:text-white/50">
            Wealth compounds faster in formation. Link with your partner or family to see the combined picture —
            only what each of you marks <em>shared</em> is ever visible to the other.
            <Link href="/dashboard/couples" className="ml-2 text-violet-500 hover:underline inline-flex items-center gap-1">
              Set up your household <ArrowRight className="w-3 h-3" />
            </Link>
          </p>
        ) : (
          <>
            <div className="mt-3 flex items-baseline gap-2">
              <span className={`text-3xl font-semibold ${clan.combinedNet >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                {clan.combinedNet >= 0 ? "+" : ""}{formatCurrency(clan.combinedNet, currency)}
              </span>
              <span className="text-xs text-black/50 dark:text-white/50">combined shared net · {clan.month}</span>
            </div>
            <div className="mt-4 space-y-2">
              {clan.members.map((m, i) => (
                <div key={i} className="flex items-center justify-between text-sm py-2 border-b border-black/5 dark:border-white/5 last:border-0">
                  <span>{m.name}{m.isMe && <span className="text-black/40 dark:text-white/40"> (you)</span>}</span>
                  <span className="text-xs text-black/50 dark:text-white/50">
                    +{formatCurrency(m.income, currency)} / −{formatCurrency(m.expense, currency)} ·{" "}
                    <span className={m.net >= 0 ? "text-emerald-500" : "text-red-500"}>
                      {m.net >= 0 ? "+" : ""}{formatCurrency(m.net, currency)}
                    </span>
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-black/40 dark:text-white/40">
              Partners only ever see entries you explicitly mark shared. Everything else stays yours.
            </p>
          </>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, icon, accent }: { label: string; value: string; icon?: React.ReactNode; accent?: "emerald" | "red" }) {
  return (
    <div className="card p-4">
      <div className="text-xs text-black/50 dark:text-white/50 flex items-center gap-1.5">{icon}{label}</div>
      <div className={`text-2xl font-semibold mt-1 ${accent === "emerald" ? "text-emerald-500" : accent === "red" ? "text-red-500" : ""}`}>{value}</div>
    </div>
  );
}

function Horizon({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <div>
      <div className="text-xs text-black/50 dark:text-white/50">{label}</div>
      <div className={`font-semibold tracking-tight mt-1 ${big ? "text-3xl text-emerald-500" : "text-2xl"}`}>{value}</div>
    </div>
  );
}
