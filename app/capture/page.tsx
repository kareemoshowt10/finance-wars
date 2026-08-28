"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Flame, LayoutDashboard, TrendingUp } from "lucide-react";
import QuickCapture from "@/app/dashboard/_components/QuickCapture";
import { formatCurrency } from "@/lib/utils";

// The standalone capture surface: one screen, phone-first, installable via
// the existing PWA manifest. This page has one job — make logging so fast
// it survives as a habit. Everything else lives in the dashboard.

type Tx = { id: string; amount: number; type: string; category: string; description: string; date: string };

export default function CapturePage() {
  const [today, setToday] = useState<Tx[]>([]);
  const [streak, setStreak] = useState<number | null>(null);
  const [rate, setRate] = useState<number | null>(null);
  const [currency, setCurrency] = useState("USD");

  const load = useCallback(async () => {
    const from = new Date(); from.setHours(0, 0, 0, 0);
    const [txj, cj, me] = await Promise.all([
      fetch(`/api/transactions?from=${from.toISOString()}&pageSize=25`).then((r) => r.json()).catch(() => null),
      fetch("/api/compound").then((r) => r.json()).catch(() => null),
      fetch("/api/auth/me").then((r) => r.json()).catch(() => null),
    ]);
    const items = txj?.data?.items ?? txj?.items ?? (Array.isArray(txj) ? txj : []);
    setToday(items);
    const cons = (cj?.data ?? cj)?.consistency;
    if (cons) { setStreak(cons.streak); setRate(cons.rate); }
    if (me?.currency) setCurrency(me.currency);
  }, []);

  useEffect(() => { load(); }, [load]);

  const net = today.reduce((s, t) => s + (t.type === "income" ? t.amount : -t.amount), 0);

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
      <div className="max-w-md mx-auto px-4 pt-6 pb-24">
        {/* Header: streak is the reward for showing up. */}
        <header className="flex items-center justify-between">
          <div className="text-sm font-semibold tracking-tight">Debt Sucker</div>
          <div className="flex items-center gap-3">
            {streak != null && streak > 0 && (
              <span className="text-xs inline-flex items-center gap-1 text-orange-500 font-medium">
                <Flame className="w-3.5 h-3.5" />{streak}d
              </span>
            )}
            <Link href="/dashboard" className="text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white" aria-label="Open dashboard">
              <LayoutDashboard className="w-4 h-4" />
            </Link>
          </div>
        </header>

        <div className="mt-6">
          <QuickCapture onSaved={load} />
        </div>

        {/* Today */}
        <section className="mt-8">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xs uppercase tracking-wider text-black/40 dark:text-white/40">Today</h2>
            <span className={`text-sm font-semibold ${net >= 0 ? "text-emerald-500" : "text-red-500"}`}>
              {net >= 0 ? "+" : ""}{formatCurrency(net, currency)}
            </span>
          </div>
          {today.length === 0 ? (
            <p className="mt-3 text-sm text-black/40 dark:text-white/40">
              Nothing yet. First log of the day keeps the streak alive.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {today.map((t) => (
                <li key={t.id} className="flex items-center justify-between text-sm py-2 border-b border-black/5 dark:border-white/5">
                  <div className="min-w-0">
                    <div className="truncate">{t.description}</div>
                    <div className="text-xs text-black/40 dark:text-white/40">{t.category}</div>
                  </div>
                  <span className={`shrink-0 font-medium ${t.type === "income" ? "text-emerald-500" : ""}`}>
                    {t.type === "income" ? "+" : "−"}{formatCurrency(t.amount, currency)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {rate != null && (
          <Link href="/dashboard/compound" className="mt-8 card p-4 flex items-center justify-between hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition">
            <div>
              <div className="text-xs text-black/40 dark:text-white/40">Consistency, last 30 days</div>
              <div className="text-lg font-semibold">{Math.round(rate * 100)}% of days logged</div>
            </div>
            <TrendingUp className="w-5 h-5 text-violet-500" />
          </Link>
        )}
      </div>
    </div>
  );
}
