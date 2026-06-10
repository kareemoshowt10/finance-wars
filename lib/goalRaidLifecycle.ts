import { prisma } from "./prisma";
import { notify } from "./notifications";
import { award } from "./wallet";
import { evaluate as evalAch } from "./achievements/engine";
import { daysRemaining } from "./goalRaid";

const VICTORY_KEY = "raid:victory:";
const EXPIRING_KEY = "raid:expiring:";
const EXPIRED_KEY = "raid:expired:";

// SC reward for clearing a raid, scaled by how early the kill landed.
export function victoryBonus(daysEarly: number): number {
  if (daysEarly >= 30) return 25;
  if (daysEarly >= 7) return 15;
  return 10;
}

// Walk a user's active raids, transition status against the live goal, and
// fire one-time side effects (notifications, currency, achievements) on each
// transition. Safe to run repeatedly: each side effect is deduped on a
// notification key, and currency awards are deduped via refType/refId.
export async function processRaidsForUser(userId: string, now: Date = new Date()) {
  const raids = await prisma.goalRaid.findMany({
    where: { userId, status: "ACTIVE" },
    include: { goal: true },
  });
  let victories = 0;
  let expirings = 0;
  let expirations = 0;

  for (const raid of raids) {
    const current = raid.goal.currentAmount;
    const won = current >= raid.targetAmount;
    const expired = now > raid.deadline;

    if (won) {
      await prisma.goalRaid.update({
        where: { id: raid.id },
        data: { status: "DEFEATED", defeatedAt: now },
      });
      // Reward: scale with how early the kill landed.
      const earlyDays = daysRemaining(raid.deadline, now);
      const bonus = victoryBonus(earlyDays);
      await award({
        userId,
        currency: "SC",
        delta: bonus,
        reason: "GOAL_MILESTONE",
        refType: "GoalRaid",
        refId: raid.id,
        meta: { kind: "raid-victory", boss: raid.bossName },
      }).catch(() => {});
      await notify(
        userId,
        "RAID_VICTORY",
        `Raid cleared: ${raid.bossName} is defeated`,
        `You took down ${raid.bossName} ${raid.bossTitle} with ${earlyDays} day${earlyDays === 1 ? "" : "s"} to spare. +${bonus} SC.`,
        "/dashboard/raids",
        `${VICTORY_KEY}${raid.id}`
      ).catch(() => {});

      const totalWon = await prisma.goalRaid.count({ where: { userId, status: "DEFEATED" } });
      evalAch(userId, { type: "raid-won", totalRaidsWon: totalWon }).catch(() => {});
      victories++;
      continue;
    }

    if (expired) {
      await prisma.goalRaid.update({
        where: { id: raid.id },
        data: { status: "EXPIRED" },
      });
      const pct = raid.targetAmount > raid.startAmount
        ? Math.round(((current - raid.startAmount) / (raid.targetAmount - raid.startAmount)) * 100)
        : 0;
      await notify(
        userId,
        "RAID_EXPIRED",
        `Raid expired: ${raid.bossName} survived`,
        `The clock ran out on ${raid.bossName}. You got it to ${Math.max(0, pct)}%. The goal stays — restart the raid when you're ready.`,
        "/dashboard/raids",
        `${EXPIRED_KEY}${raid.id}`
      ).catch(() => {});
      expirations++;
      continue;
    }

    // Warn once when a raid enters its final 3 days behind pace.
    const left = daysRemaining(raid.deadline, now);
    if (left > 0 && left <= 3) {
      const remaining = Math.max(0, raid.targetAmount - current);
      if (remaining > 0) {
        await notify(
          userId,
          "RAID_EXPIRING",
          `Final push: ${raid.bossName} has ${left} day${left === 1 ? "" : "s"} left`,
          `$${Math.round(remaining).toLocaleString()} of HP remains. One last assault.`,
          "/dashboard/raids",
          `${EXPIRING_KEY}${raid.id}`
        ).catch(() => {});
        expirings++;
      }
    }
  }

  return { victories, expirings, expirations, scanned: raids.length };
}
