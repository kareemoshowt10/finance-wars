"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import BlueprintToolLayout, { BPField, BPNumber, BPSection } from "@/app/_blueprint/BlueprintToolLayout";
import { downPaymentPlan } from "@/lib/bigPurchase";

const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`;

export default function DownPaymentPlanPage() {
  const [homePrice, setHomePrice] = useState(550000);
  const [downPct, setDownPct] = useState(20);
  const [currentlySaved, setCurrentlySaved] = useState(8500);
  const [monthlySaving, setMonthlySaving] = useState(1200);
  const [apyPct, setApyPct] = useState(4.5);

  const plan = useMemo(() => downPaymentPlan({ homePrice, downPct, currentlySaved, monthlySaving, apyPct }),
    [homePrice, downPct, currentlySaved, monthlySaving, apyPct]);

  const pct = plan.required > 0 ? Math.min(100, (currentlySaved / plan.required) * 100) : 0;

  return (
    <BlueprintToolLayout
      number="03"
      callsign="HOMEOWNER / DOWN PAYMENT"
      title="Map the path to the front door."
      subtitle="Pick a price and a down %. We'll tell you exactly what to save per month — and when the keys will be in your hand if you stay on pace."
    >
      <div className="grid lg:grid-cols-[1fr_1.2fr] gap-12">
        <div className="space-y-6">
          <div className="bp-callsign">INPUTS</div>
          <div className="grid grid-cols-2 gap-4">
            <BPField label="Target home price">
              <input type="number" className="bp-input" value={homePrice} onChange={(e) => setHomePrice(+e.target.value)} />
            </BPField>
            <BPField label="Down payment %" hint="20% avoids PMI">
              <input type="number" className="bp-input" value={downPct} onChange={(e) => setDownPct(+e.target.value)} />
            </BPField>
            <BPField label="Currently saved">
              <input type="number" className="bp-input" value={currentlySaved} onChange={(e) => setCurrentlySaved(+e.target.value)} />
            </BPField>
            <BPField label="Monthly savings rate">
              <input type="number" className="bp-input" value={monthlySaving} onChange={(e) => setMonthlySaving(+e.target.value)} />
            </BPField>
            <BPField label="HYSA APY %" hint="4-5% typical">
              <input type="number" step={0.1} className="bp-input" value={apyPct} onChange={(e) => setApyPct(+e.target.value)} />
            </BPField>
          </div>
        </div>

        <div>
          <div className="bp-callsign mb-4">READOUT</div>

          <div className="bp-panel">
            <div className="bp-callsign">TARGET</div>
            <div className="bp-fig mt-2" style={{ fontSize: "56px", lineHeight: 0.9 }}>{fmt(plan.required)}</div>
            <div className="bp-body-sm mt-2">
              {downPct}% of {fmt(homePrice)} · {fmt(plan.gap)} to go
            </div>

            <div className="mt-5">
              <div className="flex justify-between bp-callsign mb-1">
                <span>PROGRESS</span><span>{Math.round(pct)}%</span>
              </div>
              <div className="bp-progress">
                <div className="bp-progress-fill" style={{ width: `${pct}%` }} />
              </div>
              <div className="flex justify-between text-[12px] text-[var(--bp-mute)] mt-1.5 bp-fig">
                <span>{fmt(currentlySaved)}</span>
                <span>{fmt(plan.required)}</span>
              </div>
            </div>
          </div>

          <BPSection label="§ TIMELINE AT CURRENT PACE">
            <div className="grid grid-cols-2 gap-3">
              <BPNumber
                label="MONTHS TO READY"
                value={plan.monthsToReady != null ? String(plan.monthsToReady) : "—"}
                accent="blueprint"
              />
              <BPNumber
                label="MOVE-IN MONTH"
                value={plan.readyDate ?? "—"}
                accent="blueprint"
              />
            </div>
            {plan.monthsToReady === null && (
              <p className="bp-body-sm mt-3">At your current monthly rate you'd never reach the target. Either lower the price, lower the down %, or raise the rate.</p>
            )}
          </BPSection>

          <BPSection label="§ IF YOU WANT TO HIT THIS FASTER">
            <div className="grid grid-cols-2 gap-3">
              <div className="bp-card">
                <div className="bp-callsign">IN 3 YEARS</div>
                <div className="bp-fig mt-2" style={{ fontSize: "28px", color: "var(--bp-signal)" }}>{fmt(plan.perMonthFor3Years)}/mo</div>
              </div>
              <div className="bp-card">
                <div className="bp-callsign">IN 5 YEARS</div>
                <div className="bp-fig mt-2" style={{ fontSize: "28px" }}>{fmt(plan.perMonthFor5Years)}/mo</div>
              </div>
            </div>
          </BPSection>

          <BPSection label="§ DO THIS NEXT">
            <ul className="space-y-2 bp-body-sm">
              <li>↳ Move savings into a <strong>high-yield savings account</strong> — that 4.5% APY is doing real work.</li>
              <li>↳ Set up a <Link href="/dashboard/vice-tax" className="bp-link inline-flex">Vice Tax</Link> on your top discretionary category and route it here.</li>
              <li>↳ If your timeline is under 6 months, make it a <Link href="/dashboard/raids" className="bp-link inline-flex">Goal Raid</Link>.</li>
            </ul>
          </BPSection>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/signup" className="bp-btn-primary">Track this goal</Link>
            <Link href="/tools/home-affordability" className="bp-btn-secondary">Verify affordability</Link>
          </div>
        </div>
      </div>
    </BlueprintToolLayout>
  );
}
