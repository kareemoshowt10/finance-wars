"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import ToolLayout from "@/app/_family/ToolLayout";
import { Star, BlobBlue } from "@/app/_family/Characters";

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
    return { finalBalance: Math.round(balance), totalContributions: Math.round(totalContributions), totalInterest: Math.round(balance - totalContributions), rows };
  }, [principal, monthly, rate, years]);

  const maxBal = result.rows[result.rows.length - 1]?.balance || 1;

  return (
    <ToolLayout
      title="Compound Interest Simulator"
      subtitle="See how time and consistency turn small contributions into real wealth."
      icon={<Star size={80} color="#0090ff" />}
      character={<BlobBlue size={64} className="family-character" />}
    >
      <div className="family-card grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div>
          <label className="family-caption block mb-1">Starting amount</label>
          <input className="family-input" type="number" min={0} value={principal} onChange={(e) => setPrincipal(Number(e.target.value))} />
        </div>
        <div>
          <label className="family-caption block mb-1">Monthly addition</label>
          <input className="family-input" type="number" min={0} value={monthly} onChange={(e) => setMonthly(Number(e.target.value))} />
        </div>
        <div>
          <label className="family-caption block mb-1">Annual return %</label>
          <input className="family-input" type="number" min={0} step={0.1} value={rate} onChange={(e) => setRate(Number(e.target.value))} />
        </div>
        <div>
          <label className="family-caption block mb-1">Years</label>
          <input className="family-input" type="number" min={1} max={50} value={years} onChange={(e) => setYears(Number(e.target.value))} />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="family-card">
          <div className="family-caption">Final balance</div>
          <div className="text-[28px] font-semibold tracking-[-0.026em] mt-1 text-[#121212]">${result.finalBalance.toLocaleString()}</div>
        </div>
        <div className="family-card">
          <div className="family-caption">You put in</div>
          <div className="text-[24px] font-semibold tracking-[-0.026em] mt-1 text-[#121212]">${result.totalContributions.toLocaleString()}</div>
        </div>
        <div className="family-card">
          <div className="family-caption">Interest earned</div>
          <div className="text-[24px] font-semibold tracking-[-0.026em] mt-1 text-[#00ca48]">${result.totalInterest.toLocaleString()}</div>
        </div>
      </div>

      <div className="mt-6 family-card">
        <div className="family-heading-sm text-[#121212] mb-4">Growth by year</div>
        <div className="space-y-1.5">
          {result.rows.map((r) => {
            const contribPct = (r.contributions / maxBal) * 100;
            const interestPct = (r.interest / maxBal) * 100;
            return (
              <div key={r.year} className="flex items-center gap-2 text-[12px]">
                <span className="w-6 text-right tabular-nums text-[#848281]">{r.year}</span>
                <div className="flex-1 flex h-3 rounded-full overflow-hidden bg-[#f2f0ed]">
                  <div style={{ background: "#0090ff", width: `${contribPct}%` }} />
                  <div style={{ background: "#00ca48", width: `${interestPct}%` }} />
                </div>
                <span className="w-20 text-right tabular-nums text-[#474645]">${r.balance.toLocaleString()}</span>
              </div>
            );
          })}
        </div>
        <div className="flex gap-4 mt-4 text-[12px] text-[#848281]">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded" style={{ background: "#0090ff" }} />Contributions</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded" style={{ background: "#00ca48" }} />Interest</span>
        </div>
      </div>

      <div className="mt-8 family-card" style={{ background: "linear-gradient(135deg, #fff8f5 0%, #fffaee 100%)" }}>
        <p className="family-body-sm">
          Compounding works for your savings — and against your debt. Finance Wars tracks both sides and shows you which one is winning.
          <Link href="/signup" className="family-link ml-2">Start playing <ArrowRight className="w-3 h-3" /></Link>
        </p>
      </div>
    </ToolLayout>
  );
}
