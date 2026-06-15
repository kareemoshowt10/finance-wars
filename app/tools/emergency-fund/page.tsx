"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import BlueprintToolLayout, { BPField, BPNumber, BPSection } from "@/app/_blueprint/BlueprintToolLayout";

const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`;

const RISK_PROFILES = [
  { label: "LOW", months: 3, desc: "Stable job, dual income, no dependents" },
  { label: "MEDIUM", months: 4.5, desc: "Single income, moderate job market" },
  { label: "HIGH", months: 6, desc: "Self-employed, volatile industry, dependents" },
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
    <BlueprintToolLayout
      number="08"
      callsign="FOUNDATION / EMERGENCY FUND"
      title="How big a cushion you actually need."
      subtitle="Three months. Six months. The right number depends on your risk profile, not a one-size-fits-all rule. We compute the gap and the timeline at your current pace."
    >
      <BPSection label="§ INPUTS">
        <div className="bp-card space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <BPField label="Monthly essential expenses">
              <input type="number" className="bp-input" value={expenses} onChange={(e) => setExpenses(Number(e.target.value))} />
            </BPField>
            <BPField label="Already saved">
              <input type="number" className="bp-input" value={saved} onChange={(e) => setSaved(Number(e.target.value))} />
            </BPField>
          </div>

          <div>
            <div className="bp-callsign mb-2">RISK PROFILE</div>
            <div className="grid grid-cols-3 gap-3">
              {RISK_PROFILES.map((p, i) => (
                <button
                  key={i}
                  onClick={() => setRisk(i)}
                  className="text-left p-3 transition"
                  style={{
                    background: risk === i ? "rgba(184,92,40,0.08)" : "rgba(255,255,255,0.5)",
                    border: `1px solid ${risk === i ? "var(--bp-signal)" : "var(--bp-rule-faint)"}`,
                  }}
                >
                  <div className="bp-callsign" style={{ color: risk === i ? "var(--bp-signal)" : undefined }}>{p.label}</div>
                  <div className="bp-fig text-[18px] mt-1">{p.months} mo</div>
                  <div className="text-[11px] text-[var(--bp-mute)] mt-1 leading-tight">{p.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <BPField label={`Monthly savings · ${fmt(monthlySave)}`}>
            <input type="range" min={50} max={2000} step={25} value={monthlySave} onChange={(e) => setMonthlySave(Number(e.target.value))} className="w-full accent-[var(--bp-signal)]" />
          </BPField>
        </div>
      </BPSection>

      <BPSection label="§ READOUT">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <BPNumber label="TARGET" value={fmt(target)} />
          <BPNumber label="GAP" value={gap === 0 ? "FUNDED" : fmt(gap)} accent={gap === 0 ? "strike" : "signal"} />
          <BPNumber label="MONTHS TO TARGET" value={gap === 0 ? "0" : monthsToTarget != null ? String(monthsToTarget) : "—"} accent="blueprint" />
        </div>
      </BPSection>

      <BPSection label="§ PROGRESS">
        <div className="bp-card">
          <div className="flex justify-between bp-callsign mb-2">
            <span>{Math.round(pct)}% FUNDED</span>
            <span>{fmt(saved)} / {fmt(target)}</span>
          </div>
          <div className="bp-progress">
            <div className="bp-progress-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </BPSection>

      <BPSection label="§ TIERS">
        <div className="grid sm:grid-cols-3 gap-3">
          <Tier n="01" t="$1,000 STARTER" b="Covers a flat tire or ER copay. Hit this before attacking debt." />
          <Tier n="02" t="1 MONTH OF EXPENSES" b="You can now survive a paycheck delay. Build after high-APR debt is gone." />
          <Tier n="03" t="3–6 MONTHS" b="Real buffer against a layoff. Don't touch for anything less than a real emergency." />
        </div>
      </BPSection>

      <BPSection label="§ NEXT STEPS">
        <p className="bp-body-sm">
          Move emergency savings into a high-yield savings account. <Link href="/tools/compound-interest" className="bp-link inline-flex">See what HYSA APY adds</Link> · <Link href="/signup" className="bp-link inline-flex">Track this goal in app →</Link>
        </p>
      </BPSection>
    </BlueprintToolLayout>
  );
}

function Tier({ n, t, b }: { n: string; t: string; b: string }) {
  return (
    <div className="bp-card">
      <div className="bp-callsign">TIER {n}</div>
      <div className="bp-h3 mt-2">{t}</div>
      <p className="bp-body-sm mt-2">{b}</p>
    </div>
  );
}
