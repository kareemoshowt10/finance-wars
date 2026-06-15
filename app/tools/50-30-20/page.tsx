"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import BlueprintToolLayout, { BPField, BPSection } from "@/app/_blueprint/BlueprintToolLayout";

const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`;

export default function BudgetBuilderPage() {
  const [income, setIncome] = useState(5000);
  const [period, setPeriod] = useState<"monthly" | "annual">("monthly");

  const monthly = period === "annual" ? income / 12 : income;
  const splits = useMemo(() => ({
    needs: Math.round(monthly * 0.5),
    wants: Math.round(monthly * 0.3),
    savings: Math.round(monthly * 0.2),
  }), [monthly]);

  return (
    <BlueprintToolLayout
      number="06"
      callsign="FOUNDATION / 50-30-20"
      title="A budget that fits on a napkin."
      subtitle="Half on needs. A third on wants. A fifth on the future. The framework you can set up in 30 seconds and run for a decade."
    >
      <BPSection label="§ INPUT">
        <div className="bp-card max-w-md">
          <BPField label="Take-home income">
            <div className="flex gap-2 mt-1">
              <input className="bp-input flex-1" type="number" min={0} value={income} onChange={(e) => setIncome(Number(e.target.value))} />
              <select className="bp-input w-32" value={period} onChange={(e) => setPeriod(e.target.value as "monthly" | "annual")}>
                <option value="monthly">Monthly</option>
                <option value="annual">Annual</option>
              </select>
            </div>
          </BPField>
          {period === "annual" && (
            <div className="bp-callsign mt-3">MONTHLY EQUIVALENT · <span className="bp-fig text-[var(--bp-ink)]">{fmt(monthly)}</span></div>
          )}
        </div>
      </BPSection>

      <BPSection label="§ ALLOCATION">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Bucket pct={50} label="NEEDS" amount={splits.needs} items={["Rent / mortgage", "Utilities", "Groceries", "Insurance", "Min debt payments", "Transport"]} />
          <Bucket pct={30} label="WANTS" amount={splits.wants} items={["Dining out", "Subscriptions", "Shopping", "Entertainment", "Travel", "Hobbies"]} />
          <Bucket pct={20} label="SAVINGS & DEBT" amount={splits.savings} accent items={["Emergency fund", "Extra debt", "Retirement", "Investments", "Goal savings"]} />
        </div>

        <div className="mt-6 bp-card">
          <div className="flex h-3 border border-[var(--bp-ink)]">
            <div style={{ background: "var(--bp-ink)", width: "50%" }} />
            <div style={{ background: "var(--bp-mute)", width: "30%" }} />
            <div style={{ background: "var(--bp-signal)", width: "20%" }} />
          </div>
          <div className="flex justify-between mt-2 bp-callsign">
            <span>50% NEEDS</span><span>30% WANTS</span><span style={{ color: "var(--bp-signal)" }}>20% SAVINGS</span>
          </div>
        </div>
      </BPSection>

      <BPSection label="§ NOTE">
        <p className="bp-body-sm">
          If needs exceed 50%, reduce fixed costs first — negotiate bills, refinance, downsize. If savings exceed 20%, you're winning. Route the surplus into a <Link href="/dashboard/vice-tax" className="bp-link inline-flex">Vice Tax</Link> or accelerated debt payoff.
        </p>
      </BPSection>
    </BlueprintToolLayout>
  );
}

function Bucket({ pct, label, amount, items, accent }: { pct: number; label: string; amount: number; items: string[]; accent?: boolean }) {
  return (
    <div className="bp-card" style={accent ? { borderColor: "var(--bp-signal)" } : undefined}>
      <div className="bp-callsign" style={accent ? { color: "var(--bp-signal)" } : undefined}>{pct}% {label}</div>
      <div className="bp-fig mt-2" style={{ fontSize: 32 }}>{`$${amount.toLocaleString()}`}</div>
      <div className="bp-callsign mt-1" style={{ color: "var(--bp-mute)" }}>PER MONTH</div>
      <ul className="mt-4 space-y-1 text-[13px] text-[var(--bp-ink)]">
        {items.map((i) => <li key={i}>· {i}</li>)}
      </ul>
    </div>
  );
}
