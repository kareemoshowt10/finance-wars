"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import BlueprintToolLayout, { BPField, BPNumber, BPSection } from "@/app/_blueprint/BlueprintToolLayout";

const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`;

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
    return {
      finalBalance: Math.round(balance),
      totalContributions: Math.round(totalContributions),
      totalInterest: Math.round(balance - totalContributions),
      rows,
    };
  }, [principal, monthly, rate, years]);

  const maxBal = result.rows[result.rows.length - 1]?.balance || 1;

  return (
    <BlueprintToolLayout
      number="07"
      callsign="FOUNDATION / COMPOUND"
      title="Time, multiplied."
      subtitle="See what small monthly contributions become at different time horizons and rates. The same math runs against your debt — it's why APR matters so much."
    >
      <BPSection label="§ INPUTS">
        <div className="bp-card grid grid-cols-2 sm:grid-cols-4 gap-4">
          <BPField label="Starting"><input type="number" min={0} className="bp-input" value={principal} onChange={(e) => setPrincipal(+e.target.value)} /></BPField>
          <BPField label="Monthly add"><input type="number" min={0} className="bp-input" value={monthly} onChange={(e) => setMonthly(+e.target.value)} /></BPField>
          <BPField label="Annual return %"><input type="number" min={0} step={0.1} className="bp-input" value={rate} onChange={(e) => setRate(+e.target.value)} /></BPField>
          <BPField label="Years"><input type="number" min={1} max={50} className="bp-input" value={years} onChange={(e) => setYears(+e.target.value)} /></BPField>
        </div>
      </BPSection>

      <BPSection label="§ READOUT">
        <div className="grid grid-cols-3 gap-3">
          <BPNumber label="FINAL BALANCE" value={fmt(result.finalBalance)} />
          <BPNumber label="YOU PUT IN" value={fmt(result.totalContributions)} />
          <BPNumber label="INTEREST EARNED" value={fmt(result.totalInterest)} accent="strike" />
        </div>
      </BPSection>

      <BPSection label="§ GROWTH BY YEAR">
        <div className="bp-card">
          <div className="space-y-1.5">
            {result.rows.map((r) => {
              const contribPct = (r.contributions / maxBal) * 100;
              const interestPct = (r.interest / maxBal) * 100;
              return (
                <div key={r.year} className="flex items-center gap-3 text-[12px]">
                  <span className="w-7 text-right bp-fig text-[var(--bp-mute)]">Y{r.year}</span>
                  <div className="flex-1 flex h-3 border border-[var(--bp-rule-faint)]">
                    <div style={{ background: "var(--bp-ink)", width: `${contribPct}%` }} />
                    <div style={{ background: "var(--bp-strike)", width: `${interestPct}%` }} />
                  </div>
                  <span className="w-24 text-right bp-fig">{fmt(r.balance)}</span>
                </div>
              );
            })}
          </div>
          <div className="flex gap-5 mt-4 bp-callsign">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3" style={{ background: "var(--bp-ink)" }} />CONTRIBUTIONS</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3" style={{ background: "var(--bp-strike)" }} />INTEREST</span>
          </div>
        </div>
      </BPSection>

      <BPSection label="§ NOTE">
        <p className="bp-body-sm">
          Compounding works for your savings — and against your debt. <Link href="/tools/mortgage" className="bp-link inline-flex">Mortgage payoff</Link> shows the inverse. <Link href="/signup" className="bp-link inline-flex">Track both in app →</Link>
        </p>
      </BPSection>
    </BlueprintToolLayout>
  );
}
