// Household HQ: Chores.
//
// Pure helpers for turning "who actually does the dishes" into a scoreboard —
// streaks, leaderboards, and the day/week bucketing they're built on. Kept
// framework/DB-free so they're trivial to unit test; the API routes wire
// these to Prisma.

export type ChoreFrequency = "DAILY" | "WEEKLY" | "ONEOFF";
export type ChoreCategory = "ESSENTIAL" | "ELECTIVE";

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function startOfWeek(d: Date): Date {
  const x = startOfDay(d);
  const day = x.getDay(); // 0 = Sunday
  x.setDate(x.getDate() - day);
  return x;
}

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
  now: Date = new Date()
): number {
  if (frequency === "ONEOFF" || completedAt.length === 0) return 0;

  const bucket = frequency === "DAILY" ? startOfDay : startOfWeek;
  const step = frequency === "DAILY" ? 86400000 : 7 * 86400000;

  const days = new Set(completedAt.map((d) => bucket(d).getTime()));
  const currentBucket = bucket(now).getTime();

  let streak = 0;
  let cursor = currentBucket;
  // If nothing logged yet for the current bucket, start counting from the
  // previous one instead — the streak isn't broken until a full period is
  // skipped entirely.
  if (!days.has(cursor)) cursor -= step;

  while (days.has(cursor)) {
    streak++;
    cursor -= step;
  }
  return streak;
}

/**
 * Longest-ever run of consecutive days with at least one completion,
 * anywhere in the given dates — the household's all-time streak record,
 * as opposed to computeStreak's "current streak as of now". Pure history
 * scan, so it's stable even if the streak has since broken.
 */
export function longestStreakEver(completedAt: Date[]): number {
  if (completedAt.length === 0) return 0;
  const days = Array.from(new Set(completedAt.map((d) => startOfDay(d).getTime()))).sort((a, b) => a - b);

  let longest = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    if (days[i] - days[i - 1] === 86400000) {
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

  return Array.from(byUser.entries())
    .map(([userId, v]) => ({ userId, ...v }))
    .sort((a, b) => b.completions - a.completions || b.crowns - a.crowns)
    .map((entry, i) => ({ ...entry, rank: i + 1 }));
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
  now: Date = new Date()
): boolean {
  if (frequency === "ONEOFF") return lastCompletedAt === null;
  const bucket = frequency === "DAILY" ? startOfDay : startOfWeek;
  if (!lastCompletedAt) return true;
  return bucket(lastCompletedAt).getTime() !== bucket(now).getTime();
}
