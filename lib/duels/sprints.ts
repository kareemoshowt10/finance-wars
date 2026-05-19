import { prisma } from "@/lib/prisma";
import { addDays, startOfDay, computeStreakDays } from "./util";
import { round2 } from "./scoring";
import { evaluateBadges } from "./badges";

const FORFEIT_BADGE = "MORAL_VICTORY";

async function emitEvent(duelId: string, kind: string, payload?: Record<string, unknown>, playerId?: string) {
  await prisma.duelEvent.create({
    data: { duelId, kind, playerId: playerId ?? null, payload: (payload ?? null) as never },
  });
}

async function notify(userId: string, kind: string, title: string, body: string, link: string, key: string) {
  try {
    await prisma.notification.create({ data: { userId, kind, title, body, link, key } });
  } catch {
    // dedupe via unique
  }
}

/** Open the next sprint for an active duel. Returns the created sprint or null. */
export async function openNextSprint(duelId: string) {
  const duel = await prisma.duel.findUnique({
    where: { id: duelId },
    include: { sprints: { orderBy: { weekNumber: "desc" }, take: 1, include: { targets: true } }, players: true },
  });
  if (!duel) return null;
  if (duel.status !== "ACTIVE") return null;
  const now = new Date();
  if (now >= duel.endDate) return null;

  const last = duel.sprints[0];
  // If there's an active sprint open, don't open another
  if (last && last.status === "ACTIVE") return last;

  const weekNumber = last ? last.weekNumber + 1 : 1;
  const startDate = last ? last.endDate : duel.startDate;
  let endDate = addDays(startDate, duel.sprintLengthDays);
  if (endDate > duel.endDate) endDate = duel.endDate;

  // Determine remaining sprints
  const totalSprintsMax = Math.max(
    1,
    Math.ceil((duel.endDate.getTime() - duel.startDate.getTime()) / (duel.sprintLengthDays * 86400000))
  );
  const remainingSprints = Math.max(1, totalSprintsMax - weekNumber + 1);

  // Compute accumulated contributions so far
  const allContribs = await prisma.contribution.findMany({
    where: { sprint: { duelId } },
    select: { amount: true, disputeStatus: true },
  });
  const accumulated = allContribs
    .filter((c) => c.disputeStatus === null || c.disputeStatus === "CONCEDED")
    .reduce((s, c) => s + c.amount, 0);
  const remainingTarget = Math.max(0, duel.targetAmount - accumulated);

  const sprint = await prisma.sprint.create({
    data: { duelId, weekNumber, startDate, endDate, status: "ACTIVE" },
  });

  // Default sprint targets per player
  for (const p of duel.players) {
    let amount = 10;
    if (last) {
      const t = last.targets.find((x) => x.playerId === p.id);
      if (t) amount = t.amount;
      else amount = Math.max(10, Math.floor(remainingTarget / remainingSprints / 2));
    } else {
      amount = Math.max(10, Math.floor(remainingTarget / remainingSprints / 2));
    }
    await prisma.sprintTarget.create({ data: { sprintId: sprint.id, playerId: p.id, amount } });
  }

  await emitEvent(duelId, "SPRINT_OPEN", { weekNumber, sprintId: sprint.id });

  return sprint;
}

/** Close a sprint and record winner, update streaks/sprints-won. */
export async function closeSprint(sprintId: string) {
  const sprint = await prisma.sprint.findUnique({
    where: { id: sprintId },
    include: {
      duel: { include: { players: true } },
      contributions: true,
      targets: true,
    },
  });
  if (!sprint || sprint.status === "CLOSED") return null;

  const players = sprint.duel.players;
  const points: Record<string, number> = {};
  for (const p of players) points[p.id] = 0;
  for (const c of sprint.contributions) {
    if (c.disputeStatus === "PENDING") continue;
    if (c.disputeStatus === "CONCEDED") continue;
    points[c.playerId] = (points[c.playerId] || 0) + c.pointsAwarded;
  }

  // COOP mode: shared target — both win if combined hits the per-sprint combined target.
  const isCoop = sprint.duel.mode === "COOP";
  let winnerPlayerId: string | null = null;
  let isTie = false;
  let coopHit = false;
  if (isCoop) {
    const totalSprints = Math.max(
      1,
      Math.ceil((sprint.duel.endDate.getTime() - sprint.duel.startDate.getTime()) / (sprint.duel.sprintLengthDays * 86400000))
    );
    const combinedTarget = sprint.duel.targetAmount / totalSprints;
    const combined = sprint.contributions
      .filter((c) => c.disputeStatus !== "PENDING" && c.disputeStatus !== "CONCEDED")
      .reduce((s, c) => s + c.amount, 0);
    coopHit = combined >= combinedTarget;
    isTie = coopHit; // both get credit (treated as tie so both increment)
  } else {
    const sorted = Object.entries(points).sort((a, b) => b[1] - a[1]);
    isTie = sorted.length >= 2 && sorted[0][1] === sorted[1][1] && sorted[0][1] > 0;
    if (!isTie && sorted[0] && sorted[0][1] > 0) winnerPlayerId = sorted[0][0];
  }

  // Streak handling — for each player check if they hit daily target every day
  for (const p of players) {
    const target = sprint.targets.find((t) => t.playerId === p.id);
    const days = Math.max(
      1,
      Math.ceil((sprint.endDate.getTime() - sprint.startDate.getTime()) / 86400000)
    );
    const daily = target ? target.amount / days : 0;
    // contributions per day in sprint
    const perDay = new Map<string, number>();
    for (const c of sprint.contributions) {
      if (c.playerId !== p.id) continue;
      if (c.disputeStatus === "PENDING" || c.disputeStatus === "CONCEDED") continue;
      const k = c.createdAt.toISOString().slice(0, 10);
      perDay.set(k, (perDay.get(k) || 0) + c.amount);
    }
    let hitEvery = days > 0 && daily > 0;
    for (let i = 0; i < days; i++) {
      const d = addDays(sprint.startDate, i);
      const k = d.toISOString().slice(0, 10);
      if ((perDay.get(k) || 0) < daily) {
        hitEvery = false;
        break;
      }
    }

    if (winnerPlayerId === p.id || isTie) {
      await prisma.duelPlayer.update({
        where: { id: p.id },
        data: { sprintsWon: { increment: 1 } },
      });
    }

    // Recompute totals from all contributions
    const all = await prisma.contribution.findMany({
      where: { playerId: p.id },
      select: { pointsAwarded: true, disputeStatus: true },
    });
    const total = all
      .filter((c) => c.disputeStatus !== "PENDING" && c.disputeStatus !== "CONCEDED")
      .reduce((s, c) => s + c.pointsAwarded, 0);
    const streak = await computeStreakDays(p.id, new Date());
    const longest = Math.max(p.longestStreakDays, streak);
    await prisma.duelPlayer.update({
      where: { id: p.id },
      data: { totalPoints: round2(total), currentStreakDays: streak, longestStreakDays: longest },
    });

    if (hitEvery) {
      await evaluateBadges(sprint.duelId, p.id, { trigger: "PERFECT_WEEK", sprintId: sprint.id });
    }
    await evaluateBadges(sprint.duelId, p.id, { trigger: "SPRINT_CLOSE", sprintId: sprint.id });
  }

  await prisma.sprint.update({
    where: { id: sprintId },
    data: { status: "CLOSED", winnerPlayerId, closedAt: new Date() },
  });

  await emitEvent(sprint.duelId, "SPRINT_CLOSE", {
    weekNumber: sprint.weekNumber,
    sprintId: sprint.id,
    winnerPlayerId,
    tie: isTie,
    points,
  });

  // Notify both players
  for (const p of players) {
    if (!p.userId) continue;
    const won = winnerPlayerId === p.id;
    const title = isTie ? `Sprint ${sprint.weekNumber}: Tied` : won ? `Sprint ${sprint.weekNumber}: Victory` : `Sprint ${sprint.weekNumber}: Closed`;
    const body = isTie
      ? "You and your opponent are dead even this sprint."
      : won
      ? "You took the sprint. Pressure on."
      : "Your opponent took this one. Reload.";
    await notify(
      p.userId,
      "DUEL_SPRINT_RESULT",
      title,
      body,
      `/dashboard/duels/${sprint.duelId}`,
      `duel:${sprint.duelId}:sprint:${sprint.weekNumber}:result:${p.userId}`
    );
  }

  return sprint;
}

export async function completeDuel(duelId: string) {
  const duel = await prisma.duel.findUnique({
    where: { id: duelId },
    include: { players: true, sprints: true },
  });
  if (!duel) return;
  if (duel.status === "COMPLETED") return;

  const now = new Date();
  const allClosed = duel.sprints.length > 0 && duel.sprints.every((s) => s.status === "CLOSED");
  const endPassed = now >= duel.endDate;
  if (!allClosed && !endPassed) return;

  // Compute winner
  const sorted = [...duel.players].sort((a, b) => {
    if (b.sprintsWon !== a.sprintsWon) return b.sprintsWon - a.sprintsWon;
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    return b.longestStreakDays - a.longestStreakDays;
  });
  const joint =
    sorted.length >= 2 &&
    sorted[0].sprintsWon === sorted[1].sprintsWon &&
    sorted[0].totalPoints === sorted[1].totalPoints &&
    sorted[0].longestStreakDays === sorted[1].longestStreakDays;
  const winnerPlayerId = joint ? null : sorted[0]?.id ?? null;

  const stakeResolvedAt = duel.autoPenaltyEnabled && !duel.stakeVoided ? new Date(now.getTime() + 24 * 3600 * 1000) : null;
  await prisma.duel.update({
    where: { id: duelId },
    data: { status: "COMPLETED", completedAt: now, stakeResolvedAt },
  });

  await emitEvent(duelId, "SPRINT_CLOSE", { complete: true, winnerPlayerId, joint });

  for (const p of duel.players) {
    if (!p.userId) continue;
    const won = winnerPlayerId === p.id;
    await notify(
      p.userId,
      "DUEL_COMPLETE",
      joint ? `Duel complete: Joint victory` : won ? `Duel complete: Champion` : `Duel complete: Defeated`,
      duel.title,
      `/dashboard/duels/${duelId}`,
      `duel:${duelId}:complete:${p.userId}`
    );
  }
}

export async function resolveStake(duelId: string) {
  const duel = await prisma.duel.findUnique({
    where: { id: duelId },
    include: { players: true, events: { where: { kind: "STAKE_RESOLVED" } } },
  });
  if (!duel) return;
  if (!duel.autoPenaltyEnabled) return;
  if (duel.stakeVoided) return;
  if (!duel.stakeResolvedAt) return;
  if (duel.stakeResolvedAt > new Date()) return;
  if (duel.events.length > 0) return;

  // Determine winner/loser by sprintsWon → totalPoints → streak
  const sorted = [...duel.players].sort((a, b) => {
    if (b.sprintsWon !== a.sprintsWon) return b.sprintsWon - a.sprintsWon;
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    return b.longestStreakDays - a.longestStreakDays;
  });
  if (sorted.length < 2) return;
  const winner = sorted[0];
  const loser = sorted[1];
  const tie =
    winner.sprintsWon === loser.sprintsWon &&
    winner.totalPoints === loser.totalPoints &&
    winner.longestStreakDays === loser.longestStreakDays;
  if (tie) return;

  const stakeAmount = duel.stakeAmount ?? 0;
  const pctCap = (duel.stakePercentCap ?? 10) / 100;

  if (!loser.stakeAccountId || !loser.userId || !winner.userId) {
    await emitEvent(duelId, "STAKE_RESOLVED", { forfeited: true, reason: "no_stake_account" });
    await evaluateBadges(duelId, winner.id, { trigger: "MANUAL", badge: FORFEIT_BADGE });
    return;
  }

  const loserAccount = await prisma.account.findUnique({ where: { id: loser.stakeAccountId } });
  if (!loserAccount) {
    await emitEvent(duelId, "STAKE_RESOLVED", { forfeited: true, reason: "no_stake_account" });
    await evaluateBadges(duelId, winner.id, { trigger: "MANUAL", badge: FORFEIT_BADGE });
    return;
  }

  const cap = Math.max(0, loserAccount.balance) * pctCap;
  const transferAmount = Math.min(stakeAmount, cap);

  if (transferAmount <= 0 || loserAccount.balance - transferAmount < 0) {
    await emitEvent(duelId, "STAKE_RESOLVED", { forfeited: true, reason: "insufficient_funds" });
    await evaluateBadges(duelId, winner.id, { trigger: "MANUAL", badge: FORFEIT_BADGE });
    return;
  }

  // Find a winner's account to credit
  let winnerAccount = winner.stakeAccountId
    ? await prisma.account.findUnique({ where: { id: winner.stakeAccountId } })
    : null;
  if (!winnerAccount) {
    winnerAccount = await prisma.account.findFirst({
      where: { userId: winner.userId },
      orderBy: { createdAt: "asc" },
    });
  }
  if (!winnerAccount) {
    await emitEvent(duelId, "STAKE_RESOLVED", { forfeited: true, reason: "no_winner_account" });
    await evaluateBadges(duelId, winner.id, { trigger: "MANUAL", badge: FORFEIT_BADGE });
    return;
  }

  const now = new Date();
  await prisma.$transaction([
    prisma.transaction.create({
      data: {
        userId: loser.userId,
        accountId: loserAccount.id,
        amount: round2(transferAmount),
        type: "expense",
        category: "Duel Stake",
        description: `Duel stake: ${duel.title}`,
        date: now,
      },
    }),
    prisma.transaction.create({
      data: {
        userId: winner.userId,
        accountId: winnerAccount.id,
        amount: round2(transferAmount),
        type: "income",
        category: "Duel Winnings",
        description: `Duel winnings: ${duel.title}`,
        date: now,
      },
    }),
    prisma.account.update({
      where: { id: loserAccount.id },
      data: { balance: round2(loserAccount.balance - transferAmount) },
    }),
    prisma.account.update({
      where: { id: winnerAccount.id },
      data: { balance: round2(winnerAccount.balance + transferAmount) },
    }),
  ]);

  await emitEvent(duelId, "STAKE_RESOLVED", {
    amount: round2(transferAmount),
    winnerPlayerId: winner.id,
    loserPlayerId: loser.id,
  });

  await notify(
    loser.userId,
    "DUEL_STAKE_RESOLVED",
    "Stake transferred",
    `$${round2(transferAmount)} moved from ${loserAccount.name}.`,
    `/dashboard/duels/${duelId}`,
    `duel:${duelId}:stake:loser`
  );
  await notify(
    winner.userId,
    "DUEL_STAKE_RESOLVED",
    "Stake collected",
    `$${round2(transferAmount)} credited to ${winnerAccount.name}.`,
    `/dashboard/duels/${duelId}`,
    `duel:${duelId}:stake:winner`
  );
}

/** Run the engine across all active duels. Returns counters. */
export async function runDuelEngine() {
  const now = new Date();
  let opened = 0;
  let closed = 0;
  let completed = 0;
  let stakesResolved = 0;
  let disputesExpired = 0;

  // Expire pending disputes whose autoResolveAt has passed
  const expiring = await prisma.dispute.findMany({
    where: { status: "PENDING", autoResolveAt: { lte: now } },
    include: { contribution: true },
  });
  for (const d of expiring) {
    await prisma.dispute.update({
      where: { id: d.id },
      data: { status: "UPHELD", resolvedAt: now },
    });
    await prisma.contribution.update({
      where: { id: d.contributionId },
      data: { disputeStatus: null },
    });
    disputesExpired++;
  }

  const active = await prisma.duel.findMany({
    where: { status: "ACTIVE" },
    include: { sprints: { orderBy: { weekNumber: "asc" } }, players: true },
  });

  for (const duel of active) {
    // Close sprints past endDate
    for (const s of duel.sprints) {
      if (s.status === "ACTIVE" && s.endDate <= now) {
        await closeSprint(s.id);
        closed++;
      }
    }
    // 24h-closing notifications
    for (const s of duel.sprints) {
      if (s.status === "ACTIVE") {
        const msLeft = s.endDate.getTime() - now.getTime();
        if (msLeft > 0 && msLeft <= 24 * 3600 * 1000) {
          for (const p of duel.players) {
            if (!p.userId) continue;
            await notify(
              p.userId,
              "DUEL_SPRINT_CLOSING_24H",
              "Sprint closes in 24h",
              `Last push for sprint ${s.weekNumber} of ${duel.title}.`,
              `/dashboard/duels/${duel.id}`,
              `duel:${duel.id}:sprint:${s.weekNumber}:closing24h:${p.userId}`
            );
          }
        }
        // Saturday final push
        if (now.getUTCDay() === 6) {
          for (const p of duel.players) {
            if (!p.userId) continue;
            await notify(
              p.userId,
              "DUEL_FINAL_PUSH",
              "Saturday final push",
              `Don't lose ${duel.title} on the home stretch.`,
              `/dashboard/duels/${duel.id}`,
              `duel:${duel.id}:sprint:${s.weekNumber}:push:${now.toISOString().slice(0, 10)}:${p.userId}`
            );
          }
        }
      }
    }
    // Open next sprint if duel hasn't ended
    if (now < duel.endDate) {
      const hasActive = duel.sprints.some((s) => s.status === "ACTIVE" && s.endDate > now);
      if (!hasActive) {
        const opened1 = await openNextSprint(duel.id);
        if (opened1) opened++;
      }
    } else {
      await completeDuel(duel.id);
      completed++;
    }
  }

  // Resolve any due stakes for COMPLETED duels
  const dueStake = await prisma.duel.findMany({
    where: {
      status: "COMPLETED",
      autoPenaltyEnabled: true,
      stakeVoided: false,
      stakeResolvedAt: { lte: now },
    },
    include: { events: { where: { kind: "STAKE_RESOLVED" } } },
  });
  for (const d of dueStake) {
    if (d.events.length === 0) {
      await resolveStake(d.id);
      stakesResolved++;
    }
  }

  return { opened, closed, completed, stakesResolved, disputesExpired };
}

// Pure helpers (exported for tests) -----------------------------------------

export function determineSprintWinner(points: Record<string, number>): { winnerId: string | null; tie: boolean } {
  const entries = Object.entries(points);
  if (entries.length === 0) return { winnerId: null, tie: false };
  entries.sort((a, b) => b[1] - a[1]);
  if (entries[0][1] <= 0) return { winnerId: null, tie: false };
  if (entries.length >= 2 && entries[0][1] === entries[1][1]) return { winnerId: null, tie: true };
  return { winnerId: entries[0][0], tie: false };
}

export type PlayerSummary = {
  id: string;
  sprintsWon: number;
  totalPoints: number;
  longestStreakDays: number;
};

export function determineDuelWinner(players: PlayerSummary[]): { winnerId: string | null; joint: boolean } {
  if (players.length < 2) return { winnerId: players[0]?.id ?? null, joint: false };
  const sorted = [...players].sort((a, b) => {
    if (b.sprintsWon !== a.sprintsWon) return b.sprintsWon - a.sprintsWon;
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    return b.longestStreakDays - a.longestStreakDays;
  });
  const joint =
    sorted[0].sprintsWon === sorted[1].sprintsWon &&
    sorted[0].totalPoints === sorted[1].totalPoints &&
    sorted[0].longestStreakDays === sorted[1].longestStreakDays;
  return { winnerId: joint ? null : sorted[0].id, joint };
}

export type StakeCalcInput = {
  loserBalance: number;
  stakeAmount: number;
  stakePercentCap: number; // e.g. 10 = 10%
};
export function calcStakeTransfer({ loserBalance, stakeAmount, stakePercentCap }: StakeCalcInput): {
  transfer: number;
  forfeited: boolean;
} {
  const cap = Math.max(0, loserBalance) * (stakePercentCap / 100);
  const amt = Math.min(stakeAmount, cap);
  if (amt <= 0 || loserBalance - amt < 0) return { transfer: 0, forfeited: true };
  return { transfer: round2(amt), forfeited: false };
}

void startOfDay;
