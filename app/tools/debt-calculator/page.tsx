"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import BlueprintToolLayout, { BPField, BPSection } from "@/app/_blueprint/BlueprintToolLayout";

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

const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`;

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
    <BlueprintToolLayout
      number="05"
      callsign="DEBT / PAYOFF STRATEGY"
      title="Avalanche or snowball, with the difference quantified."
      subtitle="Enter your debts. See exactly how many months and dollars an extra payment cuts — and which method wins for your specific mix."
    >
      <BPSection label="§ YOUR DEBTS">
        <div className="space-y-3">
          {debts.map((d) => (
            <div key={d.id} className="bp-card grid grid-cols-2 sm:grid-cols-5 gap-3 items-end">
              <BPField label="Name">
                <input className="bp-input" value={d.name} onChange={(e) => update(d.id, "name", e.target.value)} placeholder="e.g. Visa" />
              </BPField>
              <BPField label="Balance">
                <input className="bp-input" type="number" min={0} value={d.balance} onChange={(e) => update(d.id, "balance", Number(e.target.value))} />
              </BPField>
              <BPField label="APR %">
                <input className="bp-input" type="number" min={0} step={0.01} value={d.apr} onChange={(e) => update(d.id, "apr", Number(e.target.value))} />
              </BPField>
              <BPField label="Min payment">
                <input className="bp-input" type="number" min={0} value={d.minPayment} onChange={(e) => update(d.id, "minPayment", Number(e.target.value))} />
              </BPField>
              <button
                onClick={() => setDebts((p) => p.filter((x) => x.id !== d.id))}
                className="bp-btn-secondary justify-self-end"
                style={{ color: "var(--bp-signal)", borderColor: "var(--bp-signal)" }}
                title="Remove"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button onClick={() => setDebts((p) => [...p, blank()])} className="bp-link inline-flex"><Plus className="w-4 h-4" />Add debt</button>
        </div>
      </BPSection>

      <BPSection label="§ EXTRA MONTHLY">
        <div className="bp-card">
          <div className="flex items-baseline justify-between mb-2">
            <span className="bp-callsign">EXTRA / MO</span>
            <span className="bp-fig text-[18px]">{fmt(extra)}</span>
          </div>
          <input
            type="range" min={0} max={2000} step={25} value={extra}
            onChange={(e) => setExtra(Number(e.target.value))}
            className="w-full accent-[var(--bp-signal)]"
          />
        </div>
      </BPSection>

      <BPSection label="§ COMPARISON">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Result title="MINIMUM ONLY" months={noExtra.months} interest={noExtra.totalInterest} muted />
          <Result
            title="AVALANCHE"
            months={avalanche.months}
            interest={avalanche.totalInterest}
            saved={noExtra.totalInterest - avalanche.totalInterest}
            monthsSaved={noExtra.months - avalanche.months}
            highlight
          />
          <Result
            title="SNOWBALL"
            months={snowball.months}
            interest={snowball.totalInterest}
            saved={noExtra.totalInterest - snowball.totalInterest}
            monthsSaved={noExtra.months - snowball.months}
          />
        </div>
      </BPSection>

      <BPSection label="§ NOTE">
        <p className="bp-body-sm">
          Runs locally in your browser. Nothing is stored or sent. To track real debts as boss fights with
          HP bars, interest accrual, and streak rewards, <Link href="/signup" className="bp-link inline-flex">enlist →</Link>
        </p>
      </BPSection>
    </BlueprintToolLayout>
  );
}

function Result({ title, months, interest, saved, monthsSaved, highlight, muted }: {
  title: string; months: number; interest: number; saved?: number; monthsSaved?: number; highlight?: boolean; muted?: boolean;
}) {
  return (
    <div className="bp-card" style={{
      opacity: muted ? 0.6 : 1,
      borderColor: highlight ? "var(--bp-signal)" : undefined,
    }}>
      <div className="bp-callsign" style={{ color: highlight ? "var(--bp-signal)" : undefined }}>{title}</div>
      <div className="bp-fig mt-2" style={{ fontSize: 28 }}>{months >= 600 ? "50+ yr" : `${months} mo`}</div>
      <div className="bp-body-sm mt-1">{fmt(interest)} interest</div>
      {saved != null && saved > 0 && (
        <div className="bp-callsign mt-3" style={{ color: "var(--bp-strike)" }}>
          SAVES {fmt(saved)}{monthsSaved != null && monthsSaved > 0 ? ` · ${monthsSaved} MO FASTER` : ""}
        </div>
      )}
    </div>
  );
}
