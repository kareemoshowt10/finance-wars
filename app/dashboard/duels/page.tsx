import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import { Plus, Swords, Trophy, Hourglass } from "lucide-react";
import DuelInviteActions from "./_components/DuelInviteActions";

export const dynamic = "force-dynamic";

async function fetchData(userId: string, email: string) {
  const players = await prisma.duelPlayer.findMany({
    where: { OR: [{ userId }, { inviteEmail: email }] },
    include: {
      duel: {
        include: {
          players: { include: { user: { select: { id: true, name: true, email: true } } } },
          sprints: { orderBy: { weekNumber: "asc" } },
        },
      },
    },
  });
  const seen = new Set<string>();
  const duels = players.map((p) => p.duel).filter((d) => (seen.has(d.id) ? false : (seen.add(d.id), true)));
  return {
    active: duels.filter((d) => d.status === "ACTIVE"),
    pendingInvites: duels.filter((d) => {
      if (d.status !== "PENDING") return false;
      const me = d.players.find((p) => p.userId === userId);
      if (me) return !me.accepted;
      return d.players.some((p) => p.inviteEmail === email);
    }),
    completed: duels.filter((d) => d.status === "COMPLETED" || d.status === "ABANDONED"),
  };
}

export default async function DuelsPage() {
  const user = await requireUser();
  if (!user) redirect("/login");
  const { active, pendingInvites, completed } = await fetchData(user.id, user.email);
  const hero = active[0];

  return (
    <div className="space-y-10">
      <header className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-semibold tracking-[-0.03em] flex items-center gap-3">
            <Swords className="w-8 h-8" />
            Duels
          </h1>
          <p className="text-black/50 dark:text-white/50 mt-1 text-sm">Head-to-head savings sprints. Win the trip, lose the dishes.</p>
        </div>
        <Link href="/dashboard/duels/new" className="btn-primary"><Plus className="w-4 h-4" />New duel</Link>
      </header>

      {hero && <HeroCard duel={hero} currentUserId={user.id} />}

      <section className="space-y-3">
        <h2 className="text-sm uppercase tracking-[0.2em] text-black/40 dark:text-white/40">Active</h2>
        {active.length === 0 ? (
          <div className="card p-8 text-center text-black/50 dark:text-white/50 text-sm">No active duels. Throw down the gauntlet.</div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {active.map((d) => (
              <Link key={d.id} href={`/dashboard/duels/${d.id}`} className="card p-5 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium">{d.title}</div>
                    <div className="text-xs text-black/50 dark:text-white/50 mt-1">{formatCurrency(d.targetAmount)} target · {d.sprintLengthDays}-day sprints</div>
                  </div>
                  <div className="text-xs text-black/40 dark:text-white/40">{d.sprints.length} sprints</div>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  {d.players.map((p) => (
                    <div key={p.id} className="flex items-center gap-2">
                      <Avatar name={p.user?.name || p.inviteEmail || "Sparring Partner"} />
                      <div className="text-xs">
                        <div className="font-medium truncate max-w-[10rem]">{p.user?.name || (p.userId ? "Player" : "Sparring Partner")}</div>
                        <div className="text-black/40 dark:text-white/40">{p.totalPoints.toFixed(0)} pts · {p.sprintsWon}W</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {pendingInvites.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm uppercase tracking-[0.2em] text-black/40 dark:text-white/40 flex items-center gap-2"><Hourglass className="w-4 h-4" />Pending invites</h2>
          <div className="space-y-3">
            {pendingInvites.map((d) => (
              <div key={d.id} className="card p-5 flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="font-medium">{d.title}</div>
                  <div className="text-xs text-black/50 dark:text-white/50 mt-1">From {d.players.find((p) => p.side === "A")?.user?.name || "challenger"} · Stake: {d.stakeText}</div>
                </div>
                {d.players.some((p) => p.inviteEmail === user.email && !p.accepted) ? (
                  <DuelInviteActions duelId={d.id} />
                ) : (
                  <Link href={`/dashboard/duels/${d.id}`} className="btn-secondary text-xs">View</Link>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {completed.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm uppercase tracking-[0.2em] text-black/40 dark:text-white/40 flex items-center gap-2"><Trophy className="w-4 h-4" />Completed</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {completed.map((d) => {
              const sorted = [...d.players].sort((a, b) => b.sprintsWon - a.sprintsWon || b.totalPoints - a.totalPoints);
              return (
                <Link key={d.id} href={`/dashboard/duels/${d.id}`} className="card p-5 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{d.title}</div>
                    <Trophy className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="text-xs text-black/50 dark:text-white/50 mt-2">
                    {sorted.map((p) => `${p.user?.name || "Partner"}: ${p.sprintsWon}W`).join(" · ")}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function Avatar({ name }: { name: string }) {
  const initial = name.charAt(0).toUpperCase();
  return (
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-xs font-semibold">
      {initial}
    </div>
  );
}

type HeroDuel = Awaited<ReturnType<typeof fetchData>>["active"][number];

function HeroCard({ duel, currentUserId }: { duel: HeroDuel; currentUserId: string }) {
  const me = duel.players.find((p) => p.userId === currentUserId) ?? duel.players[0];
  const opp = duel.players.find((p) => p.id !== me.id) ?? duel.players[1];
  const totalContribs = duel.players.reduce((s, p) => s + p.totalPoints, 0);
  const pct = Math.min(100, (totalContribs / duel.targetAmount) * 100);
  const daysLeft = Math.max(0, Math.ceil((duel.endDate.getTime() - Date.now()) / 86400000));
  return (
    <Link href={`/dashboard/duels/${duel.id}`} className="block card p-8 bg-gradient-to-br from-black/[0.04] to-transparent dark:from-white/[0.04] hover:from-black/[0.06] dark:hover:from-white/[0.06] transition">
      <div className="flex items-center justify-between flex-wrap gap-6">
        <PlayerBlock player={me} mirror={false} />
        <div className="flex-1 min-w-[200px] text-center">
          <div className="text-xs uppercase tracking-[0.2em] text-black/40 dark:text-white/40">{duel.title}</div>
          <div className="text-5xl font-semibold tracking-[-0.03em] mt-2">{daysLeft}d</div>
          <div className="text-xs text-black/50 dark:text-white/50 mt-1">left · {formatCurrency(totalContribs)} of {formatCurrency(duel.targetAmount)}</div>
          <div className="mt-3 h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-indigo-500 to-fuchsia-500" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <PlayerBlock player={opp} mirror />
      </div>
    </Link>
  );
}

function PlayerBlock({ player, mirror }: { player: HeroDuel["players"][number]; mirror: boolean }) {
  const name = player.user?.name || (player.userId ? "Player" : "Sparring Partner");
  return (
    <div className={"flex items-center gap-3 " + (mirror ? "flex-row-reverse text-right" : "")}>
      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-xl font-semibold">
        {name.charAt(0).toUpperCase()}
      </div>
      <div>
        <div className="font-medium">{name}</div>
        <div className="text-xs text-black/50 dark:text-white/50">{player.totalPoints.toFixed(0)} pts</div>
        <div className="text-xs text-black/40 dark:text-white/40">{player.sprintsWon} sprints won</div>
      </div>
    </div>
  );
}
