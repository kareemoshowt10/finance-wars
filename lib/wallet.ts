import { prisma } from "./prisma";

export type Currency = "TP" | "SC" | "SHARD" | "KARMA" | "CROWNS";

export type WalletReason =
  | "CONFESSION_HONEST"
  | "PARTNER_VERIFY"
  | "PACT_KEPT"
  | "PACT_BROKEN"
  | "REVIEW_APPROVED"
  | "REVIEW_HONEST_FLAG"
  | "CHEER_GIVEN"
  | "CHEER_RECEIVED"
  | "REFERRAL"
  | "GOAL_MILESTONE"
  | "SPRINT_WIN"
  | "STREAK_BONUS"
  | "MARKETPLACE_SPEND"
  | "ADMIN_GRANT"
  | "DECAY"
  | "CHORE_COMPLETED"
  | "GOAL_CONTRIBUTION";

export type AwardInput = {
  userId: string;
  currency: Currency;
  delta: number;
  reason: WalletReason;
  refType?: string;
  refId?: string;
  fromUserId?: string;
  householdId?: string;
  meta?: Record<string, unknown>;
};

export async function award(input: AwardInput) {
  if (input.delta === 0) return null;
  return prisma.walletEntry.create({
    data: {
      userId: input.userId,
      currency: input.currency,
      delta: Math.trunc(input.delta),
      reason: input.reason,
      refType: input.refType,
      refId: input.refId,
      fromUserId: input.fromUserId,
      householdId: input.householdId,
      meta: input.meta as never,
    },
  });
}

export async function getBalance(userId: string, currency: Currency): Promise<number> {
  const result = await prisma.walletEntry.aggregate({
    where: { userId, currency },
    _sum: { delta: true },
  });
  return result._sum.delta ?? 0;
}

export async function getBalances(userId: string): Promise<Record<Currency, number>> {
  const rows = await prisma.walletEntry.groupBy({
    by: ["currency"],
    where: { userId },
    _sum: { delta: true },
  });
  const out: Record<Currency, number> = { TP: 0, SC: 0, SHARD: 0, KARMA: 0, CROWNS: 0 };
  for (const r of rows) {
    const c = r.currency as Currency;
    if (c in out) out[c] = r._sum.delta ?? 0;
  }
  out.KARMA = computeKarma(out);
  return out;
}

export function computeKarma(b: Record<Currency, number>): number {
  return Math.max(0, Math.round(b.TP * 1.5 + b.SC * 0.5));
}

export async function spend(
  userId: string,
  currency: Currency,
  cost: number,
  ref: { refType: string; refId: string; meta?: Record<string, unknown> }
) {
  if (cost <= 0) throw new Error("Cost must be positive");
  const balance = await getBalance(userId, currency);
  if (balance < cost) throw new Error("INSUFFICIENT_BALANCE");
  return award({
    userId,
    currency,
    delta: -cost,
    reason: "MARKETPLACE_SPEND",
    refType: ref.refType,
    refId: ref.refId,
    meta: ref.meta,
  });
}

export async function recentLedger(userId: string, limit = 50) {
  return prisma.walletEntry.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { from: { select: { id: true, name: true } } },
  });
}

export async function householdTrustLedger(householdId: string, limit = 100) {
  return prisma.walletEntry.findMany({
    where: { householdId, currency: "TP" },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      user: { select: { id: true, name: true } },
      from: { select: { id: true, name: true } },
    },
  });
}

export const REWARDS = {
  CONFESSION_HONEST: 25,
  PARTNER_VERIFY: 10,
  PACT_KEPT: 15,
  PACT_BROKEN: -20,
  REVIEW_APPROVED: 5,
  REVIEW_HONEST_FLAG: 20,
  CHEER_GIVEN: 2,
  CHEER_RECEIVED: 1,
  REFERRAL: 100,
  GOAL_MILESTONE: 50,
  SPRINT_WIN: 30,
  STREAK_BONUS: 3,
} as const;
