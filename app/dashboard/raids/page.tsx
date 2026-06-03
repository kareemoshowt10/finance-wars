"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Swords, Skull, Clock, Flame, Trophy, Plus, Trash2, Users, Zap } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type Raid = {
  id: string;
  goalId: string;
  goalName: string;
  bossName: string;
  bossTitle: string;
  theme: string;
  lore: string;
  status: "ACTIVE" | "DEFEATED" | "EXPIRED";
  targetAmount: number;
  startAmount: number;
  currentAmount: number;
  pct: number;
  hpPct: number;
  deadline: string;
  daysRemaining: number;
  pace: { remaining: number; perDay: number; perWeek: number; days: number };
  stage: { index: number; line: string; atPct: number };
  sharedWithHousehold: boolean;
};

type Goal = { id: string; name: string; targetAmount: number; currentAmount: number; deadline: string };

const THEME_GRADIENT: Record<string, string> = {
  DRAGON: "from-red-500/20 via-orange-500/10 to-amber-500/5",
  TITAN: "from-stone-500/20 via-zinc-500/10 to-slate-500/5",
  KRAKEN: "from-cyan-500/20 via-blue-500/10 to-indigo-500/5",
  WARLORD: "from-rose-500/20 via-red-500/10 to-orange-500/5",
  VAULT: "from-emerald-500/20 via-teal-500/10 to-green-500/5",
};

export default function RaidsPage() {
  const [raids, setRaids] = useState<Raid[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [currency, setCurrency] = useState("USD");
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);

  async function load() {
    setLoading(true);
    const [rd, g, me] = await Promise.all([
      fetch("/api/raids").then((r) => r.json()),
      fetch("/api/goals").then((r) => r.json()),
      fetch("/api/auth/me").then((r) => r.json()),
    ]);
    setRaids(rd?.raids ?? rd?.data?.raids ?? []);
    setGoals(Array.isArray(g) ? g : g?.items ?? []);
    if (me?.currency) setCurrency(me.currency);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function remove(id: string) {
    if (!confirm("Abandon this raid? The goal stays; only the raid framing is removed.")) return;
    await fetch(`/api/raids/${id}`, { method: "DELETE" });
    load();
  }

  const raidedGoalIds = new Set(raids.map((r) => r.goalId));
  const now = Date.now();
  const eligible = goals.filter((g) => {
    if (raidedGoalIds.has(g.id)) return false;
    const days = Math.ceil((new Date(g.deadline).getTime() - now) / 86_400_000);
    return days > 0 && days <= 180 && g.targetAmount >= 500;
  });

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-semibold tracking-[-0.03em] flex items-center gap-3">
            <Swords className="w-8 h-8" /> Goal Raids
          </h1>
          <p className="text-black/50 dark:text-white/50 mt-1 text-sm">
            Big goal, short clock. Name the boss, learn its story, and raid it down before the deadline.
          </p>
        </div>
        {eligible.length > 0 && (
          <button onClick={() => setShowNew((v) => !v)} className="btn-primary">
            <Plus className="w-4 h-4" />Start a raid
          </button>
        )}
      </header>

      {showNew && (
        <NewRaidForm goals={eligible} currency={currency} onCreated={() => { setShowNew(false); load(); }} />
      )}

      {loading ? (
        <div className="text-sm text-black/50 dark:text-white/50">Loading…</div>
      ) : raids.length === 0 ? (
        <div className="card p-8 text-center">
          <Skull className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm text-black/50 dark:text-white/50">
            No active raids. A raid needs a goal with a deadline within 180 days and a target of $500+.
          </p>
          {eligible.length === 0 && (
            <Link href="/dashboard/goals" className="btn-secondary mt-4 inline-flex">Create a goal first</Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {raids.map((raid) => (
            <RaidCard key={raid.id} raid={raid} currency={currency} onRemove={() => remove(raid.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function RaidCard({ raid, currency, onRemove }: { raid: Raid; currency: string; onRemove: () => void }) {
  const grad = THEME_GRADIENT[raid.theme] ?? THEME_GRADIENT.DRAGON;
  const defeated = raid.status === "DEFEATED";
  const expired = raid.status === "EXPIRED";
  const urgent = !defeated && !expired && raid.daysRemaining <= 14;

  return (
    <div className={`card p-0 overflow-hidden ${defeated ? "opacity-80" : ""}`}>
      <div className={`bg-gradient-to-br ${grad} p-5`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-black/50 dark:text-white/50">
              {raid.goalName}{raid.sharedWithHousehold && <span className="ml-2 inline-flex items-center gap-1"><Users className="w-3 h-3" />Shared</span>}
            </div>
            <h3 className="text-2xl font-semibold tracking-tight mt-0.5">
              {raid.bossName} <span className="text-base font-normal text-black/50 dark:text-white/50">{raid.bossTitle}</span>
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {defeated && <span className="text-xs uppercase tracking-wider bg-emerald-500/20 text-emerald-500 px-2 py-1 rounded">Defeated</span>}
            {expired && <span className="text-xs uppercase tracking-wider bg-red-500/20 text-red-500 px-2 py-1 rounded">Expired</span>}
            <button onClick={onRemove} className="btn-ghost text-black/40 dark:text-white/40 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
          </div>
        </div>
        <p className="mt-3 text-sm text-black/65 dark:text-white/65 italic leading-relaxed max-w-2xl">{raid.lore}</p>
      </div>

      <div className="p-5 space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-1.5">
            <span className="text-black/50 dark:text-white/50">Boss HP</span>
            <span className="font-mono">{formatCurrency(Math.max(0, raid.targetAmount - raid.currentAmount), currency)} left</span>
          </div>
          <div className="h-4 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
            <div
              className={`h-full transition-all duration-700 ${defeated ? "bg-emerald-500" : raid.hpPct > 50 ? "bg-red-500" : raid.hpPct > 20 ? "bg-orange-500" : "bg-yellow-500"}`}
              style={{ width: `${raid.hpPct}%` }}
            />
          </div>
          <div className="mt-2 text-sm text-black/70 dark:text-white/70 flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-violet-400 shrink-0" />
            <span className="italic">{raid.stage.line}</span>
          </div>
        </div>

        {!defeated && !expired && (
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className={`card p-3 ${urgent ? "ring-1 ring-red-500/40" : ""}`}>
              <div className="text-xs text-black/50 dark:text-white/50 flex items-center gap-1"><Clock className="w-3 h-3" />Days left</div>
              <div className={`text-xl font-semibold mt-0.5 ${urgent ? "text-red-500" : ""}`}>{raid.daysRemaining}</div>
            </div>
            <div className="card p-3">
              <div className="text-xs text-black/50 dark:text-white/50">Pace / week</div>
              <div className="text-xl font-semibold mt-0.5">{formatCurrency(raid.pace.perWeek, currency)}</div>
            </div>
            <div className="card p-3">
              <div className="text-xs text-black/50 dark:text-white/50 flex items-center gap-1"><Flame className="w-3 h-3" />Progress</div>
              <div className="text-xl font-semibold mt-0.5">{raid.pct}%</div>
            </div>
          </div>
        )}

        {defeated && (
          <div className="flex items-center gap-2 text-emerald-500 text-sm font-medium">
            <Trophy className="w-4 h-4" />Raid complete — {raid.bossName} is no more. The goal is yours.
          </div>
        )}
      </div>
    </div>
  );
}

function NewRaidForm({ goals, currency, onCreated }: { goals: Goal[]; currency: string; onCreated: () => void }) {
  const [goalId, setGoalId] = useState(goals[0]?.id ?? "");
  const [theme, setTheme] = useState("");
  const [share, setShare] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const THEMES = [
    { v: "", label: "Auto-pick" },
    { v: "DRAGON", label: "🐉 Dragon" },
    { v: "TITAN", label: "🗿 Titan" },
    { v: "KRAKEN", label: "🐙 Kraken" },
    { v: "WARLORD", label: "⚔️ Warlord" },
    { v: "VAULT", label: "🔐 Vault" },
  ];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!goalId) { setErr("Pick a goal."); return; }
    setBusy(true);
    const res = await fetch("/api/raids", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goalId, theme: theme || undefined, shareWithHousehold: share }),
    });
    setBusy(false);
    if (!res.ok) { const j = await res.json().catch(() => ({})); setErr(j.error || "Failed"); return; }
    onCreated();
  }

  return (
    <form onSubmit={submit} className="card p-5 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs text-black/50 dark:text-white/50">Goal to raid</span>
          <select className="input mt-1" value={goalId} onChange={(e) => setGoalId(e.target.value)}>
            {goals.map((g) => (
              <option key={g.id} value={g.id}>{g.name} — {formatCurrency(g.targetAmount, currency)}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs text-black/50 dark:text-white/50">Boss theme</span>
          <select className="input mt-1" value={theme} onChange={(e) => setTheme(e.target.value)}>
            {THEMES.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}
          </select>
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={share} onChange={(e) => setShare(e.target.checked)} className="accent-violet-500" />
        Share this raid with my household (raid together)
      </label>
      {err && <div className="text-sm text-red-500">{err}</div>}
      <div className="flex justify-end">
        <button type="submit" disabled={busy} className="btn-primary">{busy ? "Summoning…" : "Summon the boss"}</button>
      </div>
    </form>
  );
}
