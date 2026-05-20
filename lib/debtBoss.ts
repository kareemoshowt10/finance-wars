import { prisma } from "./prisma";

const DEBT_TYPES = new Set(["credit", "loan", "credit_card", "mortgage", "student_loan"]);

export type DebtBoss = {
  accountId: string;
  name: string;
  type: string;
  hp: number;
  maxHp: number;
  hpPct: number;
  dps30: number;
  attacks30: number;
  lastAttackAt: string | null;
  etaMonths: number | null;
  defeated: boolean;
};

export function isDebtAccount(type: string) {
  return DEBT_TYPES.has(type.toLowerCase());
}

export async function getDebtBosses(userId: string): Promise<DebtBoss[]> {
  const accts = await prisma.account.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
  const debts = accts.filter((a) => isDebtAccount(a.type));
  if (debts.length === 0) return [];

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recent = await prisma.transaction.findMany({
    where: { userId, accountId: { in: debts.map((d) => d.id) }, date: { gte: since } },
    orderBy: { date: "desc" },
  });

  // For peak HP, look at full history and reconstruct.
  const all = await prisma.transaction.findMany({
    where: { userId, accountId: { in: debts.map((d) => d.id) } },
    orderBy: { date: "asc" },
  });

  return debts.map((a) => {
    const acctTxs = all.filter((t) => t.accountId === a.id);
    // Reconstruct historical balance: balance now = a.balance. Walk forward from 0 using deltas.
    // Each tx delta: income -> +amount, expense -> -amount.
    let running = 0;
    let peakNegative = 0;
    for (const t of acctTxs) {
      const delta = t.type === "income" ? t.amount : -t.amount;
      running += delta;
      if (running < peakNegative) peakNegative = running;
    }
    // For debt, balance is negative or zero. HP = |current balance|.
    const hp = Math.max(0, -a.balance);
    const maxHp = Math.max(hp, -peakNegative, hp);

    const acctRecent = recent.filter((t) => t.accountId === a.id && t.type === "income");
    const dps30 = acctRecent.reduce((s, t) => s + t.amount, 0);
    const attacks30 = acctRecent.length;
    const lastAttackAt = acctRecent[0]?.date.toISOString() ?? null;
    const etaMonths = dps30 > 0 && hp > 0 ? Math.ceil(hp / dps30) : null;

    return {
      accountId: a.id,
      name: a.name,
      type: a.type,
      hp: Math.round(hp * 100) / 100,
      maxHp: Math.round(maxHp * 100) / 100,
      hpPct: maxHp > 0 ? Math.max(0, Math.min(1, hp / maxHp)) : 0,
      dps30: Math.round(dps30 * 100) / 100,
      attacks30,
      lastAttackAt,
      etaMonths,
      defeated: hp <= 0.01,
    };
  });
}
