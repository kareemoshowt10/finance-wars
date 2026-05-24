"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Plus, Trash2, Swords } from "lucide-react";

type Debt = { id: number; name: string; balance: number; apr: number; minPayment: number };

let nextId = 1;
function blank(): Debt {
  return { id: nextId++, name: "", balance: 0, apr: 0, minPayment: 0 };
}

function simulate(debts: Debt[], extra: number, strategy: "avalanche" | "snowball") {
  type S = { name: string; bal: number; apr: number; min: number };
  const state: S[] = debts.filter((d) => d.balance > 0).map((d) => ({ name: d.name || "Debt", bal: d.balance, apr: d.apr, min: d.minPayment }));
  if (state.length === 0) return { months: 0, totalInterest: 0, totalPaid: 0 };
  let months = 0;
  let totalInterest = 0;
  let totalPaid = 0;
  const MAX = 600;
  while (state.some((s) => s.bal > 0.01) && months < MAX) {
    months++;
    for (const s of state) {
      if (s.bal <= 0) continue;
      const interest = s.bal * (s.apr / 100 / 12);
      s.bal += interest;
      totalInterest += interest;
    }
    let remaining = state.reduce((s, d) => s + (d.bal > 0 ? d.min : 0), 0) + extra;
    for (const s of state) {
      if (s.bal <= 0) continue;
      const pay = Math.min(s.bal, s.min);
      s.bal -= pay;
      remaining -= pay;
      totalPaid += pay;
    }
    const alive = state.filter((s) => s.bal > 0);
    if (alive.length === 0 || remaining <= 0) continue;
    const sorted = strategy === "avalanche"
      ? [...alive].sort((a, b) => b.apr - a.apr)
      : [...alive].sort((a, b) => a.bal - b.bal);
    for (const t of sorted) {
      if (remaining <= 0) break;
      const pay = Math.min(t.bal, remaining);
      t.bal -= pay;
      remaining -= pay;
      totalPaid += pay;
    }
  }
  return { months, totalInterest: Math.round(totalInterest), totalPaid: Math.round(totalPaid) };
}

export default function DebtCalculatorPage() {
  const [debts, setDebts] = useState<Debt[]>([
    { id: nextId++, name: "Credit Card", balance: 5000, apr: 24.99, minPayment: 100 },
  ]);
  const [extra, setExtra] = useState(100);

  function update(id: number, field: keyof Debt, val: string | number) {
    setDebts((prev) => prev.map((d) => d.id === id ? { ...d, [field]: val } : d));
  }

  const avalanche = useMemo(() => simulate(debts, extra, "avalanche"), [debts, extra]);
  const snowball = useMemo(() => simulate(debts, extra, "snowball"), [debts, extra]);
  const noExtra = useMemo(() => simulate(debts, 0, "avalanche"), [debts]);

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
          <Swords className="w-8 h-8" /> Debt Payoff Calculator
        </h1>
        <p className="mt-2 text-sm text-black/50 dark:text-white/50">Avalanche vs Snowball. Enter your debts. See the difference an extra $100/mo makes.</p>

        <div className="mt-8 space-y-3">
          {debts.map((d) => (
            <div key={d.id} className="card p-4 grid grid-cols-2 sm:grid-cols-5 gap-3 items-end">
              <div>
                <label className="text-xs text-black/50 dark:text-white/50">Name</label>
                <input className="input mt-1" value={d.name} onChange={(e) => update(d.id, "name", e.target.value)} placeholder="e.g. Visa" />
              </div>
              <div>
                <label className="text-xs text-black/50 dark:text-white/50">Balance</label>
                <input className="input mt-1" type="number" min={0} value={d.balance} onChange={(e) => update(d.id, "balance", Number(e.target.value))} />
              </div>
              <div>
                <label className="text-xs text-black/50 dark:text-white/50">APR %</label>
                <input className="input mt-1" type="number" min={0} step={0.01} value={d.apr} onChange={(e) => update(d.id, "apr", Number(e.target.value))} />
              </div>
              <div>
                <label className="text-xs text-black/50 dark:text-white/50">Min payment</label>
                <input className="input mt-1" type="number" min={0} value={d.minPayment} onChange={(e) => update(d.id, "minPayment", Number(e.target.value))} />
              </div>
              <button onClick={() => setDebts((p) => p.filter((x) => x.id !== d.id))} className="btn-ghost text-red-500 justify-self-end">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button onClick={() => setDebts((p) => [...p, blank()])} className="btn-ghost text-sm"><Plus className="w-4 h-4" />Add debt</button>
        </div>

        <div className="mt-6 card p-4">
          <label className="text-xs text-black/50 dark:text-white/50 flex items-center justify-between">
            <span>Extra monthly payment</span>
            <span className="font-mono text-black dark:text-white">${extra}</span>
          </label>
          <input type="range" min={0} max={2000} step={25} value={extra} onChange={(e) => setExtra(Number(e.target.value))} className="w-full mt-2 accent-violet-500" />
        </div>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <ResultCard
            title="Minimum only"
            months={noExtra.months}
            interest={noExtra.totalInterest}
            muted
          />
          <ResultCard
            title="Avalanche"
            months={avalanche.months}
            interest={avalanche.totalInterest}
            saved={noExtra.totalInterest - avalanche.totalInterest}
            monthsSaved={noExtra.months - avalanche.months}
            highlight
          />
          <ResultCard
            title="Snowball"
            months={snowball.months}
            interest={snowball.totalInterest}
            saved={noExtra.totalInterest - snowball.totalInterest}
            monthsSaved={noExtra.months - snowball.months}
          />
        </div>

        <div className="mt-10 card p-5 bg-violet-500/5 border-violet-500/20 text-sm leading-relaxed">
          This calculator runs locally in your browser. Nothing is stored or sent anywhere.
          Want to track your real debts as boss fights with HP bars, interest accrual, and streak rewards?
          <Link href="/signup" className="inline-flex items-center gap-1 ml-1 text-violet-500 font-medium hover:underline">
            Start playing Finance Wars <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </main>
    </div>
  );
}

function ResultCard({ title, months, interest, saved, monthsSaved, highlight, muted }: {
  title: string; months: number; interest: number; saved?: number; monthsSaved?: number; highlight?: boolean; muted?: boolean;
}) {
  return (
    <div className={`card p-5 ${highlight ? "ring-1 ring-violet-500/40 bg-violet-500/5" : ""} ${muted ? "opacity-60" : ""}`}>
      <div className="text-xs uppercase tracking-wider text-black/50 dark:text-white/50">{title}</div>
      <div className="text-3xl font-semibold mt-2">{months >= 600 ? "50+ yr" : `${months} mo`}</div>
      <div className="text-sm text-black/50 dark:text-white/50 mt-1">${interest.toLocaleString()} interest</div>
      {saved != null && saved > 0 && (
        <div className="mt-2 text-xs text-emerald-500 font-medium">
          Saves ${saved.toLocaleString()}{monthsSaved != null && monthsSaved > 0 ? ` · ${monthsSaved} mo faster` : ""}
        </div>
      )}
    </div>
  );
}
