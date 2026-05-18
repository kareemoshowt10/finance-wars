import { prisma } from "@/lib/prisma";
import type { Badge } from "./constants";

type Ctx = {
  trigger: "CONTRIBUTION" | "SPRINT_CLOSE" | "PERFECT_WEEK" | "MANUAL";
  sprintId?: string;
  badge?: Badge | "MORAL_VICTORY";
};

async function awardBadge(duelId: string, playerId: string, badge: string, payload?: Record<string, unknown>) {
  const player = await prisma.duelPlayer.findUnique({ where: { id: playerId } });
  if (!player) return;
  // Check dedupe — see if we've already emitted this badge
  const existing = await prisma.duelEvent.findFirst({
    where: { duelId, playerId, kind: "BADGE" },
  });
  // We need finer-grained dedupe per badge
  const all = await prisma.duelEvent.findMany({
    where: { duelId, playerId, kind: "BADGE" },
    select: { payload: true },
  });
  for (const e of all) {
    const p = e.payload as { badge?: string } | null;
    if (p && p.badge === badge) return;
  }
  void existing;

  await prisma.duelEvent.create({
    data: { duelId, playerId, kind: "BADGE", payload: { badge, ...(payload ?? {}) } as never },
  });

  if (player.userId) {
    try {
      await prisma.notification.create({
        data: {
          userId: player.userId,
          kind: "DUEL_BADGE",
          title: `Badge unlocked: ${badge}`,
          body: badgeBlurb(badge),
          link: `/dashboard/duels/${duelId}`,
          key: `duel:${duelId}:badge:${badge}:${playerId}`,
        },
      });
    } catch {
      // dedup
    }
  }
}

function badgeBlurb(badge: string): string {
  switch (badge) {
    case "FIRST_BLOOD":
      return "First contribution logged. The duel begins.";
    case "STREAK_7":
      return "Seven days in a row. Disciplined.";
    case "STREAK_14":
      return "Fourteen days. Unrelenting.";
    case "PERFECT_WEEK":
      return "You hit target every day this sprint.";
    case "COMEBACK":
      return "You climbed back from a deficit. Pressure on.";
    case "LANDSLIDE":
      return "Dominant sprint victory.";
    case "MORAL_VICTORY":
      return "Opponent forfeited the stake. The win still counts.";
    default:
      return "Badge unlocked.";
  }
}

export async function evaluateBadges(duelId: string, playerId: string, ctx: Ctx) {
  const player = await prisma.duelPlayer.findUnique({ where: { id: playerId } });
  if (!player) return;

  if (ctx.trigger === "MANUAL" && ctx.badge) {
    await awardBadge(duelId, playerId, ctx.badge);
    return;
  }

  // FIRST_BLOOD — first non-disputed contribution in the duel by this player
  const firstContrib = await prisma.contribution.findFirst({
    where: {
      playerId,
      OR: [{ disputeStatus: null }, { disputeStatus: "UPHELD" }],
    },
    orderBy: { createdAt: "asc" },
  });
  if (firstContrib) {
    // Also need to be FIRST overall? Spec says first contribution.
    await awardBadge(duelId, playerId, "FIRST_BLOOD");
  }

  // STREAK 7 / 14
  if (player.currentStreakDays >= 7) await awardBadge(duelId, playerId, "STREAK_7");
  if (player.currentStreakDays >= 14) await awardBadge(duelId, playerId, "STREAK_14");

  if (ctx.trigger === "PERFECT_WEEK" && ctx.sprintId) {
    await awardBadge(duelId, playerId, "PERFECT_WEEK", { sprintId: ctx.sprintId });
  }

  if (ctx.trigger === "SPRINT_CLOSE" && ctx.sprintId) {
    // LANDSLIDE — won sprint with ≥2x opponent points
    const sprint = await prisma.sprint.findUnique({
      where: { id: ctx.sprintId },
      include: { contributions: true, duel: { include: { players: true } } },
    });
    if (sprint && sprint.winnerPlayerId === playerId) {
      const pts: Record<string, number> = {};
      for (const p of sprint.duel.players) pts[p.id] = 0;
      for (const c of sprint.contributions) {
        if (c.disputeStatus === "PENDING" || c.disputeStatus === "CONCEDED") continue;
        pts[c.playerId] = (pts[c.playerId] || 0) + c.pointsAwarded;
      }
      const myPts = pts[playerId] || 0;
      const oppPts = Math.max(
        ...Object.entries(pts)
          .filter(([id]) => id !== playerId)
          .map(([, v]) => v),
        0
      );
      if (myPts >= 2 * Math.max(oppPts, 1) && myPts > 0) {
        await awardBadge(duelId, playerId, "LANDSLIDE", { sprintId: ctx.sprintId });
      }

      // COMEBACK — was behind before this sprint, now ahead
      const priorSprints = await prisma.sprint.findMany({
        where: { duelId, weekNumber: { lt: sprint.weekNumber } },
        include: { contributions: true },
      });
      const priorPts: Record<string, number> = {};
      for (const p of sprint.duel.players) priorPts[p.id] = 0;
      for (const s of priorSprints) {
        for (const c of s.contributions) {
          if (c.disputeStatus === "PENDING" || c.disputeStatus === "CONCEDED") continue;
          priorPts[c.playerId] = (priorPts[c.playerId] || 0) + c.pointsAwarded;
        }
      }
      const oppPrior = Math.max(
        ...Object.entries(priorPts)
          .filter(([id]) => id !== playerId)
          .map(([, v]) => v),
        0
      );
      const myPrior = priorPts[playerId] || 0;
      const myTotal = myPrior + myPts;
      const oppTotal = oppPrior + oppPts;
      if (myPrior < oppPrior && myTotal > oppTotal) {
        await awardBadge(duelId, playerId, "COMEBACK", { sprintId: ctx.sprintId });
      }
    }
  }
}
