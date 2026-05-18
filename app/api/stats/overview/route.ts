import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { monthKey } from "@/lib/utils";
import { backfillSnapshots, upsertTodaySnapshot, dayKey, computeNetWorth } from "@/lib/snapshots";
import { runDue } from "@/lib/recurring";

export async function GET() {
  const user = await requireUser();
  if (!user) return bad("Unauthorized", 401);

  await runDue(user.id);
  await backfillSnapshots(user.id);
  await upsertTodaySnapshot(user.id);

  const netWorth = await computeNetWorth(user.id);
  const accounts = await prisma.account.findMany({ where: { userId: user.id } });

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfNext = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const monthTx = await prisma.transaction.findMany({
    where: { userId: user.id, date: { gte: startOfMonth, lt: startOfNext } },
  });

  let income = 0;
  let spend = 0;
  const byCategory: Record<string, number> = {};
  for (const t of monthTx) {
    if (t.type === "income") income += t.amount;
    else {
      spend += t.amount;
      byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
    }
  }

  const savingsRate = income > 0 ? Math.max(0, ((income - spend) / income) * 100) : 0;

  const topCategories = Object.entries(byCategory)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6);

  const recent = await prisma.transaction.findMany({
    where: { userId: user.id },
    orderBy: { date: "desc" },
    take: 6,
    include: { account: { select: { name: true } } },
  });

  // Real 6-month trend from snapshots (sample monthly from the last 180 days)
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const snaps = await prisma.netWorthSnapshot.findMany({
    where: { userId: user.id, date: { gte: sixMonthsAgo } },
    orderBy: { date: "asc" },
  });
  // build months: pick last snapshot in each month
  const trend: { month: string; netWorth: number }[] = [];
  let lastValue = 0;
  for (let i = 5; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const inMonth = snaps.filter((s) => s.date >= monthStart && s.date < monthEnd);
    let v = inMonth.length ? inMonth[inMonth.length - 1].value : lastValue;
    if (v) lastValue = v;
    else v = lastValue;
    trend.push({
      month: monthStart.toLocaleDateString("en-US", { month: "short" }),
      netWorth: Math.round(v),
    });
  }

  const byType = { checking: 0, savings: 0, credit: 0, investment: 0 };
  for (const a of accounts) {
    if (a.type in byType) byType[a.type as keyof typeof byType] += a.balance;
  }
  const thirtyAgo = new Date(now);
  thirtyAgo.setDate(now.getDate() - 29);
  const recentSnaps = await prisma.netWorthSnapshot.findMany({
    where: { userId: user.id, date: { gte: thirtyAgo } },
    orderBy: { date: "asc" },
  });
  const lastSnapValue = recentSnaps.length > 0 ? recentSnaps[recentSnaps.length - 1].value : netWorth || 1;
  const byAccount = accounts.map((a) => {
    const signed = a.type === "credit" ? -a.balance : a.balance;
    const ratio = lastSnapValue !== 0 ? signed / lastSnapValue : 0;
    const sparkline = recentSnaps.map((s) => Math.round(s.value * ratio * 100) / 100);
    return { id: a.id, name: a.name, type: a.type, balance: a.balance, sparkline };
  });

  return ok({
    netWorth,
    income,
    spend,
    savingsRate,
    topCategories,
    recent,
    trend,
    accountCount: accounts.length,
    month: monthKey(),
    netWorthBreakdown: { byType, byAccount },
  });
}
