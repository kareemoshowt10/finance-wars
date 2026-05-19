"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Legend } from "recharts";
import { LineChart as LCIcon, Wind } from "lucide-react";
import { formatCurrency, formatCurrencyFull } from "@/lib/utils";

type Result = {
  baseline: { m: number; date: string; value: number }[];
  scenario: { m: number; date: string; value: number }[];
  endBaseline: number;
  endScenario: number;
  monthsTo10kFaster: number | null;
  monthlyGrowth: number;
  current: number;
};

export default function ScenariosPage() {
  const [save, setSave] = useState(500);
  const [cut, setCut] = useState(100);
  const [windfall, setWindfall] = useState(0);
  const [data, setData] = useState<Result | null>(null);
  const [currency, setCurrency] = useState("USD");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((d) => d?.currency && setCurrency(d.currency)).catch(() => {});
  }, []);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      fetch(`/api/insights/scenario?save=${save}&cut=${cut}&windfall=${windfall}`)
        .then((r) => r.json()).then(setData).catch(() => {});
    }, 200);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [save, cut, windfall]);

  const merged = useMemo(() => {
    if (!data) return [];
    return data.baseline.map((b, i) => ({
      m: b.m,
      date: b.date,
      baseline: b.value,
      scenario: data.scenario[i]?.value,
    }));
  }, [data]);

  const delta = data ? data.endScenario - data.endBaseline : 0;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-4xl md:text-5xl font-semibold tracking-[-0.03em] flex items-center gap-3">
          <LCIcon className="w-8 h-8" />Scenarios
        </h1>
        <p className="text-black/50 dark:text-white/50 mt-1 text-sm">What if you saved more, cut subscriptions, or got a windfall?</p>
      </header>

      <div className="grid lg:grid-cols-3 gap-4">
        <Slider label="Extra monthly savings" suffix="/mo" min={0} max={10000} step={50} value={save} onChange={setSave} currency={currency} />
        <Slider label="Monthly recurring cuts" suffix="/mo" min={0} max={2000} step={10} value={cut} onChange={setCut} currency={currency} />
        <Slider label="One-time windfall" suffix="" min={0} max={50000} step={250} value={windfall} onChange={setWindfall} currency={currency} />
      </div>

      <motion.div layout className="card p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-black/40 dark:text-white/40">Projected 24-month outcome</div>
            <div className="mt-1 flex items-baseline gap-3">
              <div className="text-3xl font-semibold">{data ? formatCurrency(data.endScenario, currency) : "—"}</div>
              <div className={`text-sm ${delta >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                {delta >= 0 ? "+" : ""}{data ? formatCurrency(delta, currency) : "—"} vs baseline
              </div>
            </div>
          </div>
          {data?.monthsTo10kFaster !== null && data?.monthsTo10kFaster !== undefined && data.monthsTo10kFaster > 0 && (
            <div className="text-xs flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-500">
              <Wind className="w-3 h-3" /> Reach +$10k {data.monthsTo10kFaster} months sooner
            </div>
          )}
        </div>
        <div className="h-72 mt-5">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={merged}>
              <CartesianGrid stroke="rgba(127,127,127,0.12)" vertical={false} />
              <XAxis dataKey="m" stroke="rgba(127,127,127,0.6)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}mo`} />
              <YAxis stroke="rgba(127,127,127,0.6)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}k`} width={40} />
              <Tooltip contentStyle={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12, color: "#fff" }} formatter={(v: number) => formatCurrencyFull(v, currency)} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="baseline" stroke="#94a3b8" strokeWidth={2} dot={false} name="Baseline" />
              <Line type="monotone" dataKey="scenario" stroke="#a78bfa" strokeWidth={2} strokeDasharray="6 4" dot={false} name="Scenario" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </div>
  );
}

function Slider({ label, suffix, min, max, step, value, onChange, currency }: {
  label: string; suffix: string; min: number; max: number; step: number;
  value: number; onChange: (n: number) => void; currency: string;
}) {
  return (
    <div className="card p-5">
      <div className="text-xs text-black/50 dark:text-white/50">{label}</div>
      <div className="mt-2 text-2xl font-semibold tabular-nums">{formatCurrency(value, currency)}<span className="text-xs opacity-50">{suffix}</span></div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full mt-3 accent-indigo-500" />
      <div className="flex justify-between text-[10px] opacity-50 mt-1"><span>{formatCurrency(min, currency)}</span><span>{formatCurrency(max, currency)}</span></div>
    </div>
  );
}
