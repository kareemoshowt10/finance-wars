export type ScoreInput = {
  amount: number;
  streakDays: number;
  hitTarget: boolean;
  themeMultiplier: number;
};

/**
 * Score a single contribution.
 *  base       = raw amount
 *  streakBonus= 5%/day, capped at 50%
 *  targetMult = 1.2 if today's target hit, else 1.0
 *  multiplied by sprint themeMultiplier
 */
export function scoreContribution({
  amount,
  streakDays,
  hitTarget,
  themeMultiplier,
}: ScoreInput): number {
  const base = amount;
  const streakBonus = Math.min(0.5, 0.05 * Math.max(0, streakDays));
  const targetMult = hitTarget ? 1.2 : 1.0;
  return base * (1 + streakBonus) * targetMult * themeMultiplier;
}

/** Round to 2 decimals for display/storage. */
export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
