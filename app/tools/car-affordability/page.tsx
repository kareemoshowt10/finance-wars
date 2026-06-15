"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import BlueprintToolLayout, { BPField, BPNumber, BPSection } from "@/app/_blueprint/BlueprintToolLayout";
import { carAffordability } from "@/lib/bigPurchase";

const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`;

export default function CarAffordabilityPage() {
  const [takeHome, setTakeHome] = useState(7000);     // monthly, post-tax
  const [downPayment, setDownPayment] = useState(6000);
  const [aprPct, setAprPct] = useState(8.5);
  const [years, setYears] = useState(4);
  const [insurance, setInsurance] = useState(180);
  const [fuel, setFuel] = useState(150);
  const [maintenance, setMaintenance] = useState(75);

  const r = useMemo(() => carAffordability({
    monthlyTakeHome: takeHome, downPayment, aprPct, years,
    monthlyInsurance: insurance, monthlyFuel: fuel, monthlyMaintenance: maintenance,
  }), [takeHome, downPayment, aprPct, years, insurance, fuel, maintenance]);

  const overBudget = r.monthlyTCO > r.tenPercentBudget;

  return (
    <BlueprintToolLayout
      number="04"
      callsign="CAR OWNER / AFFORDABILITY"
      title="The 20 / 4 / 10 rule, with real costs."
      subtitle="20% down. 4-year max loan. Total transport cost ≤10% of take-home. Most car-buyers blow rule #3 because they forget insurance, fuel, and maintenance. Don't."
    >
      <div className="grid lg:grid-cols-[1fr_1.2fr] gap-12">
        <div className="space-y-6">
          <div className="bp-callsign">INPUTS</div>
          <div className="grid grid-cols-2 gap-4">
            <BPField label="Monthly take-home" hint="post-tax">
              <input type="number" className="bp-input" value={takeHome} onChange={(e) => setTakeHome(+e.target.value)} />
            </BPField>
            <BPField label="Cash for down payment">
              <input type="number" className="bp-input" value={downPayment} onChange={(e) => setDownPayment(+e.target.value)} />
            </BPField>
            <BPField label="Loan APR %">
              <input type="number" step={0.1} className="bp-input" value={aprPct} onChange={(e) => setAprPct(+e.target.value)} />
            </BPField>
            <BPField label="Loan term / yrs" hint="≤4 ideal">
              <input type="number" className="bp-input" value={years} onChange={(e) => setYears(+e.target.value)} />
            </BPField>
            <BPField label="Insurance / mo">
              <input type="number" className="bp-input" value={insurance} onChange={(e) => setInsurance(+e.target.value)} />
            </BPField>
            <BPField label="Fuel / mo">
              <input type="number" className="bp-input" value={fuel} onChange={(e) => setFuel(+e.target.value)} />
            </BPField>
            <BPField label="Maintenance / mo">
              <input type="number" className="bp-input" value={maintenance} onChange={(e) => setMaintenance(+e.target.value)} />
            </BPField>
          </div>
        </div>

        <div>
          <div className="bp-callsign mb-4">READOUT</div>

          <div className="bp-panel">
            <div className="bp-callsign">MAX CAR PRICE</div>
            <div className="bp-fig mt-2" style={{ fontSize: "64px", lineHeight: 0.9 }}>{fmt(r.maxCarPrice)}</div>
            <div className="bp-body-sm mt-2">
              Down: {fmt(downPayment)} · Loan: {fmt(r.fourYearMaxLoan)}
            </div>
          </div>

          <BPSection label="§ THE 10% RULE">
            <div className="grid grid-cols-2 gap-3">
              <BPNumber label="10% budget ceiling" value={`${fmt(r.tenPercentBudget)}/mo`} accent="blueprint" />
              <BPNumber label="Your total TCO" value={`${fmt(r.monthlyTCO)}/mo`} accent={overBudget ? "signal" : "strike"} />
            </div>
            {overBudget && (
              <p className="bp-body-sm mt-3">You're over the 10% ceiling. Reduce price, extend term cautiously, or shop a used car with lower insurance.</p>
            )}
          </BPSection>

          <BPSection label="§ MONTHLY COST BREAKDOWN">
            <div className="space-y-0">
              <Row label="Loan payment" value={`${fmt(r.loanMonthly)}/mo`} />
              <Row label="Insurance" value={`${fmt(insurance)}/mo`} />
              <Row label="Fuel" value={`${fmt(fuel)}/mo`} />
              <Row label="Maintenance" value={`${fmt(maintenance)}/mo`} />
              <Row label="TOTAL OF OWNERSHIP" value={`${fmt(r.monthlyTCO)}/mo`} bold />
            </div>
          </BPSection>

          <BPSection label="§ 20% DOWN CHECK">
            <p className="bp-body-sm">
              Your {fmt(downPayment)} down covers 20% of a car priced at{" "}
              <span className="bp-fig">{fmt(r.twentyDownTarget)}</span>. Buying above that means starting underwater — you'll owe more than the car is worth the day you drive off.
            </p>
          </BPSection>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/signup" className="bp-btn-primary">Track car expenses</Link>
            <Link href="/tools/debt-calculator" className="bp-btn-secondary">Already have a loan?</Link>
          </div>
        </div>
      </div>
    </BlueprintToolLayout>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between items-baseline py-3 border-b border-[var(--bp-rule-faint)] ${bold ? "border-t border-[var(--bp-ink)]" : ""}`}>
      <span className={`bp-body-sm ${bold ? "text-[var(--bp-ink)] font-medium" : ""}`}>{label}</span>
      <span className={`bp-fig ${bold ? "text-[18px]" : "text-[15px]"}`}>{value}</span>
    </div>
  );
}
