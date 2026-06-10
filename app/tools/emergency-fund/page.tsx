"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import ToolLayout from "@/app/_family/ToolLayout";
import { ShieldVault, BlobGreen } from "@/app/_family/Characters";

const RISK_PROFILES = [
  { label: "Low risk", months: 3, desc: "Stable job, dual income, no dependents." },
  { label: "Medium risk", months: 4.5, desc: "Single income, moderate job market." },
  { label: "High risk", months: 6, desc: "Self-employed, volatile industry, dependents." },
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
    <ToolLayout
      title="Emergency Fund Calculator"
      subtitle="How much do you really need? Find out in 30 seconds."
      icon={<ShieldVault size={80} />}
      character={<BlobGreen size={64} className="family-character" />}
    >
      <div className="family-card space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="family-caption block mb-1">Monthly essential expenses</label>
            <input className="family-input" type="number" min={0} value={expenses} onChange={(e) => setExpenses(Number(e.target.value))} />
          </div>
          <div>
            <label className="family-caption block mb-1">Already saved</label>
            <input className="family-input" type="number" min={0} value={saved} onChange={(e) => setSaved(Number(e.target.value))} />
          </div>
        </div>

        <div>
          <div className="family-caption mb-2">Risk profile</div>
          <div className="grid grid-cols-3 gap-2">
            {RISK_PROFILES.map((p, i) => (
              <button
                key={i}
                onClick={() => setRisk(i)}
                className="p-3 rounded-[10px] text-left transition"
                style={{
                  background: risk === i ? "#fff2eb" : "#ffffff",
                  boxShadow: risk === i ? "0 0 0 2px #ff3e00" : "var(--shadow-subtle)",
                }}
              >
                <div className="text-[14px] font-semibold text-[#121212]">{p.label}</div>
                <div className="text-[12px] text-[#474645] mt-0.5">{p.months} months</div>
                <div className="text-[11px] text-[#848281] mt-1">{p.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="family-caption flex justify-between mb-2">
            <span>Monthly savings toward fund</span>
            <span className="text-[#121212] font-medium font-mono">${monthlySave}</span>
          </label>
          <input type="range" min={50} max={2000} step={25} value={monthlySave} onChange={(e) => setMonthlySave(Number(e.target.value))} className="w-full accent-[#ff3e00]" />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="family-card">
          <div className="family-caption">Target</div>
          <div className="text-[28px] font-semibold tracking-[-0.026em] mt-1 text-[#121212]">${target.toLocaleString()}</div>
          <div className="text-[11px] text-[#848281] mt-0.5">{RISK_PROFILES[risk].months} months of expenses</div>
        </div>
        <div className="family-card">
          <div className="family-caption">Gap remaining</div>
          <div className="text-[28px] font-semibold tracking-[-0.026em] mt-1" style={{ color: gap === 0 ? "#00ca48" : "#ff3e00" }}>
            {gap === 0 ? "Funded" : `$${gap.toLocaleString()}`}
          </div>
        </div>
        <div className="family-card">
          <div className="family-caption">Months to target</div>
          <div className="text-[28px] font-semibold tracking-[-0.026em] mt-1 text-[#121212]">
            {gap === 0 ? "0" : monthsToTarget != null ? monthsToTarget : "—"}
          </div>
        </div>
      </div>

      <div className="mt-6 family-card">
        <div className="flex justify-between family-caption mb-2">
          <span>Progress</span>
          <span>{pct}%</span>
        </div>
        <div className="h-4 rounded-full bg-[#f2f0ed] overflow-hidden">
          <div className="h-full transition-all" style={{ width: `${pct}%`, background: pct >= 100 ? "#00ca48" : "#ff3e00" }} />
        </div>
      </div>

      <div className="mt-6 family-card-cream space-y-2">
        <p className="family-body-sm"><strong className="text-[#121212]">Tier 1:</strong> Get $1,000 as fast as you can. Covers a flat tire or ER copay.</p>
        <p className="family-body-sm"><strong className="text-[#121212]">Tier 2:</strong> 1 month of expenses. You can now survive a paycheck delay.</p>
        <p className="family-body-sm"><strong className="text-[#121212]">Tier 3:</strong> 3–6 months. Your real buffer against a layoff.</p>
      </div>

      <div className="mt-8 family-card" style={{ background: "linear-gradient(135deg, #fff8f5 0%, #fffaee 100%)" }}>
        <p className="family-body-sm">
          Finance Wars tracks your savings goals with progress bars, Vice Tax auto-funding, and weekly recaps.
          <Link href="/signup" className="family-link ml-2">Start playing <ArrowRight className="w-3 h-3" /></Link>
        </p>
      </div>
    </ToolLayout>
  );
}
