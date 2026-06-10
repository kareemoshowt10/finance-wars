"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowRight, Plus, Trash2 } from "lucide-react";
import ToolLayout from "@/app/_family/ToolLayout";
import { SwordIcon, BlobOrange } from "@/app/_family/Characters";

type Debt = { id: number; name: string; balance: number; apr: number; minPayment: number };

let nextId = 1;
function blank(): Debt {
  return { id: nextId++, name: "", balance: 0, apr: 0, minPayment: 0 };
}

function simulate(debts: Debt[], extra: number, strategy: "avalanche" | "snowball") {
  type S = { name: string; bal: number; apr: number; min: number };
  const state: S[] = debts.filter((d) => d.balance > 0).map((d) => ({ name: d.name || "Debt", bal: d.balance, apr: d.apr, min: d.minPayment }));
  if (state.length === 0) return { months: 0, totalInterest: 0, totalPaid: 0 };
  let months = 0, totalInterest = 0, totalPaid = 0;
  const MAX = 600;
  while (state.some((s) => s.bal > 0.01) && months < MAX) {
    months++;
    for (const s of state) {
      if (s.bal <= 0) continue;
      const interest = s.bal * (s.apr / 100 / 12);
      s.bal += interest;
      totalInterest += interest;
    }
    let remaining = state.reduce((sum, d) => sum + (d.bal > 0 ? d.min : 0), 0) + extra;
    for (const s of state) {
      if (s.bal <= 0) continue;
      const pay = Math.min(s.bal, s.min);
      s.bal -= pay; remaining -= pay; totalPaid += pay;
    }
    const alive = state.filter((s) => s.bal > 0);
    if (alive.length === 0 || remaining <= 0) continue;
    const sorted = strategy === "avalanche"
      ? [...alive].sort((a, b) => b.apr - a.apr)
      : [...alive].sort((a, b) => a.bal - b.bal);
    for (const t of sorted) {
      if (remaining <= 0) break;
      const pay = Math.min(t.bal, remaining);
      t.bal -= pay; remaining -= pay; totalPaid += pay;
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
    <ToolLayout
      title="Debt Payoff Calculator"
      subtitle="Avalanche vs Snowball. Enter your debts. See the difference an extra $100/mo makes."
      icon={<SwordIcon size={80} />}
      character={<BlobOrange size={64} className="family-character" />}
    >
      <div className="space-y-3">
        {debts.map((d) => (
          <div key={d.id} className="family-card grid grid-cols-2 sm:grid-cols-5 gap-3 items-end">
            <div>
              <label className="family-caption block mb-1">Name</label>
              <input className="family-input" value={d.name} onChange={(e) => update(d.id, "name", e.target.value)} placeholder="e.g. Visa" />
            </div>
            <div>
              <label className="family-caption block mb-1">Balance</label>
              <input className="family-input" type="number" min={0} value={d.balance} onChange={(e) => update(d.id, "balance", Number(e.target.value))} />
            </div>
            <div>
              <label className="family-caption block mb-1">APR %</label>
              <input className="family-input" type="number" min={0} step={0.01} value={d.apr} onChange={(e) => update(d.id, "apr", Number(e.target.value))} />
            </div>
            <div>
              <label className="family-caption block mb-1">Min payment</label>
              <input className="family-input" type="number" min={0} value={d.minPayment} onChange={(e) => update(d.id, "minPayment", Number(e.target.value))} />
            </div>
            <button onClick={() => setDebts((p) => p.filter((x) => x.id !== d.id))} className="family-btn-light justify-self-end" style={{ background: "#fff2f0", color: "#ff2b3a" }}>
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        <button onClick={() => setDebts((p) => [...p, blank()])} className="family-link"><Plus className="w-4 h-4" />Add debt</button>
      </div>

      <div className="mt-6 family-card">
        <label className="family-caption flex items-center justify-between mb-2">
          <span>Extra monthly payment</span>
          <span className="font-mono text-[#121212] text-[15px] font-semibold">${extra}</span>
        </label>
        <input type="range" min={0} max={2000} step={25} value={extra} onChange={(e) => setExtra(Number(e.target.value))} className="w-full accent-[#ff3e00]" />
      </div>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <ResultCard title="Minimum only" months={noExtra.months} interest={noExtra.totalInterest} muted />
        <ResultCard title="Avalanche" months={avalanche.months} interest={avalanche.totalInterest} saved={noExtra.totalInterest - avalanche.totalInterest} monthsSaved={noExtra.months - avalanche.months} highlight />
        <ResultCard title="Snowball" months={snowball.months} interest={snowball.totalInterest} saved={noExtra.totalInterest - snowball.totalInterest} monthsSaved={noExtra.months - snowball.months} />
      </div>

      <div className="mt-10 family-card-cream">
        <p className="family-body-sm">
          This calculator runs locally in your browser. Nothing is stored or sent.
          Want to track your real debts as boss fights with HP bars, interest accrual, and streak rewards?
          <Link href="/signup" className="family-link ml-2">Start playing <ArrowRight className="w-3 h-3" /></Link>
        </p>
      </div>
    </ToolLayout>
  );
}

function ResultCard({ title, months, interest, saved, monthsSaved, highlight, muted }: {
  title: string; months: number; interest: number; saved?: number; monthsSaved?: number; highlight?: boolean; muted?: boolean;
}) {
  return (
    <div className={`family-card ${muted ? "opacity-60" : ""}`} style={highlight ? { boxShadow: "0 0 0 2px #ff3e00" } : undefined}>
      <div className="family-caption uppercase tracking-wider">{title}</div>
      <div className="text-[28px] font-semibold tracking-[-0.026em] mt-1 text-[#121212]">{months >= 600 ? "50+ yr" : `${months} mo`}</div>
      <div className="family-body-sm mt-1">${interest.toLocaleString()} interest</div>
      {saved != null && saved > 0 && (
        <div className="mt-2 text-[12px] text-[#00ca48] font-medium">
          Saves ${saved.toLocaleString()}{monthsSaved != null && monthsSaved > 0 ? ` · ${monthsSaved} mo faster` : ""}
        </div>
      )}
    </div>
  );
}
