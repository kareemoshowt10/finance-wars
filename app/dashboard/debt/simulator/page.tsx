"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { ArrowLeft, Swords, Sparkles, Calendar, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type Month = {
  month: number;
  date: string;
  totalBalance: number;
  totalInterestPaid: number;
  perBoss: { accountId: string; balance: number; paid: number; interest: number }[];
};

type SimResult = {
  months: Month[];
  payoffMonths: number | null;
  totalInterest: number;
  totalPaid: number;
  defeatOrder: { accountId: string; name: string; month: number }[];
};

type Response = {
  withExtra: SimResult;
  baseline: SimResult;
  savings: { interest: number; months: number | null };
};

const STRATEGIES = [
  { value: "avalanche", label: "Avalanche", desc: "Hit highest APR first" },
  { value: "snowball", label: "Snowball", desc: "Crush smallest balance first" },
  { value: "even", label: "Even Split", desc: "Spread extra across all bosses" },
] as const;

export default function SimulatorPage() {
  const [extra, setExtra] = useState(200);
  const [strategy, setStrategy] = useState<"avalanche" | "snowball" | "even">("avalanche");
  const [data, setData] = useState<Response | null>(null);
  const [currency, setCurrency] = useState("USD");
  const [loading, setLoading] = useState(false);
  const [bossCount, setBossCount] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const [me, bosses] = await Promise.all([
        fetch("/api/auth/me").then((r) => r.json()),
        fetch("/api/debt-bosses").then((r) => r.json()),
      ]);
      if (me?.currency) setCurrency(me.currency);
      const alive = (bosses?.bosses ?? []).filter((b: { defeated: boolean }) => !b.defeated).length;
      setBossCount(alive);
    })();
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const id = setTimeout(async () => {
      const res = await fetch("/api/debt-bosses/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extraMonthly: extra, strategy }),
      });
      const json = await res.json();
      if (!cancelled) {
        setData(json);
        setLoading(false);
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(id); };
  }, [extra, strategy]);

  const chartData = useMemo(() => {
    if (!data) return [];
    const len = Math.max(data.withExtra.months.length, data.baseline.months.length);
    const out: { month: number; withExtra: number; baseline: number }[] = [];
    for (let i = 0; i < len; i++) {
      out.push({
        month: i + 1,
        withExtra: data.withExtra.months[i]?.totalBalance ?? 0,
        baseline: data.baseline.months[i]?.totalBalance ?? 0,
      });
    }
    return out;
  }, [data]);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <Link href="/dashboard/debt" className="text-xs text-black/50 dark:text-white/50 hover:underline inline-flex items-center gap-1">
            <ArrowLeft className="w-3 h-3" />Back to bosses
          </Link>
          <h1 className="mt-2 text-4xl font-semibold tracking-[-0.03em] flex items-center gap-3">
            <Sparkles className="w-8 h-8" />Payoff Simulator
          </h1>
          <p className="text-black/50 dark:text-white/50 mt-1 text-sm">
            See what an extra payment unlocks. Strategy decides where the extra dollar goes.
          </p>
        </div>
      </header>

      {bossCount === 0 ? (
        <div className="card p-8 text-center text-sm text-black/50 dark:text-white/50">
          No active debt bosses to simulate. Add a credit card or loan account first.
        </div>
      ) : (
        <>
          <div className="card p-5 space-y-4">
            <div>
              <label className="text-xs text-black/50 dark:text-white/50 flex items-center justify-between">
                <span className="flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5" />Extra monthly payment</span>
                <span className="font-mono text-base text-black dark:text-white">{formatCurrency(extra, currency)}</span>
              </label>
              <input
                type="range"
                min={0}
                max={2000}
                step={25}
                value={extra}
                onChange={(e) => setExtra(Number(e.target.value))}
                className="w-full mt-2 accent-violet-500"
              />
              <div className="flex justify-between text-[10px] text-black/40 dark:text-white/40 mt-1">
                <span>$0</span><span>$500</span><span>$1k</span><span>$1.5k</span><span>$2k</span>
              </div>
            </div>

            <div>
              <div className="text-xs text-black/50 dark:text-white/50 mb-2">Strategy</div>
              <div className="grid grid-cols-3 gap-2">
                {STRATEGIES.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setStrategy(s.value)}
                    className={`p-3 rounded-lg border text-left transition ${
                      strategy === s.value
                        ? "border-violet-500 bg-violet-500/10"
                        : "border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20"
                    }`}
                  >
                    <div className="font-semibold text-sm">{s.label}</div>
                    <div className="text-xs text-black/50 dark:text-white/50 mt-0.5">{s.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {data && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Stat
                  label="Debt-free in"
                  value={data.withExtra.payoffMonths != null ? `${data.withExtra.payoffMonths} mo` : "—"}
                  hint={data.savings.months != null && data.savings.months > 0 ? `${data.savings.months} mo sooner` : undefined}
                  icon={<Calendar className="w-4 h-4" />}
                />
                <Stat
                  label="Total interest"
                  value={formatCurrency(data.withExtra.totalInterest, currency)}
                  hint={data.savings.interest > 0 ? `Saves ${formatCurrency(data.savings.interest, currency)}` : undefined}
                />
                <Stat
                  label="Total paid"
                  value={formatCurrency(data.withExtra.totalPaid, currency)}
                />
              </div>

              <div className="card p-5">
                <div className="text-sm font-semibold mb-3">Balance over time</div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                      <CartesianGrid stroke="rgba(127,127,127,0.15)" strokeDasharray="3 3" />
                      <XAxis dataKey="month" tickFormatter={(m) => `m${m}`} tick={{ fontSize: 11 }} />
                      <YAxis tickFormatter={(v) => `$${Math.round(v / 1000)}k`} tick={{ fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{ background: "rgba(20,20,20,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
                        labelFormatter={(m) => `Month ${m}`}
                        formatter={(v: number) => formatCurrency(v, currency)}
                      />
                      <Line type="monotone" dataKey="baseline" stroke="#f87171" strokeWidth={1.5} dot={false} strokeDasharray="4 4" name="Without extra" />
                      <Line type="monotone" dataKey="withExtra" stroke="#a78bfa" strokeWidth={2} dot={false} name="With extra" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex gap-4 mt-2 text-xs">
                  <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-violet-400" />With extra</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-red-400" />Without extra</span>
                </div>
              </div>

              {data.withExtra.defeatOrder.length > 0 && (
                <div className="card p-5">
                  <div className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Swords className="w-4 h-4" />KO order
                  </div>
                  <div className="space-y-2">
                    {data.withExtra.defeatOrder.map((d, i) => (
                      <div key={d.accountId} className="flex items-center justify-between text-sm py-2 border-b border-black/5 dark:border-white/5 last:border-0">
                        <span className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-mono flex items-center justify-center">{i + 1}</span>
                          {d.name}
                        </span>
                        <span className="text-xs text-black/50 dark:text-white/50">Month {d.month}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {loading && !data && <div className="text-sm text-black/50 dark:text-white/50">Calculating…</div>}
        </>
      )}
    </div>
  );
}

function Stat({ label, value, hint, icon }: { label: string; value: string; hint?: string; icon?: React.ReactNode }) {
  return (
    <div className="card p-4">
      <div className="text-xs text-black/50 dark:text-white/50 flex items-center gap-1.5">{icon}{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
      {hint && <div className="text-xs text-emerald-500 mt-0.5">{hint}</div>}
    </div>
  );
}
