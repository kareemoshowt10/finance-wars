"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import ToolLayout from "@/app/_family/ToolLayout";
import { CoinStack, BlobYellow } from "@/app/_family/Characters";

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
    <ToolLayout
      title="50/30/20 Budget Builder"
      subtitle="Enter your income. Get your budget targets instantly."
      icon={<CoinStack size={80} />}
      character={<BlobYellow size={64} className="family-character" />}
    >
      <div className="family-card space-y-4">
        <div>
          <label className="family-caption block mb-1">Take-home income</label>
          <div className="flex gap-2">
            <input className="family-input" type="number" min={0} value={income} onChange={(e) => setIncome(Number(e.target.value))} />
            <select className="family-input w-32" value={period} onChange={(e) => setPeriod(e.target.value as "monthly" | "annual")}>
              <option value="monthly">Monthly</option>
              <option value="annual">Annual</option>
            </select>
          </div>
        </div>
        {period === "annual" && (
          <div className="family-caption">Monthly: <span className="text-[#121212] font-medium">${monthly.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></div>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <BucketCard pct={50} label="Needs" amount={splits.needs} color="#0090ff" items={["Rent / mortgage", "Utilities", "Groceries", "Insurance", "Minimum debt payments", "Transport"]} />
        <BucketCard pct={30} label="Wants" amount={splits.wants} color="#ff58ae" items={["Dining out", "Subscriptions", "Shopping", "Entertainment", "Travel", "Hobbies"]} />
        <BucketCard pct={20} label="Savings & debt" amount={splits.savings} color="#00ca48" items={["Emergency fund", "Extra debt payments", "Retirement", "Investments", "Goal savings"]} />
      </div>

      <div className="mt-6 family-card">
        <div className="flex h-4 rounded-full overflow-hidden">
          <div style={{ background: "#0090ff", width: "50%" }} />
          <div style={{ background: "#ff58ae", width: "30%" }} />
          <div style={{ background: "#00ca48", width: "20%" }} />
        </div>
        <div className="flex justify-between mt-2 family-caption">
          <span>50% Needs</span><span>30% Wants</span><span>20% Savings</span>
        </div>
      </div>

      <div className="mt-6 family-card-cream">
        <p className="family-body-sm">
          <strong className="text-[#121212]">Pro tip:</strong> If your needs exceed 50%, don't panic — reduce fixed costs first (negotiate
          bills, refinance, downsize). If your savings are above 20%, you're winning. Route the
          extra into a Vice Tax or debt payoff.
        </p>
      </div>

      <div className="mt-8 family-card" style={{ background: "linear-gradient(135deg, #fff8f5 0%, #fffaee 100%)" }}>
        <p className="family-body-sm">
          Want to track these buckets automatically? Finance Wars categorizes every transaction and tells you when you overspend.
          <Link href="/signup" className="family-link ml-2">Start for free <ArrowRight className="w-3 h-3" /></Link>
        </p>
      </div>
    </ToolLayout>
  );
}

function BucketCard({ pct, label, amount, color, items }: { pct: number; label: string; amount: number; color: string; items: string[] }) {
  return (
    <div className="family-card">
      <div className="flex items-baseline gap-2">
        <span className="w-3 h-3 rounded-full" style={{ background: color }} />
        <span className="family-heading-sm text-[#121212]">{pct}% {label}</span>
      </div>
      <div className="text-[28px] font-semibold tracking-[-0.026em] mt-2 text-[#121212]">${amount.toLocaleString()}</div>
      <div className="family-caption mt-0.5">per month</div>
      <ul className="mt-3 space-y-1 family-body-sm text-[13px]">
        {items.map((i) => <li key={i}>• {i}</li>)}
      </ul>
    </div>
  );
}
