import { prisma } from "./prisma";
import { award } from "./wallet";
import { notify } from "./notifications";
import { isDebtAccount } from "./debtBoss";
import { evaluate as evalAch } from "./achievements/engine";

const KO_KEY = "debtboss:ko:";

export async function checkDebtKO(userId: string, accountId: string) {
  const acct = await prisma.account.findUnique({ where: { id: accountId } });
  if (!acct || acct.userId !== userId) return;
  if (!isDebtAccount(acct.type)) return;
  if (acct.balance < -0.01) return; // not defeated yet

  const ref = `${KO_KEY}${accountId}`;
  const existing = await prisma.walletEntry.findFirst({
    where: { userId, refType: "DebtBoss", refId: accountId },
  }).catch(() => null);
  if (existing) return;

  await award({
    userId,
    currency: "KARMA",
    delta: 100,
    reason: "GOAL_MILESTONE",
    refType: "DebtBoss",
    refId: accountId,
    meta: { kind: "ko", name: acct.name },
  });
  await notify(
    userId,
    "DEBT_BOSS_KO",
    `KO! ${acct.name} defeated`,
    `You crushed ${acct.name}. +100 Karma earned.`,
    "/dashboard/debt",
    ref
  );

  const debts = await prisma.account.findMany({ where: { userId } });
  const remaining = debts.filter((a) => isDebtAccount(a.type) && a.balance < -0.01).length;
  evalAch(userId, { type: "debt-ko", remainingBosses: remaining }).catch(() => {});
}

export async function recordDebtAttack(userId: string, accountId: string) {
  const acct = await prisma.account.findUnique({ where: { id: accountId } });
  if (!acct || acct.userId !== userId || !isDebtAccount(acct.type)) return;
  const txs = await prisma.transaction.findMany({
    where: { userId, accountId, type: "income" },
    select: { date: true },
  });
  const months = new Set(txs.map((t) => `${t.date.getFullYear()}-${t.date.getMonth()}`));
  let streak = 0;
  const cur = new Date();
  cur.setDate(1);
  while (months.has(`${cur.getFullYear()}-${cur.getMonth()}`)) {
    streak++;
    cur.setMonth(cur.getMonth() - 1);
  }
  if (streak > 0) {
    evalAch(userId, { type: "debt-streak", months: streak }).catch(() => {});
  }
}
