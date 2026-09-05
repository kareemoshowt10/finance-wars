import { prisma } from "./prisma";
import { award } from "./wallet";
import { computeStreak, longestStreakEver } from "./chores";
import { dayKey, startOfToday, isValidTimeZone, DEFAULT_TIMEZONE } from "./time";
import {
  buildObjectiveStatuses,
  allObjectivesDone,
  DAILY_BONUS_CROWNS,
  DAILY_BONUS_XP,
  type ObjectiveStatus,
} from "./dailyObjectives";
import { evaluate } from "./achievements/engine";

/**
 * The zone this household's days are measured in. Everything below buckets
 * by it rather than by the server clock, so a 9pm chore in Los Angeles
 * counts toward that day and not the next one. A missing or unrecognised
 * stored value degrades to UTC instead of throwing.
 */
export async function householdTimeZone(householdId: string): Promise<string> {
  const hh = await prisma.household.findUnique({
    where: { id: householdId },
    select: { timezone: true },
  });
  const tz = hh?.timezone;
  return tz && isValidTimeZone(tz) ? tz : DEFAULT_TIMEZONE;
}

/**
 * The household's shared streak: consecutive days with at least one chore
 * completion from *anyone* in the house. Deliberately not per-user — the
 * point is peer pressure ("don't be the one who breaks it"), not a solo
 * habit tracker. Computed on the fly from ChoreCompletion history, same
 * pattern as the per-user chore streak.
 */
export async function getHouseholdStreak(householdId: string, now: Date = new Date(), timeZone?: string) {
  const tz = timeZone ?? (await householdTimeZone(householdId));
  const completions = await prisma.choreCompletion.findMany({
    where: { householdId },
    select: { completedAt: true },
  });
  const dates = completions.map((c) => c.completedAt);
  return {
    current: computeStreak(dates, "DAILY", now, tz),
    longest: longestStreakEver(dates, tz),
  };
}

/** Whether the household logged any chore activity today — the streak-at-risk signal. */
export async function hasHouseholdActivityToday(
  householdId: string,
  now: Date = new Date(),
  timeZone?: string
): Promise<boolean> {
  const tz = timeZone ?? (await householdTimeZone(householdId));
  const count = await prisma.choreCompletion.count({
    where: { householdId, completedAt: { gte: startOfToday(now, tz) } },
  });
  return count > 0;
}

export async function getDailyObjectiveStatuses(
  householdId: string,
  userId: string,
  now: Date = new Date(),
  timeZone?: string
): Promise<ObjectiveStatus[]> {
  const tz = timeZone ?? (await householdTimeZone(householdId));
  const since = startOfToday(now, tz);
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

function bonusRefId(householdId: string, now: Date, timeZone: string): string {
  return `${householdId}:${dayKey(now, timeZone)}`;
}

export async function hasBonusToday(
  userId: string,
  householdId: string,
  now: Date = new Date(),
  timeZone?: string
): Promise<boolean> {
  const tz = timeZone ?? (await householdTimeZone(householdId));
  const existing = await prisma.walletEntry.findFirst({
    where: { userId, currency: "CROWNS", reason: "DAILY_BONUS", refId: bonusRefId(householdId, now, tz) },
  });
  return !!existing;
}

/**
 * Call after any objective-relevant action (a chore, a goal contribution or
 * vote, a cheer). No-ops unless this is the action that just completed the
 * third objective, in which case it awards the bonus exactly once per day.
 */
export async function maybeAwardDailyBonus(householdId: string, userId: string, now: Date = new Date()): Promise<boolean> {
  // Resolved once and threaded down — the two checks below would otherwise
  // each re-read the household row.
  const tz = await householdTimeZone(householdId);

  if (await hasBonusToday(userId, householdId, now, tz)) return false;

  const statuses = await getDailyObjectiveStatuses(householdId, userId, now, tz);
  if (!allObjectivesDone(statuses)) return false;

  const refId = bonusRefId(householdId, now, tz);

  // Claim the day's bonus before paying it.
  //
  // The hasBonusToday() check above is check-then-act, and the third objective
  // can land twice at once — two cheers sent in the same instant, a retried
  // request, two tabs. Both callers passed the check and both paid out, so the
  // household earned +30 Crowns and +20 XP for one day's objectives.
  //
  // Notification's (userId, key) unique constraint is the mutex: exactly one
  // racing caller wins this insert, and the loser returns before awarding
  // anything. No new schema — the keyed notification already existed for
  // deduping the message itself.
  try {
    await prisma.notification.create({
      data: {
        userId,
        kind: "DAILY_OBJECTIVES_COMPLETE",
        title: "🎉 Daily objectives complete!",
        body: `+${DAILY_BONUS_CROWNS} Crowns, +${DAILY_BONUS_XP} XP`,
        link: "/dashboard/household",
        key: `daily-bonus:${refId}`,
      },
    });
  } catch {
    return false; // someone else already claimed today's bonus
  }

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
  ]);

  const totalDays = await prisma.walletEntry.count({ where: { userId, currency: "CROWNS", reason: "DAILY_BONUS" } });
  await evaluate(userId, { type: "daily-objectives-complete", totalDays });

  return true;
}
