"use client";
import { useEffect, useState } from "react";
import { Swords, Skull, Flame, Trophy } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type Boss = {
  accountId: string;
  name: string;
  type: string;
  hp: number;
  maxHp: number;
  hpPct: number;
  dps30: number;
  attacks30: number;
  lastAttackAt: string | null;
  etaMonths: number | null;
  defeated: boolean;
};

type Summary = {
  count: number;
  defeated: number;
  totalHp: number;
  totalDps30: number;
  etaMonths: number | null;
};

export default function DebtBossPage() {
  const [bosses, setBosses] = useState<Boss[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [currency, setCurrency] = useState("USD");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [r, me] = await Promise.all([
        fetch("/api/debt-bosses").then((r) => r.json()),
        fetch("/api/auth/me").then((r) => r.json()),
      ]);
      setBosses(r?.bosses ?? []);
      setSummary(r?.summary ?? null);
      if (me?.currency) setCurrency(me.currency);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-semibold tracking-[-0.03em] flex items-center gap-3">
            <Swords className="w-8 h-8" /> Debt Bosses
          </h1>
          <p className="text-black/50 dark:text-white/50 mt-1 text-sm">
            Every payment is an attack. Defeat them all.
          </p>
        </div>
      </header>

      {summary && summary.count > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Bosses" value={`${summary.count - summary.defeated}/${summary.count}`} icon={<Skull className="w-4 h-4" />} />
          <Stat label="Total HP" value={formatCurrency(summary.totalHp, currency)} />
          <Stat label="DPS (30d)" value={formatCurrency(summary.totalDps30, currency)} icon={<Flame className="w-4 h-4" />} />
          <Stat label="ETA" value={summary.etaMonths != null ? `${summary.etaMonths} mo` : "—"} />
        </div>
      )}

      {loading ? (
        <div className="text-sm text-black/50 dark:text-white/50">Loading…</div>
      ) : bosses.length === 0 ? (
        <div className="card p-8 text-center">
          <Trophy className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm text-black/50 dark:text-white/50">
            No debt accounts found. Add a credit card or loan account to spawn a boss.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {bosses.map((b) => (
            <BossCard key={b.accountId} boss={b} currency={currency} />
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="card p-4">
      <div className="text-xs text-black/50 dark:text-white/50 flex items-center gap-1.5">{icon}{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
  );
}

function BossCard({ boss, currency }: { boss: Boss; currency: string }) {
  const pct = Math.round(boss.hpPct * 100);
  const barColor = boss.defeated
    ? "bg-emerald-500"
    : pct > 66
      ? "bg-red-500"
      : pct > 33
        ? "bg-orange-500"
        : "bg-yellow-500";

  return (
    <div className={`card p-5 ${boss.defeated ? "opacity-70" : ""}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">{boss.name}</h3>
            {boss.defeated && (
              <span className="text-xs uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded">
                Defeated
              </span>
            )}
          </div>
          <div className="text-xs text-black/50 dark:text-white/50 mt-0.5 capitalize">{boss.type}</div>
        </div>
        <div className="text-right">
          <div className="text-sm font-mono">
            {formatCurrency(boss.hp, currency)} / {formatCurrency(boss.maxHp, currency)}
          </div>
          <div className="text-xs text-black/50 dark:text-white/50">{pct}% HP</div>
        </div>
      </div>

      <div className="mt-3 h-3 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
        <div className={`h-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
        <div>
          <div className="text-black/50 dark:text-white/50">Damage (30d)</div>
          <div className="font-semibold mt-0.5">{formatCurrency(boss.dps30, currency)}</div>
        </div>
        <div>
          <div className="text-black/50 dark:text-white/50">Hits (30d)</div>
          <div className="font-semibold mt-0.5">{boss.attacks30}</div>
        </div>
        <div>
          <div className="text-black/50 dark:text-white/50">ETA</div>
          <div className="font-semibold mt-0.5">
            {boss.etaMonths != null ? `${boss.etaMonths} mo` : "—"}
          </div>
        </div>
      </div>
    </div>
  );
}
