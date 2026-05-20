import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FORECAST_CATEGORIES, monthKey, nextMonthKey, previousMonthKey } from "@/lib/predictions";
import PredictionsView from "./PredictionsView";

export const dynamic = "force-dynamic";

export default async function PredictionsPage() {
  const user = await requireUser();
  if (!user) redirect("/login");

  const items = await prisma.prediction.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const thisMonth = monthKey(new Date());
  const lastMonth = previousMonthKey();

  // Hint: last month's average per category for that user, as a baseline.
  const start = new Date();
  start.setMonth(start.getMonth() - 1, 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
  const tx = await prisma.transaction.findMany({
    where: { userId: user.id, type: "expense", date: { gte: start, lt: end } },
  });
  const baseline: Record<string, number> = { TOTAL: 0 };
  for (const t of tx) {
    baseline.TOTAL += t.amount;
    baseline[t.category] = (baseline[t.category] ?? 0) + t.amount;
  }

  return (
    <PredictionsView
      initial={items.map((p) => ({
        id: p.id,
        month: p.month,
        category: p.category,
        forecast: p.forecast,
        actual: p.actual,
        accuracy: p.accuracy,
        xpAwarded: p.xpAwarded,
        scAwarded: p.scAwarded,
        settledAt: p.settledAt?.toISOString() ?? null,
      }))}
      categories={[...FORECAST_CATEGORIES]}
      thisMonth={thisMonth}
      nextMonth={nextMonthKey()}
      lastMonth={lastMonth}
      baseline={baseline}
    />
  );
}
