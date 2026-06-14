"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { TrendingUp, TrendingDown, ArrowRight, Flame, Eye, RefreshCw } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type Creep = {
  category: string;
  recentSpend: number;
  priorSpend: number;
  delta: number;
  pctChange: number;
  txCount: number;
  hint: "vice-tax" | "review" | "investigate";
};
type SubCreep = {
  recurringId: string;
  description: string;
  category: string;
  currentAmount: number;
  priorAvgAmount: number;
  delta: number;
  pctChange: number;
};
type Report = {
  windowDays: number;
  recentTotal: number;
  priorTotal: number;
  netDelta: number;
  netPct: number;
  categories: Creep[];
  improvements: Creep[];
  subscriptions: SubCreep[];
};

export default function InflationPage() {
  const [report, setReport] = useState<Report | null>(null);
  const [currency, setCurrency] = useState("USD");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [rep, me] = await Promise.all([
      fetch("/api/inflation").then((r) => r.json()),
      fetch("/api/auth/me").then((r) => r.json()),
    ]);
    setReport(rep?.data ?? rep);
    if (me?.currency) setCurrency(me.currency);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const pct = (n: number) => `${n > 0 ? "+" : ""}${Math.round(n * 100)}%`;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-semibold tracking-[-0.03em] flex items-center gap-3">
            <Eye className="w-8 h-8" /> Lifestyle Creep
          </h1>
          <p className="text-black/50 dark:text-white/50 mt-1 text-sm">
            Your last 90 days vs the 90 before. Where spending quietly drifted up.
          </p>
        </div>
        <button onClick={load} className="btn-secondary text-sm" disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </header>

      {loading ? (
        <div className="text-sm text-black/50 dark:text-white/50">Scanning your spending…</div>
      ) : !report ? (
        <div className="card p-8 text-center text-sm text-black/50 dark:text-white/50">No data yet.</div>
      ) : (
        <>
          {/* Headline net change */}
          <div className="card p-6">
            <div className="text-xs uppercase tracking-wider text-black/50 dark:text-white/50">Overall spending, this 90 days vs last</div>
            <div className="mt-2 flex items-baseline gap-3 flex-wrap">
              <span className={`text-4xl font-semibold tracking-tight ${report.netDelta > 0 ? "text-red-500" : "text-emerald-500"}`}>
                {report.netDelta > 0 ? "+" : ""}{formatCurrency(report.netDelta, currency)}
              </span>
              <span className="text-sm text-black/50 dark:text-white/50">
                {pct(report.netPct)} · {formatCurrency(report.recentTotal, currency)} vs {formatCurrency(report.priorTotal, currency)}
              </span>
            </div>
            <p className="mt-2 text-sm text-black/55 dark:text-white/55">
              {report.netDelta > 0
                ? "You're spending more than last quarter. The categories below show where."
                : "You're spending less than last quarter. Keep the pressure on."}
            </p>
          </div>

          {/* Inflated categories */}
          {report.categories.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold flex items-center gap-2 text-red-500 mb-3">
                <TrendingUp className="w-4 h-4" /> Creeping up
              </h2>
              <div className="space-y-3">
                {report.categories.map((c) => (
                  <div key={c.category} className="card p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-medium">{c.category}</div>
                        <div className="text-xs text-black/50 dark:text-white/50 mt-0.5">
                          {formatCurrency(c.recentSpend, currency)} now · {formatCurrency(c.priorSpend, currency)} before · {c.txCount} transactions
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-red-500 font-semibold">+{formatCurrency(c.delta, currency)}</div>
                        <div className="text-xs text-black/50 dark:text-white/50">{pct(c.pctChange)}</div>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      {c.hint === "vice-tax" ? (
                        <Link href="/dashboard/vice-tax" className="text-xs inline-flex items-center gap-1 text-orange-500 hover:underline">
                          <Flame className="w-3 h-3" /> Tax this category into savings <ArrowRight className="w-3 h-3" />
                        </Link>
                      ) : (
                        <Link href={`/dashboard/transactions?category=${encodeURIComponent(c.category)}`} className="text-xs inline-flex items-center gap-1 text-black/60 dark:text-white/60 hover:underline">
                          Investigate transactions <ArrowRight className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Subscription creep */}
          {report.subscriptions.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-black/60 dark:text-white/60 mb-3">Recurring bills that grew</h2>
              <div className="space-y-3">
                {report.subscriptions.map((s) => (
                  <div key={s.recurringId} className="card p-5 flex items-start justify-between gap-4">
                    <div>
                      <div className="font-medium">{s.description}</div>
                      <div className="text-xs text-black/50 dark:text-white/50 mt-0.5">
                        {formatCurrency(s.currentAmount, currency)} now · was {formatCurrency(s.priorAvgAmount, currency)}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-red-500 font-semibold">+{formatCurrency(s.delta, currency)}</div>
                      <div className="text-xs text-black/50 dark:text-white/50">{pct(s.pctChange)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Wins */}
          {report.improvements.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold flex items-center gap-2 text-emerald-500 mb-3">
                <TrendingDown className="w-4 h-4" /> You cut back here
              </h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {report.improvements.map((c) => (
                  <div key={c.category} className="card p-4 flex items-center justify-between">
                    <span className="text-sm">{c.category}</span>
                    <span className="text-emerald-500 text-sm font-medium">{formatCurrency(c.delta, currency)} ({pct(c.pctChange)})</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {report.categories.length === 0 && report.subscriptions.length === 0 && (
            <div className="card p-8 text-center text-sm text-black/50 dark:text-white/50">
              No lifestyle creep detected. Your spending is holding steady — well done.
            </div>
          )}
        </>
      )}
    </div>
  );
}
