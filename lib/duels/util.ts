import { prisma } from "@/lib/prisma";
import { scoreContribution, round2 } from "./scoring";

/** Day key in UTC (YYYY-MM-DD). */
export function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Start of UTC day. */
export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

export function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + days);
  return x;
}

/** Deterministic seeded jitter 0..1 from string. */
export function seededRand(seed: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h ^ seed.charCodeAt(i)) >>> 0;
    h = Math.imul(h, 16777619) >>> 0;
  }
  return ((h >>> 0) % 100000) / 100000;
}

/** Compute streak days for a player as of `asOf` (consecutive days with at least one non-disputed contribution). */
export async function computeStreakDays(playerId: string, asOf: Date): Promise<number> {
  const contribs = await prisma.contribution.findMany({
    where: { playerId, OR: [{ disputeStatus: null }, { disputeStatus: "CONCEDED" }] },
    select: { createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  if (contribs.length === 0) return 0;
  const days = new Set<string>();
  for (const c of contribs) days.add(dayKey(c.createdAt));
  let streak = 0;
  let cursor = startOfDay(asOf);
  // allow today missing — start scanning from today backwards
  // but if today missing, start from yesterday
  if (!days.has(dayKey(cursor))) {
    cursor = addDays(cursor, -1);
  }
  while (days.has(dayKey(cursor))) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** Recompute and persist a player's totalPoints + streak fields. */
export async function recomputePlayerTotals(playerId: string): Promise<void> {
  const contribs = await prisma.contribution.findMany({
    where: { playerId },
    select: { pointsAwarded: true, disputeStatus: true, createdAt: true },
  });
  let total = 0;
  for (const c of contribs) {
    if (c.disputeStatus === "PENDING" || c.disputeStatus === "UPHELD") continue;
    total += c.pointsAwarded;
  }
  const streak = await computeStreakDays(playerId, new Date());
  const player = await prisma.duelPlayer.findUnique({ where: { id: playerId } });
  const longest = Math.max(player?.longestStreakDays ?? 0, streak);
  await prisma.duelPlayer.update({
    where: { id: playerId },
    data: { totalPoints: round2(total), currentStreakDays: streak, longestStreakDays: longest },
  });
}

/** Compute pointsAwarded for a new contribution given its sprint/player context. */
export async function computeContribPoints(args: {
  playerId: string;
  sprintId: string;
  amount: number;
  atDate: Date;
}): Promise<number> {
  const { playerId, sprintId, amount, atDate } = args;
  const sprint = await prisma.sprint.findUnique({ where: { id: sprintId } });
  const target = await prisma.sprintTarget.findUnique({
    where: { sprintId_playerId: { sprintId, playerId } },
  });
  const streak = await computeStreakDays(playerId, atDate);
  // hitTarget: did today's cumulative meet daily target (sprint target / sprint days)?
  let hitTarget = false;
  if (target && sprint) {
    const dayStart = startOfDay(atDate);
    const dayEnd = addDays(dayStart, 1);
    const todays = await prisma.contribution.findMany({
      where: {
        playerId,
        sprintId,
        createdAt: { gte: dayStart, lt: dayEnd },
        OR: [{ disputeStatus: null }, { disputeStatus: "CONCEDED" }],
      },
    });
    const sumToday = todays.reduce((s, c) => s + c.amount, 0) + amount;
    const days = Math.max(
      1,
      Math.ceil((sprint.endDate.getTime() - sprint.startDate.getTime()) / 86400000)
    );
    const daily = target.amount / days;
    hitTarget = sumToday >= daily;
  }
  return round2(
    scoreContribution({
      amount,
      streakDays: streak,
      hitTarget,
      themeMultiplier: sprint?.themeMultiplier ?? 1.0,
    })
  );
}
