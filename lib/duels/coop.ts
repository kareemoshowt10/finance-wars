/** Co-op Quest scoring helpers (companion to lib/duels/scoring.ts).
 *  In COOP mode, both players contribute to a single combined pool;
 *  sprint wins happen when the combined contributions hit `sprintTarget`.
 */

export type CoopContribution = {
  playerId: string;
  amount: number;
  disputeStatus?: string | null;
};

export function combinedPoints(contributions: CoopContribution[]): number {
  return contributions
    .filter((c) => c.disputeStatus !== "PENDING" && c.disputeStatus !== "CONCEDED")
    .reduce((s, c) => s + c.amount, 0);
}

export function sprintCombined(contributions: CoopContribution[]): number {
  return combinedPoints(contributions);
}

export function sprintHit(contributions: CoopContribution[], sprintTarget: number): boolean {
  if (sprintTarget <= 0) return false;
  return combinedPoints(contributions) >= sprintTarget;
}

export function progressPct(contributions: CoopContribution[], target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((combinedPoints(contributions) / target) * 100));
}

export function perPlayerBreakdown(contributions: CoopContribution[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const c of contributions) {
    if (c.disputeStatus === "PENDING" || c.disputeStatus === "CONCEDED") continue;
    out[c.playerId] = (out[c.playerId] || 0) + c.amount;
  }
  return out;
}

/** Default per-sprint combined target if not set explicitly. */
export function defaultSprintTarget(totalTargetAmount: number, numSprints: number): number {
  if (numSprints <= 0) return totalTargetAmount;
  return Math.round((totalTargetAmount / numSprints) * 100) / 100;
}
