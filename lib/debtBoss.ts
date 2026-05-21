import { prisma } from "./prisma";

const DEBT_TYPES = new Set(["credit", "loan", "credit_card", "mortgage", "student_loan"]);

export type DebtBoss = {
  accountId: string;
  name: string;
  type: string;
  hp: number;
  maxHp: number;
  hpPct: number;
  apr: number | null;
  monthlyInterestCost: number;
  projectedInterest6mo: number;
  daysSinceLastAttack: number | null;
  neglected: boolean;
  dps30: number;
  attacks30: number;
  biggestHit: number;
  attackStreakMonths: number;
  lastAttackAt: string | null;
  etaMonths: number | null;
  defeated: boolean;
};

export type DebtStrategy = {
  avalancheTargetId: string | null;
  snowballTargetId: string | null;
  recommended: "avalanche" | "snowball" | null;
  reason: string;
};

export function isDebtAccount(type: string) {
  return DEBT_TYPES.has(type.toLowerCase());
}

export async function getDebtBosses(userId: string): Promise<DebtBoss[]> {
  const accts = await prisma.account.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });
  const debts = accts.filter((a) => isDebtAccount(a.type));
  if (debts.length === 0) return [];

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [recent, all] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId, accountId: { in: debts.map((d) => d.id) }, date: { gte: since } },
      orderBy: { date: "desc" },
    }),
    prisma.transaction.findMany({
      where: { userId, accountId: { in: debts.map((d) => d.id) } },
      orderBy: { date: "asc" },
    }),
  ]);

  return debts.map((a) => {
    const acctTxs = all.filter((t) => t.accountId === a.id);

    // Reconstruct peak debt balance from full history.
    let running = 0;
    let peakNegative = 0;
    for (const t of acctTxs) {
      running += t.type === "income" ? t.amount : -t.amount;
      if (running < peakNegative) peakNegative = running;
    }

    const hp = Math.max(0, -a.balance);
    const maxHp = Math.max(hp, -peakNegative);

    // APR and monthly interest cost.
    const apr = (a as unknown as { interestRate?: number | null }).interestRate ?? null;
    const monthlyInterestCost = apr && hp > 0 ? Math.round(hp * (apr / 100 / 12) * 100) / 100 : 0;

    // 30-day attack stats.
    const acctRecent = recent.filter((t) => t.accountId === a.id && t.type === "income");
    const dps30 = acctRecent.reduce((s, t) => s + t.amount, 0);
    const attacks30 = acctRecent.length;

    // Compound projection over 6 months assuming current monthly DPS continues.
    let projected = 0;
    if (apr && hp > 0) {
      const monthlyRate = apr / 100 / 12;
      let bal = hp;
      for (let i = 0; i < 6 && bal > 0; i++) {
        const interest = bal * monthlyRate;
        projected += interest;
        bal = Math.max(0, bal + interest - dps30);
      }
    }
    const projectedInterest6mo = Math.round(projected * 100) / 100;
    const lastAllAttack = [...all].reverse().find((t) => t.accountId === a.id && t.type === "income");
    const lastAttackAt = lastAllAttack?.date.toISOString() ?? null;
    const daysSinceLastAttack = lastAllAttack
      ? Math.floor((Date.now() - lastAllAttack.date.getTime()) / 86_400_000)
      : null;
    const etaMonths = dps30 > 0 && hp > 0 ? Math.ceil(hp / dps30) : null;

    // All-time stats.
    const allAttacks = acctTxs.filter((t) => t.type === "income");
    const biggestHit = allAttacks.reduce((m, t) => Math.max(m, t.amount), 0);

    // Attack streak: consecutive calendar months with at least one payment.
    const monthsWithAttacks = new Set(
      allAttacks.map((t) => `${t.date.getFullYear()}-${t.date.getMonth()}`)
    );
    let streak = 0;
    const cur = new Date();
    cur.setDate(1);
    while (monthsWithAttacks.has(`${cur.getFullYear()}-${cur.getMonth()}`)) {
      streak++;
      cur.setMonth(cur.getMonth() - 1);
    }

    return {
      accountId: a.id,
      name: a.name,
      type: a.type,
      hp: Math.round(hp * 100) / 100,
      maxHp: Math.round(maxHp * 100) / 100,
      hpPct: maxHp > 0 ? Math.max(0, Math.min(1, hp / maxHp)) : 0,
      apr,
      monthlyInterestCost,
      projectedInterest6mo,
      daysSinceLastAttack,
      neglected: hp > 0 && (daysSinceLastAttack == null || daysSinceLastAttack >= 30),
      dps30: Math.round(dps30 * 100) / 100,
      attacks30,
      biggestHit: Math.round(biggestHit * 100) / 100,
      attackStreakMonths: streak,
      lastAttackAt,
      etaMonths,
      defeated: hp <= 0.01,
    };
  });
}

export function pickStrategy(bosses: DebtBoss[]): DebtStrategy {
  const alive = bosses.filter((b) => !b.defeated);
  if (alive.length === 0) {
    return { avalancheTargetId: null, snowballTargetId: null, recommended: null, reason: "All bosses defeated." };
  }

  // Avalanche: if APRs known, highest APR first; otherwise highest HP.
  const hasApr = alive.some((b) => b.apr != null);
  const avalanche = hasApr
    ? [...alive].sort((a, b) => (b.apr ?? 0) - (a.apr ?? 0))[0]
    : [...alive].sort((a, b) => b.hp - a.hp)[0];

  // Snowball: smallest balance first.
  const snowball = [...alive].sort((a, b) => a.hp - b.hp)[0];

  const totalHp = alive.reduce((s, b) => s + b.hp, 0);
  const snowballShare = snowball.hp / totalHp;

  const recommended: "avalanche" | "snowball" =
    snowballShare < 0.25 && alive.length > 1 ? "snowball" : "avalanche";

  const reason =
    recommended === "snowball"
      ? `Knock out ${snowball.name} first — it's only ${Math.round(snowballShare * 100)}% of your total debt and will give you a fast psychological win.`
      : hasApr
        ? `Target ${avalanche.name} — at ${avalanche.apr}% APR it's costing you ${avalanche.monthlyInterestCost > 0 ? `$${avalanche.monthlyInterestCost.toFixed(0)}/mo` : "the most"} in interest.`
        : `Pound ${avalanche.name} hardest — it's your biggest balance and likely your biggest interest drain.`;

  return { avalancheTargetId: avalanche.accountId, snowballTargetId: snowball.accountId, recommended, reason };
}
