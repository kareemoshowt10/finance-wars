import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { monthKey } from "@/lib/utils";

export async function GET() {
  const user = await requireUser();
  if (!user) return bad("Unauthorized", 401);

  const accounts = await prisma.account.findMany({ where: { userId: user.id } });
  const netWorth = accounts.reduce((s, a) => s + (a.type === "credit" ? -a.balance : a.balance), 0);

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

  // Net worth over last 6 months: walk back from current netWorth removing per-month net flow
  const trend: { month: string; netWorth: number }[] = [];
  let runningNet = netWorth;
  // Most recent point first; we will reverse later
  for (let i = 0; i < 6; i++) {
    const periodStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const periodTx = await prisma.transaction.findMany({
      where: { userId: user.id, date: { gte: periodStart, lt: periodEnd } },
    });
    let periodNet = 0;
    for (const t of periodTx) periodNet += t.type === "income" ? t.amount : -t.amount;
    const label = periodStart.toLocaleDateString("en-US", { month: "short" });
    trend.push({ month: label, netWorth: Math.round(runningNet) });
    runningNet -= periodNet;
  }
  trend.reverse();

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
  });
}
