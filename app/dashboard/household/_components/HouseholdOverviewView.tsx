"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Home, CheckCheck, Landmark, HeartHandshake, ArrowRight, AlertTriangle, Crown, Flame } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type Member = { userId: string; name: string };
type Pulse = {
  members: Member[];
  chores: { total: number; dueToday: number; dueTodayList: { id: string; name: string; emoji: string }[] };
  leaderboard: { userId: string; name: string; completions: number; crowns: number; xp: number; rank: number }[];
  bank: { totalOutstanding: number; activeLoans: number; position: Record<string, number> };
  goals: {
    active: number;
    topElective: { id: string; name: string; emoji: string; pct: number; votes: number; targetAmount: number; currentAmount: number } | null;
    neglectedEssentials: { id: string; name: string; emoji: string; pct: number }[];
  };
};

export default function HouseholdOverviewView({ hid, householdName, meId, currency }: { hid: string; householdName: string; meId: string; currency: string }) {
  const [data, setData] = useState<Pulse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/households/${hid}/pulse`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [hid]);

  if (loading) return <div className="text-black/40 dark:text-white/40 text-sm">Loading…</div>;
  if (!data) return null;

  const nameOf = (userId: string) => data.members.find((m) => m.userId === userId)?.name || "Member";

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-4xl font-semibold tracking-[-0.03em] flex items-center gap-3">
          <Home className="w-8 h-8" /> Household HQ
        </h1>
        <p className="mt-2 text-sm text-black/60 dark:text-white/60">
          {householdName} — chores, the bank, and shared goals, all in one scoreboard.
        </p>
      </header>

      {data.goals.neglectedEssentials.length > 0 && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="text-sm font-medium text-amber-600 dark:text-amber-400">
              {data.goals.neglectedEssentials.length === 1 ? "An essential goal has stalled" : `${data.goals.neglectedEssentials.length} essential goals have stalled`}
            </div>
            <div className="mt-1 text-sm text-black/70 dark:text-white/70">
              {data.goals.neglectedEssentials.map((g) => `${g.emoji} ${g.name} (${Math.round(g.pct)}% funded)`).join(" · ")}
              {" "}— nobody's put money in for a while. The bathroom won't remodel itself.
            </div>
            <Link href="/dashboard/household/goals" className="mt-2 inline-flex items-center gap-1 text-sm text-amber-600 dark:text-amber-400 hover:underline">
              Fund it now <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        <Link href="/dashboard/household/chores" className="card p-5 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition">
          <div className="flex items-center gap-2 text-black/50 dark:text-white/50 text-xs uppercase tracking-wider">
            <CheckCheck className="w-4 h-4" /> Chores
          </div>
          <div className="mt-3 text-3xl font-semibold tracking-tight">
            {data.chores.dueToday}<span className="text-base font-normal text-black/40 dark:text-white/40"> due today</span>
          </div>
          <div className="mt-1 text-xs text-black/50 dark:text-white/50">{data.chores.total} tracked chores</div>
        </Link>

        <Link href="/dashboard/household/bank" className="card p-5 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition">
          <div className="flex items-center gap-2 text-black/50 dark:text-white/50 text-xs uppercase tracking-wider">
            <Landmark className="w-4 h-4" /> The Bank
          </div>
          <div className="mt-3 text-3xl font-semibold tracking-tight">{formatCurrency(data.bank.totalOutstanding, currency)}</div>
          <div className="mt-1 text-xs text-black/50 dark:text-white/50">outstanding across {data.bank.activeLoans} loan{data.bank.activeLoans === 1 ? "" : "s"}</div>
        </Link>

        <Link href="/dashboard/household/goals" className="card p-5 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition">
          <div className="flex items-center gap-2 text-black/50 dark:text-white/50 text-xs uppercase tracking-wider">
            <HeartHandshake className="w-4 h-4" /> Household Goals
          </div>
          <div className="mt-3 text-3xl font-semibold tracking-tight">{data.goals.active}</div>
          <div className="mt-1 text-xs text-black/50 dark:text-white/50">active shared goal{data.goals.active === 1 ? "" : "s"}</div>
        </Link>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <section className="card p-6">
          <h2 className="text-sm font-medium flex items-center gap-2"><Flame className="w-4 h-4 text-orange-500" /> This week's leaderboard</h2>
          {data.leaderboard.length === 0 ? (
            <p className="mt-4 text-sm text-black/50 dark:text-white/50">No chores logged yet this week. First one on the board wins bragging rights.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {data.leaderboard.map((entry) => (
                <li key={entry.userId} className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${entry.rank === 1 ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white" : "bg-black/10 dark:bg-white/10"}`}>
                    {entry.rank}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{entry.userId === meId ? "You" : entry.name}</div>
                    <div className="text-xs text-black/50 dark:text-white/50">{entry.completions} chore{entry.completions === 1 ? "" : "s"}</div>
                  </div>
                  <div className="flex items-center gap-1 text-sm font-medium text-amber-500">
                    <Crown className="w-3.5 h-3.5" /> {entry.crowns}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-6">
          <h2 className="text-sm font-medium flex items-center gap-2"><Landmark className="w-4 h-4" /> Who owes the bank</h2>
          {Object.keys(data.bank.position).length === 0 ? (
            <p className="mt-4 text-sm text-black/50 dark:text-white/50">No active family loans. The bank is quiet — for now.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {Object.entries(data.bank.position)
                .sort((a, b) => a[1] - b[1])
                .map(([userId, net]) => (
                  <li key={userId} className="flex items-center justify-between text-sm">
                    <span className={userId === meId ? "font-medium" : ""}>{userId === meId ? "You" : nameOf(userId)}</span>
                    <span className={net < 0 ? "text-rose-500" : net > 0 ? "text-emerald-500" : "text-black/40 dark:text-white/40"}>
                      {net === 0 ? "—" : net > 0 ? `owed ${formatCurrency(net, currency)}` : `owes ${formatCurrency(-net, currency)}`}
                    </span>
                  </li>
                ))}
            </ul>
          )}

          {data.goals.topElective && (
            <div className="mt-6 pt-5 border-t border-black/5 dark:border-white/10">
              <div className="text-xs uppercase tracking-wider text-black/40 dark:text-white/40">Household is voting for</div>
              <div className="mt-2 flex items-center justify-between">
                <div className="text-sm font-medium">{data.goals.topElective.emoji} {data.goals.topElective.name}</div>
                <div className="text-xs text-black/50 dark:text-white/50">{data.goals.topElective.votes} vote{data.goals.topElective.votes === 1 ? "" : "s"}</div>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500" style={{ width: `${data.goals.topElective.pct}%` }} />
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
