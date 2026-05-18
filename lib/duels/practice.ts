import { prisma } from "@/lib/prisma";
import { seededRand, dayKey, startOfDay, addDays, recomputePlayerTotals, computeContribPoints } from "./util";
import { round2 } from "./scoring";

/** For practice duels, generate a daily contribution for the B-side opponent. */
export async function tickPractice(duelId: string) {
  const duel = await prisma.duel.findUnique({
    where: { id: duelId },
    include: {
      players: true,
      sprints: { where: { status: "ACTIVE" }, orderBy: { weekNumber: "desc" }, take: 1 },
    },
  });
  if (!duel) return null;
  if (!duel.isPractice) return null;
  if (duel.status !== "ACTIVE") return null;
  const sprint = duel.sprints[0];
  if (!sprint) return null;

  const bPlayer = duel.players.find((p) => p.side === "B" && p.userId === null);
  if (!bPlayer) return null;

  const now = new Date();
  const dStart = startOfDay(now);
  const dEnd = addDays(dStart, 1);

  const already = await prisma.contribution.findFirst({
    where: { sprintId: sprint.id, playerId: bPlayer.id, createdAt: { gte: dStart, lt: dEnd } },
  });
  if (already) return null;

  const seed = seededRand(`${duelId}:${dayKey(now)}`);
  const base = duel.practiceOpponentDailyAvg ?? 30;
  const factor = 1 + (seed - 0.5) * 0.6;
  const amount = round2(Math.max(1, base * factor));

  const points = await computeContribPoints({
    playerId: bPlayer.id,
    sprintId: sprint.id,
    amount,
    atDate: now,
  });

  const editableUntil = new Date(now.getTime() + 24 * 3600 * 1000);
  await prisma.contribution.create({
    data: {
      sprintId: sprint.id,
      playerId: bPlayer.id,
      amount,
      pointsAwarded: points,
      editableUntil,
    },
  });

  await recomputePlayerTotals(bPlayer.id);
  return { amount, points };
}
