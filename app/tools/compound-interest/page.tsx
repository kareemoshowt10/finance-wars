"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, TrendingUp } from "lucide-react";

export default function CompoundInterestPage() {
  const [principal, setPrincipal] = useState(1000);
  const [monthly, setMonthly] = useState(100);
  const [rate, setRate] = useState(7);
  const [years, setYears] = useState(20);

  const result = useMemo(() => {
    const r = rate / 100 / 12;
    let balance = principal;
    const rows: { year: number; balance: number; contributions: number; interest: number }[] = [];
    let totalContributions = principal;
    for (let y = 1; y <= years; y++) {
      for (let m = 0; m < 12; m++) {
        balance = balance * (1 + r) + monthly;
        totalContributions += monthly;
      }
      rows.push({
        year: y,
        balance: Math.round(balance),
        contributions: Math.round(totalContributions),
        interest: Math.round(balance - totalContributions),
      });
    }
    return { finalBalance: Math.round(balance), totalContributions: Math.round(totalContributions), totalInterest: Math.round(balance - totalContributions), rows };
  }, [principal, monthly, rate, years]);

  const maxBal = result.rows[result.rows.length - 1]?.balance || 1;

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
      <nav className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl bg-white/60 dark:bg-black/60 border-b border-black/5 dark:border-white/5">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between text-[13px]">
          <Link href="/" className="font-semibold tracking-tight">Finance Wars</Link>
          <Link href="/signup" className="px-3 py-1.5 rounded-full bg-black text-white dark:bg-white dark:text-black font-medium">Get started</Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 pt-32 pb-20">
        <Link href="/learn" className="text-xs opacity-50 hover:opacity-100 inline-flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" />All tools
        </Link>
        <h1 className="mt-6 text-4xl font-semibold tracking-[-0.03em] flex items-center gap-3">
          <TrendingUp className="w-8 h-8" /> Compound Interest Simulator
        </h1>
        <p className="mt-2 text-sm text-black/50 dark:text-white/50">See how time and consistency turn small contributions into real wealth.</p>

        <div className="mt-8 card p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label className="text-xs text-black/50 dark:text-white/50">Starting amount</label>
            <input className="input mt-1" type="number" min={0} value={principal} onChange={(e) => setPrincipal(Number(e.target.value))} />
          </div>
          <div>
            <label className="text-xs text-black/50 dark:text-white/50">Monthly addition</label>
            <input className="input mt-1" type="number" min={0} value={monthly} onChange={(e) => setMonthly(Number(e.target.value))} />
          </div>
          <div>
            <label className="text-xs text-black/50 dark:text-white/50">Annual return %</label>
            <input className="input mt-1" type="number" min={0} step={0.1} value={rate} onChange={(e) => setRate(Number(e.target.value))} />
          </div>
          <div>
            <label className="text-xs text-black/50 dark:text-white/50">Years</label>
            <input className="input mt-1" type="number" min={1} max={50} value={years} onChange={(e) => setYears(Number(e.target.value))} />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="card p-5">
            <div className="text-xs text-black/50 dark:text-white/50">Final balance</div>
            <div className="text-3xl font-semibold mt-1">${result.finalBalance.toLocaleString()}</div>
          </div>
          <div className="card p-5">
            <div className="text-xs text-black/50 dark:text-white/50">You put in</div>
            <div className="text-2xl font-semibold mt-1">${result.totalContributions.toLocaleString()}</div>
          </div>
          <div className="card p-5">
            <div className="text-xs text-black/50 dark:text-white/50">Interest earned</div>
            <div className="text-2xl font-semibold mt-1 text-emerald-500">${result.totalInterest.toLocaleString()}</div>
          </div>
        </div>

        {/* Simple bar chart */}
        <div className="mt-6 card p-5">
          <div className="text-sm font-semibold mb-3">Growth by year</div>
          <div className="space-y-1.5">
            {result.rows.map((r) => {
              const contribPct = (r.contributions / maxBal) * 100;
              const interestPct = (r.interest / maxBal) * 100;
              return (
                <div key={r.year} className="flex items-center gap-2 text-xs">
                  <span className="w-6 text-right tabular-nums text-black/40 dark:text-white/40">{r.year}</span>
                  <div className="flex-1 flex h-3 rounded-full overflow-hidden bg-black/5 dark:bg-white/5">
                    <div className="bg-blue-500" style={{ width: `${contribPct}%` }} />
                    <div className="bg-emerald-500" style={{ width: `${interestPct}%` }} />
                  </div>
                  <span className="w-20 text-right tabular-nums">${r.balance.toLocaleString()}</span>
                </div>
              );
            })}
          </div>
          <div className="flex gap-4 mt-3 text-xs text-black/50 dark:text-white/50">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-500" />Contributions</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-500" />Interest</span>
          </div>
        </div>

        <div className="mt-8 card p-5 bg-violet-500/5 border-violet-500/20 text-sm leading-relaxed">
          Compounding works for your savings — and against your debt. Finance Wars tracks both sides and shows you which one is winning.
          <Link href="/signup" className="inline-flex items-center gap-1 ml-1 text-violet-500 font-medium hover:underline">
            Start playing <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </main>
    </div>
  );
}
