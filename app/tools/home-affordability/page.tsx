"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import BlueprintToolLayout, { BPField, BPNumber, BPSection } from "@/app/_blueprint/BlueprintToolLayout";
import { computePITI, maxAffordableHomePrice, debtToIncome } from "@/lib/bigPurchase";

const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`;
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

export default function HomeAffordabilityPage() {
  const [grossIncome, setGrossIncome] = useState(120000); // combined household
  const [otherDebts, setOtherDebts] = useState(450);      // monthly car + student loans + cc
  const [downPayment, setDownPayment] = useState(60000);
  const [aprPct, setAprPct] = useState(6.75);
  const [years, setYears] = useState(30);
  const [taxRate, setTaxRate] = useState(1.1);            // annual % of home value
  const [annualInsurance, setAnnualInsurance] = useState(1800);
  const [hoa, setHoa] = useState(0);

  const monthlyIncome = grossIncome / 12;
  const monthlyBudget = monthlyIncome * 0.28 - 0; // 28% front-end rule

  const max = useMemo(() => maxAffordableHomePrice({
    monthlyBudget: Math.max(monthlyBudget, 0),
    downPayment, aprPct, years,
    annualTaxRatePct: taxRate, annualInsurance, monthlyHOA: hoa,
  }), [monthlyBudget, downPayment, aprPct, years, taxRate, annualInsurance, hoa]);

  const piti = useMemo(() => computePITI({
    homePrice: max, downPayment, aprPct, years,
    annualTaxRatePct: taxRate, annualInsurance, monthlyHOA: hoa,
  }), [max, downPayment, aprPct, years, taxRate, annualInsurance, hoa]);

  const dti = useMemo(() => debtToIncome({
    grossMonthlyIncome: monthlyIncome,
    monthlyHousing: piti.total,
    otherMonthlyDebts: otherDebts,
  }), [monthlyIncome, piti.total, otherDebts]);

  return (
    <BlueprintToolLayout
      number="01"
      callsign="HOMEOWNER / AFFORDABILITY"
      title="How much house can you actually afford?"
      subtitle="Run the 28/36 rule against your combined income with real property taxes, insurance, PMI, and HOA factored in — not the marketing number a lender gives you."
    >
      <div className="grid lg:grid-cols-[1fr_1.2fr] gap-12">
        {/* INPUTS ------------------------------------------------------- */}
        <div className="space-y-6">
          <div className="bp-callsign">INPUTS</div>

          <div className="grid grid-cols-2 gap-4">
            <BPField label="Household income / yr" hint="combined gross">
              <input type="number" className="bp-input" value={grossIncome} onChange={(e) => setGrossIncome(+e.target.value)} />
            </BPField>
            <BPField label="Other monthly debts" hint="cars, loans, cc">
              <input type="number" className="bp-input" value={otherDebts} onChange={(e) => setOtherDebts(+e.target.value)} />
            </BPField>
            <BPField label="Down payment saved">
              <input type="number" className="bp-input" value={downPayment} onChange={(e) => setDownPayment(+e.target.value)} />
            </BPField>
            <BPField label="Mortgage APR %" hint="30-yr fixed avg">
              <input type="number" step={0.01} className="bp-input" value={aprPct} onChange={(e) => setAprPct(+e.target.value)} />
            </BPField>
            <BPField label="Loan term / yrs">
              <input type="number" className="bp-input" value={years} onChange={(e) => setYears(+e.target.value)} />
            </BPField>
            <BPField label="Property tax rate %" hint="annual, of value">
              <input type="number" step={0.05} className="bp-input" value={taxRate} onChange={(e) => setTaxRate(+e.target.value)} />
            </BPField>
            <BPField label="Insurance / yr">
              <input type="number" className="bp-input" value={annualInsurance} onChange={(e) => setAnnualInsurance(+e.target.value)} />
            </BPField>
            <BPField label="HOA / mo">
              <input type="number" className="bp-input" value={hoa} onChange={(e) => setHoa(+e.target.value)} />
            </BPField>
          </div>
        </div>

        {/* READOUT ------------------------------------------------------ */}
        <div>
          <div className="bp-callsign mb-4">READOUT</div>
          <div className="bp-panel">
            <div className="bp-callsign">YOU CAN AFFORD A HOME UP TO</div>
            <div className="bp-fig mt-2" style={{ fontSize: "72px", lineHeight: 0.9, color: "var(--bp-ink)" }}>{fmt(max)}</div>
            <div className="bp-body-sm mt-2">based on a max housing payment of <span className="bp-fig">{fmt(piti.total)}</span>/mo (28% of gross)</div>
          </div>

          <BPSection label="§ MONTHLY BREAKDOWN — PITI">
            <div className="grid grid-cols-2 gap-3">
              <Row label="Principal + interest" value={fmt(piti.principalInterest)} />
              <Row label="Property taxes" value={fmt(piti.taxes)} />
              <Row label="Insurance" value={fmt(piti.insurance)} />
              <Row label="HOA" value={fmt(piti.hoa)} />
              {piti.pmi > 0 && <Row label="PMI (LTV > 80%)" value={fmt(piti.pmi)} accent="signal" />}
              <Row label="TOTAL" value={fmt(piti.total)} bold />
            </div>
          </BPSection>

          <BPSection label="§ DEBT-TO-INCOME CHECK">
            <div className="grid grid-cols-2 gap-3">
              <BPNumber label="Front-end / 28% ceiling" value={pct(dti.frontEnd)} accent={dti.frontEndOk ? "strike" : "signal"} />
              <BPNumber label="Back-end / 36% ceiling" value={pct(dti.backEnd)} accent={dti.backEndOk ? "strike" : "signal"} />
            </div>
            {!dti.backEndOk && (
              <p className="bp-body-sm mt-3">Total debt load exceeds 36% of gross. Lenders may still approve but underwriting tightens. Pay down a card or two before applying.</p>
            )}
          </BPSection>

          <BPSection label="§ NEXT STEPS">
            <ul className="space-y-2 bp-body-sm">
              <li>↳ Save toward the down payment — see <Link href="/tools/down-payment" className="bp-link inline-flex">Down Payment Plan</Link></li>
              <li>↳ Track the goal as a <Link href="/dashboard/raids" className="bp-link inline-flex">Goal Raid</Link> if your timeframe is under 6 months</li>
              <li>↳ Align with your partner first — try <Link href="/dashboard/couples/money-mind" className="bp-link inline-flex">Money Mind</Link></li>
            </ul>
          </BPSection>
        </div>
      </div>
    </BlueprintToolLayout>
  );
}

function Row({ label, value, accent, bold }: { label: string; value: string; accent?: "signal"; bold?: boolean }) {
  return (
    <div className={`flex justify-between items-baseline py-3 border-b border-[var(--bp-rule-faint)] ${bold ? "border-t border-[var(--bp-ink)]" : ""}`}>
      <span className={`bp-body-sm ${bold ? "text-[var(--bp-ink)] font-medium" : ""}`}>{label}</span>
      <span className={`bp-fig ${bold ? "text-[18px]" : "text-[15px]"}`} style={{ color: accent === "signal" ? "var(--bp-signal)" : undefined }}>{value}</span>
    </div>
  );
}
