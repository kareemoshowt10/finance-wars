"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Target } from "lucide-react";
import { cn } from "@/lib/utils";

type Prediction = {
  id: string; month: string; category: string; forecast: number;
  actual: number | null; accuracy: number | null; xpAwarded: number;
  scAwarded: number; settledAt: string | null;
};

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

export default function PredictionsView({
  initial, categories, thisMonth, nextMonth, lastMonth, baseline,
}: {
  initial: Prediction[]; categories: string[]; thisMonth: string;
  nextMonth: string; lastMonth: string; baseline: Record<string, number>;
}) {
  const [items, setItems] = useState<Prediction[]>(initial);
  const [month, setMonth] = useState(nextMonth);
  const [category, setCategory] = useState(categories[0]);
  const [forecast, setForecast] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!forecast) return;
    setBusy(true);
    try {
      const r = await fetch("/api/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, category, forecast: Number(forecast) }),
      });
      if (r.ok) {
        const { prediction } = await r.json();
        setItems((prev) => {
          const without = prev.filter((p) => !(p.month === prediction.month && p.category === prediction.category));
          return [{
            id: prediction.id, month: prediction.month, category: prediction.category,
            forecast: prediction.forecast, actual: null, accuracy: null,
            xpAwarded: 0, scAwarded: 0, settledAt: null,
          }, ...without];
        });
        setForecast("");
      }
    } finally { setBusy(false); }
  }

  const settled = items.filter((p) => p.settledAt);
  const pending = items.filter((p) => !p.settledAt);
  const avgAccuracy = settled.length > 0 ? Math.round(settled.reduce((s, p) => s + (p.accuracy ?? 0), 0) / settled.length) : null;
  const baselineHint = baseline[category] ?? 0;

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-4xl font-semibold tracking-[-0.03em] flex items-center gap-3">
          <Target className="w-8 h-8" /> Predictions
        </h1>
        <p className="mt-2 text-sm text-black/60 dark:text-white/60">Forecast next month's spending. The closer you are, the more XP and Social Currency you earn.</p>
      </header>

      <section className="rounded-3xl border border-black/10 dark:border-white/10 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-fuchsia-500/10 p-8">
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Make a forecast</h2>
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <select value={month} onChange={(e) => setMonth(e.target.value)} className="px-4 py-3 rounded-xl bg-black/5 dark:bg-white/10 text-sm">
                  <option value={thisMonth}>This month ({thisMonth})</option>
                  <option value={nextMonth}>Next month ({nextMonth})</option>
                </select>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="px-4 py-3 rounded-xl bg-black/5 dark:bg-white/10 text-sm">
                  {categories.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <input value={forecast} onChange={(e) => setForecast(e.target.value)} type="number" placeholder={baselineHint > 0 ? `Hint: ${fmt(baselineHint)} last month` : "Amount"} className="flex-1 px-4 py-3 rounded-xl bg-black/5 dark:bg-white/10 text-sm" />
                <button onClick={submit} disabled={busy || !forecast} className="px-5 py-3 rounded-full bg-black text-white dark:bg-white dark:text-black text-sm font-medium disabled:opacity-50">Lock in</button>
              </div>
              <p className="text-xs text-black/50 dark:text-white/50">95%+ accuracy → 200 XP / 50 SC · 85%+ → 100 XP / 25 SC · 70%+ → 50 XP / 10 SC</p>
            </div>
          </div>
          <div className="rounded-2xl bg-white/40 dark:bg-black/30 p-5">
            <div className="text-xs uppercase tracking-wider text-black/50 dark:text-white/50">Your accuracy</div>
            <div className="mt-2 text-5xl font-semibold tabular-nums">{avgAccuracy ?? "—"}{avgAccuracy != null && "%"}</div>
            <div className="mt-1 text-xs text-black/50 dark:text-white/50">over {settled.length} settled forecast{settled.length === 1 ? "" : "s"}</div>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Pending forecasts</h2>
        {pending.length === 0 ? (
          <div className="text-sm text-black/40 dark:text-white/40">None yet. Lock one in above.</div>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {pending.map((p) => (
              <div key={p.id} className="rounded-2xl border border-black/10 dark:border-white/10 p-5">
                <div className="text-xs uppercase tracking-wider text-black/50 dark:text-white/50">{p.month}</div>
                <div className="mt-1 text-lg font-medium">{p.category}</div>
                <div className="mt-2 text-3xl font-semibold tabular-nums">{fmt(p.forecast)}</div>
                <div className="mt-2 text-xs text-amber-600 dark:text-amber-400">Awaiting month close</div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Settled history</h2>
        {settled.length === 0 ? (
          <div className="text-sm text-black/40 dark:text-white/40">No settled forecasts yet. The cron settles last month's on the 1st of each month.</div>
        ) : (
          <ul className="space-y-2">
            {settled.map((p) => (
              <motion.li key={p.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-black/10 dark:border-white/10 p-4 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">{p.category} · {p.month}</div>
                  <div className="text-xs text-black/50 dark:text-white/50">Forecast {fmt(p.forecast)} · Actual {fmt(p.actual ?? 0)}</div>
                </div>
                <div className="text-right">
                  <div className={cn("text-lg font-semibold tabular-nums", (p.accuracy ?? 0) >= 85 ? "text-emerald-500" : (p.accuracy ?? 0) >= 50 ? "text-amber-500" : "text-rose-500")}>{p.accuracy}%</div>
                  <div className="text-[10px] text-black/50 dark:text-white/50">+{p.xpAwarded} XP · +{p.scAwarded} SC</div>
                </div>
              </motion.li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
