"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Shield } from "lucide-react";

const RISK_PROFILES = [
  { label: "Low risk", months: 3, desc: "Stable job, dual income, no dependents." },
  { label: "Medium risk", months: 4.5, desc: "Single income, moderate job market." },
  { label: "High risk", months: 6, desc: "Self-employed, volatile industry, dependents." },
] as const;

export default function EmergencyFundPage() {
  const [expenses, setExpenses] = useState(3000);
  const [saved, setSaved] = useState(0);
  const [risk, setRisk] = useState(1);
  const [monthlySave, setMonthlySave] = useState(300);

  const target = useMemo(() => Math.round(expenses * RISK_PROFILES[risk].months), [expenses, risk]);
  const gap = Math.max(0, target - saved);
  const monthsToTarget = monthlySave > 0 ? Math.ceil(gap / monthlySave) : null;
  const pct = target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0;

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
          <Shield className="w-8 h-8" /> Emergency Fund Calculator
        </h1>
        <p className="mt-2 text-sm text-black/50 dark:text-white/50">How much do you really need? Find out in 30 seconds.</p>

        <div className="mt-8 card p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-black/50 dark:text-white/50">Monthly essential expenses</label>
              <input className="input mt-1" type="number" min={0} value={expenses} onChange={(e) => setExpenses(Number(e.target.value))} />
            </div>
            <div>
              <label className="text-xs text-black/50 dark:text-white/50">Already saved</label>
              <input className="input mt-1" type="number" min={0} value={saved} onChange={(e) => setSaved(Number(e.target.value))} />
            </div>
          </div>

          <div>
            <div className="text-xs text-black/50 dark:text-white/50 mb-2">Risk profile</div>
            <div className="grid grid-cols-3 gap-2">
              {RISK_PROFILES.map((p, i) => (
                <button
                  key={i}
                  onClick={() => setRisk(i)}
                  className={`p-3 rounded-lg border text-left transition ${
                    risk === i
                      ? "border-orange-500 bg-orange-500/10"
                      : "border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20"
                  }`}
                >
                  <div className="text-sm font-semibold">{p.label}</div>
                  <div className="text-xs text-black/50 dark:text-white/50 mt-0.5">{p.months} months</div>
                  <div className="text-[10px] text-black/40 dark:text-white/40 mt-1">{p.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-black/50 dark:text-white/50 flex justify-between">
              <span>Monthly savings toward fund</span>
              <span className="font-mono text-black dark:text-white">${monthlySave}</span>
            </label>
            <input type="range" min={50} max={2000} step={25} value={monthlySave} onChange={(e) => setMonthlySave(Number(e.target.value))} className="w-full mt-2 accent-orange-500" />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card p-5">
            <div className="text-xs text-black/50 dark:text-white/50">Target</div>
            <div className="text-3xl font-semibold mt-1">${target.toLocaleString()}</div>
            <div className="text-xs text-black/40 dark:text-white/40 mt-0.5">{RISK_PROFILES[risk].months} months of expenses</div>
          </div>
          <div className="card p-5">
            <div className="text-xs text-black/50 dark:text-white/50">Gap remaining</div>
            <div className={`text-3xl font-semibold mt-1 ${gap === 0 ? "text-emerald-500" : "text-orange-500"}`}>
              {gap === 0 ? "Funded" : `$${gap.toLocaleString()}`}
            </div>
          </div>
          <div className="card p-5">
            <div className="text-xs text-black/50 dark:text-white/50">Months to target</div>
            <div className="text-3xl font-semibold mt-1">
              {gap === 0 ? "0" : monthsToTarget != null ? monthsToTarget : "—"}
            </div>
          </div>
        </div>

        <div className="mt-6 card p-5">
          <div className="flex justify-between text-xs text-black/50 dark:text-white/50 mb-1">
            <span>Progress</span>
            <span>{pct}%</span>
          </div>
          <div className="h-4 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
            <div
              className={`h-full transition-all ${pct >= 100 ? "bg-emerald-500" : "bg-orange-500"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <div className="mt-6 card p-5 bg-black/5 dark:bg-white/5 text-sm leading-relaxed space-y-2">
          <p><strong>Tier 1:</strong> Get $1,000 as fast as you can. This covers a flat tire or ER copay and prevents debt spiraling.</p>
          <p><strong>Tier 2:</strong> 1 month of expenses. You can now survive a paycheck delay or small job disruption.</p>
          <p><strong>Tier 3:</strong> 3–6 months. This is your buffer against a real layoff. Don't touch it for anything less.</p>
        </div>

        <div className="mt-8 card p-5 bg-violet-500/5 border-violet-500/20 text-sm leading-relaxed">
          Finance Wars tracks your savings goals with progress bars, Vice Tax auto-funding, and weekly recaps. Build your emergency fund while you sleep.
          <Link href="/signup" className="inline-flex items-center gap-1 ml-1 text-violet-500 font-medium hover:underline">
            Start playing <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </main>
    </div>
  );
}
