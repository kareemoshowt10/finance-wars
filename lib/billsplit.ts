import { prisma } from "./prisma";

export type SplitMode = "EQUAL" | "PERCENT" | "INCOME_RATIO" | "FIXED";

export type Member = { userId: string };

export type Share = { userId: string; share: number }; // share is 0..1, sums to ~1.0

export type Balance = { userId: string; net: number };

export type SettlementSuggestion = {
  from: string;
  to: string;
  amount: number;
} | null;

/** Normalize a record so the values sum to 1.0. If sum is 0, fall back to equal split. */
function normalize(weights: Record<string, number>, members: Member[]): Share[] {
  const total = Object.values(weights).reduce((s, n) => s + (Number.isFinite(n) ? Math.max(0, n) : 0), 0);
  if (total <= 0) {
    const n = members.length;
    return members.map((m) => ({ userId: m.userId, share: n > 0 ? 1 / n : 0 }));
  }
  return members.map((m) => ({ userId: m.userId, share: Math.max(0, weights[m.userId] || 0) / total }));
}

/**
 * Compute the per-member share of a bill (0..1, sums to 1).
 * splitConfig schema:
 *   EQUAL     → {} (ignored)
 *   PERCENT   → { userId: percent 0..100 }
 *   FIXED     → { userId: dollarAmount }
 *   INCOME_RATIO → use incomes param; if all zero, fallback to EQUAL
 */
export function computeShares(
  splitMode: SplitMode,
  splitConfig: Record<string, number> | null | undefined,
  members: Member[],
  incomes?: Record<string, number>
): Share[] {
  const cfg = splitConfig || {};
  if (!members.length) return [];

  switch (splitMode) {
    case "EQUAL": {
      const n = members.length;
      return members.map((m) => ({ userId: m.userId, share: 1 / n }));
    }
    case "PERCENT": {
      const w: Record<string, number> = {};
      for (const m of members) w[m.userId] = cfg[m.userId] ?? 0;
      return normalize(w, members);
    }
    case "FIXED": {
      const w: Record<string, number> = {};
      for (const m of members) w[m.userId] = cfg[m.userId] ?? 0;
      return normalize(w, members);
    }
    case "INCOME_RATIO": {
      const inc = incomes || {};
      const w: Record<string, number> = {};
      let any = false;
      for (const m of members) {
        const v = Math.max(0, inc[m.userId] || 0);
        w[m.userId] = v;
        if (v > 0) any = true;
      }
      if (!any) {
        const n = members.length;
        return members.map((m) => ({ userId: m.userId, share: 1 / n }));
      }
      return normalize(w, members);
    }
  }
}

/** Compute net balance per user from all ledger entries in the household.
 *  Positive net = others owe this user. Negative = this user owes others. */
export async function balanceOf(householdId: string): Promise<Balance[]> {
  const entries = await prisma.ledgerEntry.findMany({ where: { householdId } });
  const net: Record<string, number> = {};
  for (const e of entries) {
    // from owes to → from is negative, to is positive
    net[e.fromUserId] = (net[e.fromUserId] || 0) - e.amount;
    net[e.toUserId] = (net[e.toUserId] || 0) + e.amount;
  }
  return Object.entries(net).map(([userId, n]) => ({ userId, net: Math.round(n * 100) / 100 }));
}

/** Suggest a single settlement (works perfectly for 2-person households; for N, returns largest debtor→creditor pair). */
export function suggestSettlement(balances: Balance[]): SettlementSuggestion {
  if (balances.length < 2) return null;
  const sorted = [...balances].sort((a, b) => a.net - b.net);
  const debtor = sorted[0]; // most negative
  const creditor = sorted[sorted.length - 1]; // most positive
  if (!debtor || !creditor) return null;
  if (debtor.net >= -0.01 || creditor.net <= 0.01) return null;
  const amount = Math.min(-debtor.net, creditor.net);
  if (amount < 0.01) return null;
  return {
    from: debtor.userId,
    to: creditor.userId,
    amount: Math.round(amount * 100) / 100,
  };
}

/** Average monthly income for a user over the last 90 days (returns 0 if no income tx). */
export async function avgMonthlyIncome(userId: string): Promise<number> {
  const since = new Date(Date.now() - 90 * 86400000);
  const tx = await prisma.transaction.findMany({
    where: { userId, type: "income", date: { gte: since } },
    select: { amount: true },
  });
  const total = tx.reduce((s, t) => s + t.amount, 0);
  // 90 days ≈ 3 months
  return total / 3;
}

export async function getIncomesForMembers(userIds: string[]): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  await Promise.all(
    userIds.map(async (uid) => {
      out[uid] = await avgMonthlyIncome(uid);
    })
  );
  return out;
}
