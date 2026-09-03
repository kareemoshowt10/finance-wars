// Household HQ: Chores.
//
// Pure helpers for turning "who actually does the dishes" into a scoreboard —
// streaks, leaderboards, and the day/week bucketing they're built on. Kept
// framework/DB-free so they're trivial to unit test; the API routes wire
// these to Prisma.

import { dayKey, weekStartKey, addDays, daysBetween } from "./time";

export type ChoreFrequency = "DAILY" | "WEEKLY" | "ONEOFF";
export type ChoreCategory = "ESSENTIAL" | "ELECTIVE";

/**
 * Current streak of consecutive periods (days for DAILY chores, weeks for
 * WEEKLY chores) in which at least one completion was logged, counting
 * backwards from `now`. A gap of one period ends the streak. Today/this week
 * doesn't need a completion yet to keep yesterday's streak alive — it just
 * doesn't add to it until logged.
 */
export function computeStreak(
  completedAt: Date[],
  frequency: string,
  now: Date = new Date(),
  timeZone?: string
): number {
  if (frequency === "ONEOFF" || completedAt.length === 0) return 0;

  const weekly = frequency !== "DAILY";
  const step = weekly ? -7 : -1;
  const bucketOf = (d: Date) => {
    const key = dayKey(d, timeZone);
    return weekly ? weekStartKey(key) : key;
  };

  const logged = new Set(completedAt.map(bucketOf));
  let cursor = bucketOf(now);
  // If nothing logged yet for the current bucket, start counting from the
  // previous one instead — the streak isn't broken until a full period is
  // skipped entirely.
  if (!logged.has(cursor)) cursor = addDays(cursor, step);

  let streak = 0;
  while (logged.has(cursor)) {
    streak++;
    cursor = addDays(cursor, step);
  }
  return streak;
}

/**
 * Longest-ever run of consecutive days with at least one completion,
 * anywhere in the given dates — the household's all-time streak record,
 * as opposed to computeStreak's "current streak as of now". Pure history
 * scan, so it's stable even if the streak has since broken.
 */
export function longestStreakEver(completedAt: Date[], timeZone?: string): number {
  if (completedAt.length === 0) return 0;
  // "YYYY-MM-DD" sorts lexicographically the same as chronologically.
  const days = Array.from(new Set(completedAt.map((d) => dayKey(d, timeZone)))).sort();

  let longest = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    if (daysBetween(days[i - 1], days[i]) === 1) {
      run++;
    } else {
      run = 1;
    }
    longest = Math.max(longest, run);
  }
  return longest;
}

export type ChoreCompletionRecord = {
  userId: string;
  crownsAwarded: number;
  xpAwarded: number;
  completedAt: Date;
  choreId?: string;
};

export type LeaderboardEntry = {
  userId: string;
  name: string;
  completions: number;
  crowns: number;
  xp: number;
  rank: number;
};

/** Aggregate chore completions per member into a ranked leaderboard. */
export function buildLeaderboard(
  completions: ChoreCompletionRecord[],
  members: { userId: string; name: string }[]
): LeaderboardEntry[] {
  const byUser = new Map<string, { name: string; completions: number; crowns: number; xp: number }>();
  for (const m of members) byUser.set(m.userId, { name: m.name, completions: 0, crowns: 0, xp: 0 });

  for (const c of completions) {
    const entry = byUser.get(c.userId) ?? { name: "Member", completions: 0, crowns: 0, xp: 0 };
    entry.completions += 1;
    entry.crowns += c.crownsAwarded;
    entry.xp += c.xpAwarded;
    byUser.set(c.userId, entry);
  }

  return rankEntries(Array.from(byUser.entries()).map(([userId, v]) => ({ userId, ...v, rank: 0 })));
}

/** Most chores logged wins; Crowns break the tie. */
function rankEntries(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  return [...entries]
    .sort((a, b) => b.completions - a.completions || b.crowns - a.crowns)
    .map((entry, i) => ({ ...entry, rank: i + 1 }));
}

/**
 * Fold one freshly logged completion into an already-aggregated leaderboard,
 * re-sorting by the same rule buildLeaderboard uses. The chores view calls this
 * the moment someone taps "Mark done" so they climb the board immediately,
 * rather than a network round trip later.
 */
export function applyCompletionToLeaderboard(
  entries: LeaderboardEntry[],
  userId: string,
  name: string,
  crowns: number,
  xp: number
): LeaderboardEntry[] {
  const known = entries.some((e) => e.userId === userId);
  const next = known
    ? entries.map((e) =>
        e.userId === userId
          ? { ...e, completions: e.completions + 1, crowns: e.crowns + crowns, xp: e.xp + xp }
          : e
      )
    : [...entries, { userId, name, completions: 1, crowns, xp, rank: 0 }];
  return rankEntries(next);
}

/** Count of completions for a single chore, per user — e.g. "who does the dishes most". */
export function mostFrequentDoer(
  completions: { choreId: string; userId: string }[],
  choreId: string
): { userId: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const c of completions) {
    if (c.choreId !== choreId) continue;
    counts.set(c.userId, (counts.get(c.userId) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([userId, count]) => ({ userId, count }))
    .sort((a, b) => b.count - a.count);
}

/** Whether a chore is "due" — i.e. hasn't been logged yet in its current period. */
export function isChoreDue(
  frequency: string,
  lastCompletedAt: Date | null,
  now: Date = new Date(),
  timeZone?: string
): boolean {
  if (frequency === "ONEOFF") return lastCompletedAt === null;
  if (!lastCompletedAt) return true;
  const bucketOf = (d: Date) => {
    const key = dayKey(d, timeZone);
    return frequency === "DAILY" ? key : weekStartKey(key);
  };
  return bucketOf(lastCompletedAt) !== bucketOf(now);
}
