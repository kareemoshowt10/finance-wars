import { prisma } from "./prisma";

export const NOTIFICATION_KINDS = [
  "BUDGET_EXCEEDED",
  "BUDGET_WARNING",
  "GOAL_MILESTONE",
  "GOAL_REACHED",
  "BILL_DUE",
  "LARGE_TX",
  "INSIGHT",
  "HOUSEHOLD_INVITE_RECEIVED",
  "HOUSEHOLD_INVITE_ACCEPTED",
  "BIG_PURCHASE_PENDING",
  "BIG_PURCHASE_APPROVED",
  "BIG_PURCHASE_DENIED",
  "BIG_PURCHASE_EXPIRED",
  "MONEY_DATE_REMINDER",
  "MONEY_DATE_COMPLETED",
  "PACT_CHANGED_AWAITING_SIGNATURE",
  "PACT_FULLY_SIGNED",
  "ALLOWANCE_LOW",
  "BILL_DUE_SOON",
  "BILL_MISSED",
  "SETTLEMENT_SUGGESTED",
  "SETTLEMENT_RECEIVED",
  "DUEL_INVITE_RECEIVED",
  "DUEL_SPRINT_RESULT",
  "DUEL_COMPLETE",
  "DEBT_BOSS_KO",
  "VICE_TAX_HIT",
] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

export async function notify(
  userId: string,
  kind: NotificationKind,
  title: string,
  body: string,
  link: string | null,
  key: string
) {
  try {
    await prisma.notification.create({
      data: { userId, kind, title, body, link: link ?? null, key },
    });
    return true;
  } catch {
    return false;
  }
}

function monthKey(d: Date = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

async function createIfNew(
  userId: string,
  kind: NotificationKind,
  title: string,
  body: string,
  link: string | null,
  key: string
) {
  try {
    await prisma.notification.create({
      data: { userId, kind, title, body, link: link ?? null, key },
    });
    return true;
  } catch {
    return false; // unique violation = dedup
  }
}

/** Check the active month budget for a category and emit warning/exceeded if needed. */
export async function checkBudgetThresholds(userId: string, category: string) {
  const month = monthKey();
  const budget = await prisma.budget.findUnique({
    where: { userId_category_month: { userId, category, month } },
  });
  if (!budget) return;
  const [year, m] = month.split("-").map(Number);
  const start = new Date(year, m - 1, 1);
  const end = new Date(year, m, 1);
  const txs = await prisma.transaction.findMany({
    where: { userId, type: "expense", category, date: { gte: start, lt: end } },
  });
  const spent = txs.reduce((s, t) => s + t.amount, 0);
  if (budget.limit <= 0) return;
  const pct = (spent / budget.limit) * 100;
  if (pct >= 100) {
    await createIfNew(
      userId,
      "BUDGET_EXCEEDED",
      `${category} budget exceeded`,
      `You've spent $${spent.toFixed(0)} of your $${budget.limit.toFixed(0)} ${category} budget.`,
      "/dashboard/budgets",
      `budget:exceeded:${category}:${month}`
    );
  } else if (pct >= 80) {
    await createIfNew(
      userId,
      "BUDGET_WARNING",
      `${category} budget at ${Math.round(pct)}%`,
      `You've used ${Math.round(pct)}% of your $${budget.limit.toFixed(0)} ${category} budget.`,
      "/dashboard/budgets",
      `budget:warning:${category}:${month}`
    );
  }
}

/** Emit goal milestone notifications. Pass previous current amount before update. */
export async function checkGoalMilestones(
  userId: string,
  goalId: string,
  previousAmount: number,
  newAmount: number,
  target: number,
  name: string
) {
  if (target <= 0) return;
  const milestones = [25, 50, 75, 100];
  const prevPct = (previousAmount / target) * 100;
  const newPct = (newAmount / target) * 100;
  for (const m of milestones) {
    if (prevPct < m && newPct >= m) {
      const kind: NotificationKind = m === 100 ? "GOAL_REACHED" : "GOAL_MILESTONE";
      await createIfNew(
        userId,
        kind,
        m === 100 ? `Goal reached: ${name}` : `${m}% of ${name}`,
        m === 100
          ? `You hit your $${target.toFixed(0)} target. Time to celebrate.`
          : `You're ${m}% of the way to your $${target.toFixed(0)} ${name} goal.`,
        "/dashboard/goals",
        `goal:${m}:${goalId}`
      );
    }
  }
}

/** Daily: emit BILL_DUE for recurring nextRunDate in the next 3 days (dedupe per date). */
export async function checkUpcomingBills(userId: string) {
  const now = new Date();
  const soon = new Date(now);
  soon.setDate(now.getDate() + 3);
  const items = await prisma.recurringTransaction.findMany({
    where: { userId, active: true, type: "expense", nextRunDate: { gte: now, lte: soon } },
  });
  for (const r of items) {
    const dk = r.nextRunDate.toISOString().slice(0, 10);
    await createIfNew(
      userId,
      "BILL_DUE",
      `Upcoming: ${r.description}`,
      `$${r.amount.toFixed(2)} due ${dk}.`,
      "/dashboard/recurring",
      `bill:${r.id}:${dk}`
    );
  }
}

/** Check if a single just-created transaction is unusually large vs 90d mean. */
export async function checkLargeTransaction(userId: string, txId: string, amount: number) {
  const ninety = new Date();
  ninety.setDate(ninety.getDate() - 90);
  const txs = await prisma.transaction.findMany({
    where: { userId, type: "expense", date: { gte: ninety } },
    select: { amount: true },
  });
  if (txs.length < 5) return;
  const mean = txs.reduce((s, t) => s + t.amount, 0) / txs.length;
  if (mean > 0 && amount > 2 * mean) {
    await createIfNew(
      userId,
      "LARGE_TX",
      "Unusually large expense",
      `$${amount.toFixed(2)} is over 2× your 90-day average of $${mean.toFixed(0)}.`,
      "/dashboard/transactions",
      `large:${txId}`
    );
  }
}
