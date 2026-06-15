"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import BlueprintToolLayout, { BPField, BPNumber, BPSection } from "@/app/_blueprint/BlueprintToolLayout";
import { mortgagePayoff, monthlyMortgagePayment } from "@/lib/bigPurchase";

const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`;

export default function MortgagePayoffPage() {
  const [loan, setLoan] = useState(380000);
  const [aprPct, setAprPct] = useState(6.5);
  const [years, setYears] = useState(30);
  const [extra, setExtra] = useState(200);

  const basePmt = useMemo(() => monthlyMortgagePayment(loan, aprPct, years), [loan, aprPct, years]);
  const result = useMemo(() => mortgagePayoff({ loan, aprPct, years, extraMonthly: extra }), [loan, aprPct, years, extra]);

  return (
    <BlueprintToolLayout
      number="02"
      callsign="HOMEOWNER / PAYOFF ACCELERATION"
      title="Pay your mortgage off years earlier."
      subtitle="Every extra dollar of principal lops months — sometimes years — off the back of your loan. Run the numbers, find the smallest monthly bump that meaningfully shortens the timeline."
    >
      <div className="grid lg:grid-cols-[1fr_1.2fr] gap-12">
        <div className="space-y-6">
          <div className="bp-callsign">INPUTS</div>
          <div className="grid grid-cols-2 gap-4">
            <BPField label="Loan balance">
              <input type="number" className="bp-input" value={loan} onChange={(e) => setLoan(+e.target.value)} />
            </BPField>
            <BPField label="APR %">
              <input type="number" step={0.01} className="bp-input" value={aprPct} onChange={(e) => setAprPct(+e.target.value)} />
            </BPField>
            <BPField label="Remaining term / yrs">
              <input type="number" className="bp-input" value={years} onChange={(e) => setYears(+e.target.value)} />
            </BPField>
            <BPField label="Extra monthly / principal" hint={`+$${extra}/mo`}>
              <input type="range" min={0} max={2000} step={25} className="w-full accent-[var(--bp-signal)]" value={extra} onChange={(e) => setExtra(+e.target.value)} />
              <input type="number" min={0} className="bp-input mt-2" value={extra} onChange={(e) => setExtra(+e.target.value)} />
            </BPField>
          </div>

          <div className="bp-panel mt-4">
            <div className="bp-callsign">CURRENT MONTHLY P&amp;I</div>
            <div className="bp-fig mt-2" style={{ fontSize: "32px" }}>{fmt(basePmt)}</div>
            <div className="bp-body-sm mt-2">With +{fmt(extra)} extra: total {fmt(basePmt + extra)}/mo</div>
          </div>
        </div>

        <div>
          <div className="bp-callsign mb-4">READOUT</div>
          <div className="grid grid-cols-2 gap-3">
            <BPNumber label="Years cut off" value={(result.monthsSaved / 12).toFixed(1)} accent="strike" />
            <BPNumber label="Interest saved" value={fmt(result.interestSaved)} accent="strike" />
            <BPNumber label="New payoff date" value={result.payoffDate} accent="blueprint" />
            <BPNumber label="Months remaining" value={String(result.acceleratedMonths)} />
          </div>

          <BPSection label="§ COMPARISON">
            <div className="grid grid-cols-2 gap-3">
              <div className="bp-card">
                <div className="bp-callsign">WITHOUT EXTRA</div>
                <div className="bp-fig mt-2" style={{ fontSize: "22px" }}>{(result.baseMonths / 12).toFixed(1)} yrs</div>
                <div className="bp-body-sm mt-1">{fmt(result.baseInterest)} interest</div>
              </div>
              <div className="bp-card" style={{ borderColor: "var(--bp-strike)" }}>
                <div className="bp-callsign" style={{ color: "var(--bp-strike)" }}>WITH +{fmt(extra)}/MO</div>
                <div className="bp-fig mt-2" style={{ fontSize: "22px", color: "var(--bp-strike)" }}>{(result.acceleratedMonths / 12).toFixed(1)} yrs</div>
                <div className="bp-body-sm mt-1">{fmt(result.acceleratedInterest)} interest</div>
              </div>
            </div>
          </BPSection>

          <BPSection label="§ THE TRADE-OFF">
            <p className="bp-body-sm">
              An extra <span className="bp-fig">{fmt(extra)}/mo</span> means giving up{" "}
              <span className="bp-fig">{fmt(extra * 12)}/yr</span> of liquid cash, but you trade it for{" "}
              <span className="bp-fig" style={{ color: "var(--bp-strike)" }}>{fmt(result.interestSaved)}</span>{" "}
              in interest you'll never pay and{" "}
              <span className="bp-fig" style={{ color: "var(--bp-strike)" }}>{(result.monthsSaved / 12).toFixed(1)} years</span>{" "}
              of life without a mortgage hanging over you.
            </p>
            <p className="bp-body-sm mt-3">
              ↳ Considering investing that money instead? Compare your expected return to your APR.
              If your APR is 6.5% and you expect 7% in the market, it's close to a wash — pay down
              the certain debt unless you're already maxing tax-advantaged accounts.
            </p>
          </BPSection>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/signup" className="bp-btn-primary">Track this in app</Link>
            <Link href="/tools/home-affordability" className="bp-btn-secondary">Affordability calc</Link>
          </div>
        </div>
      </div>
    </BlueprintToolLayout>
  );
}
