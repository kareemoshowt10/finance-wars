"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, PiggyBank } from "lucide-react";

export default function BudgetBuilderPage() {
  const [income, setIncome] = useState(5000);
  const [period, setPeriod] = useState<"monthly" | "annual">("monthly");

  const monthly = period === "annual" ? income / 12 : income;
  const splits = useMemo(() => {
    const needs = Math.round(monthly * 0.5);
    const wants = Math.round(monthly * 0.3);
    const savings = Math.round(monthly * 0.2);
    return { needs, wants, savings, total: needs + wants + savings };
  }, [monthly]);

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
      <nav className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl bg-white/60 dark:bg-black/60 border-b border-black/5 dark:border-white/5">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between text-[13px]">
          <Link href="/" className="font-semibold tracking-tight">Finance Wars</Link>
          <Link href="/signup" className="px-3 py-1.5 rounded-full bg-black text-white dark:bg-white dark:text-black font-medium">Get started</Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 pt-32 pb-20">
        <Link href="/learn" className="text-xs opacity-50 hover:opacity-100 inline-flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" />All tools
        </Link>
        <h1 className="mt-6 text-4xl font-semibold tracking-[-0.03em] flex items-center gap-3">
          <PiggyBank className="w-8 h-8" /> 50/30/20 Budget Builder
        </h1>
        <p className="mt-2 text-sm text-black/50 dark:text-white/50">Enter your income. Get your budget targets instantly.</p>

        <div className="mt-8 card p-5 space-y-4">
          <div>
            <label className="text-xs text-black/50 dark:text-white/50">Take-home income</label>
            <div className="flex gap-2 mt-1">
              <input className="input flex-1" type="number" min={0} value={income} onChange={(e) => setIncome(Number(e.target.value))} />
              <select className="input w-28" value={period} onChange={(e) => setPeriod(e.target.value as "monthly" | "annual")}>
                <option value="monthly">Monthly</option>
                <option value="annual">Annual</option>
              </select>
            </div>
          </div>
          {period === "annual" && (
            <div className="text-xs text-black/50 dark:text-white/50">Monthly: ${monthly.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
          )}
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <BucketCard
            pct={50}
            label="Needs"
            amount={splits.needs}
            color="bg-blue-500"
            items={["Rent / mortgage", "Utilities", "Groceries", "Insurance", "Minimum debt payments", "Transport"]}
          />
          <BucketCard
            pct={30}
            label="Wants"
            amount={splits.wants}
            color="bg-violet-500"
            items={["Dining out", "Subscriptions", "Shopping", "Entertainment", "Travel", "Hobbies"]}
          />
          <BucketCard
            pct={20}
            label="Savings & debt"
            amount={splits.savings}
            color="bg-emerald-500"
            items={["Emergency fund", "Extra debt payments", "Retirement", "Investments", "Goal savings"]}
          />
        </div>

        <div className="mt-6 card p-5">
          <div className="flex h-4 rounded-full overflow-hidden">
            <div className="bg-blue-500" style={{ width: "50%" }} />
            <div className="bg-violet-500" style={{ width: "30%" }} />
            <div className="bg-emerald-500" style={{ width: "20%" }} />
          </div>
          <div className="flex justify-between mt-2 text-xs text-black/50 dark:text-white/50">
            <span>50% Needs</span><span>30% Wants</span><span>20% Savings</span>
          </div>
        </div>

        <div className="mt-6 card p-5 bg-black/5 dark:bg-white/5 text-sm leading-relaxed">
          <strong>Pro tip:</strong> If your needs exceed 50%, don't panic — reduce fixed costs first (negotiate
          bills, refinance, downsize). If your savings are above 20%, you're winning. Route the
          extra into a Vice Tax or debt payoff.
        </div>

        <div className="mt-8 card p-5 bg-violet-500/5 border-violet-500/20 text-sm leading-relaxed">
          Want to track these buckets automatically? Finance Wars categorizes every transaction and tells you when you overspend.
          <Link href="/signup" className="inline-flex items-center gap-1 ml-1 text-violet-500 font-medium hover:underline">
            Start for free <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </main>
    </div>
  );
}

function BucketCard({ pct, label, amount, color, items }: {
  pct: number; label: string; amount: number; color: string; items: string[];
}) {
  return (
    <div className="card p-5">
      <div className="flex items-baseline gap-2">
        <span className={`w-3 h-3 rounded-full ${color}`} />
        <span className="text-sm font-semibold">{pct}% {label}</span>
      </div>
      <div className="text-3xl font-semibold mt-2">${amount.toLocaleString()}</div>
      <div className="text-xs text-black/40 dark:text-white/40 mt-0.5">per month</div>
      <ul className="mt-3 space-y-1 text-xs text-black/55 dark:text-white/55">
        {items.map((i) => <li key={i}>• {i}</li>)}
      </ul>
    </div>
  );
}
