import { prisma } from "./prisma";
import { award } from "./wallet";
import { startOfDay, computeStreak, longestStreakEver } from "./chores";
import {
  buildObjectiveStatuses,
  allObjectivesDone,
  dateKey,
  DAILY_BONUS_CROWNS,
  DAILY_BONUS_XP,
  type ObjectiveStatus,
} from "./dailyObjectives";
import { evaluate } from "./achievements/engine";

/**
 * The household's shared streak: consecutive days with at least one chore
 * completion from *anyone* in the house. Deliberately not per-user — the
 * point is peer pressure ("don't be the one who breaks it"), not a solo
 * habit tracker. Computed on the fly from ChoreCompletion history, same
 * pattern as the per-user chore streak.
 */
export async function getHouseholdStreak(householdId: string, now: Date = new Date()) {
  const completions = await prisma.choreCompletion.findMany({
    where: { householdId },
    select: { completedAt: true },
  });
  const dates = completions.map((c) => c.completedAt);
  return {
    current: computeStreak(dates, "DAILY", now),
    longest: longestStreakEver(dates),
  };
}

/** Whether the household logged any chore activity today — the streak-at-risk signal. */
export async function hasHouseholdActivityToday(householdId: string, now: Date = new Date()): Promise<boolean> {
  const count = await prisma.choreCompletion.count({
    where: { householdId, completedAt: { gte: startOfDay(now) } },
  });
  return count > 0;
}

export async function getDailyObjectiveStatuses(
  householdId: string,
  userId: string,
  now: Date = new Date()
): Promise<ObjectiveStatus[]> {
  const since = startOfDay(now);
  const [choreCount, contributionCount, voteCount, cheerCount] = await Promise.all([
    prisma.choreCompletion.count({ where: { householdId, userId, completedAt: { gte: since } } }),
    prisma.householdGoalContribution.count({ where: { userId, createdAt: { gte: since }, goal: { householdId } } }),
    prisma.householdGoalVote.count({ where: { userId, createdAt: { gte: since }, goal: { householdId } } }),
    prisma.householdCheer.count({ where: { householdId, fromUserId: userId, createdAt: { gte: since } } }),
  ]);
  return buildObjectiveStatuses({
    choreDone: choreCount > 0,
    goalCheckin: contributionCount + voteCount > 0,
    cheered: cheerCount > 0,
  });
}

function bonusRefId(householdId: string, now: Date): string {
  return `${householdId}:${dateKey(now)}`;
}

export async function hasBonusToday(userId: string, householdId: string, now: Date = new Date()): Promise<boolean> {
  const existing = await prisma.walletEntry.findFirst({
    where: { userId, currency: "CROWNS", reason: "DAILY_BONUS", refId: bonusRefId(householdId, now) },
  });
  return !!existing;
}

/**
 * Call after any objective-relevant action (a chore, a goal contribution or
 * vote, a cheer). No-ops unless this is the action that just completed the
 * third objective, in which case it awards the bonus exactly once per day.
 */
export async function maybeAwardDailyBonus(householdId: string, userId: string, now: Date = new Date()): Promise<boolean> {
  if (await hasBonusToday(userId, householdId, now)) return false;

  const statuses = await getDailyObjectiveStatuses(householdId, userId, now);
  if (!allObjectivesDone(statuses)) return false;

  const refId = bonusRefId(householdId, now);
  await Promise.all([
    award({
      userId,
      currency: "CROWNS",
      delta: DAILY_BONUS_CROWNS,
      reason: "DAILY_BONUS",
      refType: "DailyObjectives",
      refId,
      householdId,
    }),
    prisma.user.update({ where: { id: userId }, data: { xp: { increment: DAILY_BONUS_XP } } }),
    prisma.notification
      .create({
        data: {
          userId,
          kind: "DAILY_OBJECTIVES_COMPLETE",
          title: "🎉 Daily objectives complete!",
          body: `+${DAILY_BONUS_CROWNS} Crowns, +${DAILY_BONUS_XP} XP`,
          link: "/dashboard/household",
          key: `daily-bonus:${refId}`,
        },
      })
      .catch(() => null),
  ]);

  const totalDays = await prisma.walletEntry.count({ where: { userId, currency: "CROWNS", reason: "DAILY_BONUS" } });
  await evaluate(userId, { type: "daily-objectives-complete", totalDays });

  return true;
}
