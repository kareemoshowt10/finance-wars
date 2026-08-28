// Household HQ: shared goals.
//
// Solves two concrete problems:
//  1. Two members want a PS5, two want an above-ground pool — both are
//     ELECTIVE goals competing for the same discretionary dollars. Votes +
//     progress decide which one the household should throw its weight
//     behind next.
//  2. The bathroom remodel is ESSENTIAL but boring, so it never gets funded.
//     `isNeglected` flags an essential goal nobody has fed in a while so it
//     surfaces instead of quietly rotting at the bottom of a list.

export type GoalCategory = "ESSENTIAL" | "ELECTIVE";
export type GoalStatus = "ACTIVE" | "FUNDED" | "ARCHIVED";

const NEGLECT_THRESHOLD_DAYS = 21;

/** How much one Crown (earned from chores) is worth toward a household goal. */
export const CROWN_VALUE_USD = 0.1;

export function goalProgressPct(targetAmount: number, currentAmount: number): number {
  if (targetAmount <= 0) return 100;
  return Math.max(0, Math.min(100, (currentAmount / targetAmount) * 100));
}

/**
 * An ESSENTIAL goal is "neglected" once it's gone NEGLECT_THRESHOLD_DAYS
 * without a contribution and still isn't funded. ELECTIVE goals are never
 * flagged this way — nobody needs a reminder that the PS5 fund is behind.
 */
export function isNeglected(
  goal: {
    category: string;
    status: string;
    targetAmount: number;
    currentAmount: number;
    lastContributionAt: Date | null;
    createdAt: Date;
  },
  now: Date = new Date()
): boolean {
  if (goal.category !== "ESSENTIAL" || goal.status !== "ACTIVE") return false;
  if (goalProgressPct(goal.targetAmount, goal.currentAmount) >= 100) return false;
  const since = goal.lastContributionAt ?? goal.createdAt;
  const daysSince = (now.getTime() - since.getTime()) / 86400000;
  return daysSince >= NEGLECT_THRESHOLD_DAYS;
}

export type RankedGoal = {
  id: string;
  votes: number;
  pct: number;
  score: number;
};

/**
 * Rank competing ELECTIVE goals for "which one gets priority" — most votes
 * wins, progress-so-far breaks ties (don't abandon the goal that's 80% of
 * the way there in favor of a fresher one with the same vote count).
 */
export function rankCompetingGoals(
  goals: { id: string; votes: number; targetAmount: number; currentAmount: number }[]
): RankedGoal[] {
  return goals
    .map((g) => {
      const pct = goalProgressPct(g.targetAmount, g.currentAmount);
      return { id: g.id, votes: g.votes, pct, score: g.votes * 1000 + pct };
    })
    .sort((a, b) => b.score - a.score);
}

export function tallyVotes(votes: { goalId: string }[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const v of votes) out[v.goalId] = (out[v.goalId] ?? 0) + 1;
  return out;
}
