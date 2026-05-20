import { prisma } from "./prisma";
import { award } from "./wallet";

export const FORECAST_CATEGORIES = ["TOTAL", "Dining", "Groceries", "Transportation", "Shopping", "Entertainment"] as const;

export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function previousMonthKey(d = new Date()): string {
  const prev = new Date(d.getFullYear(), d.getMonth() - 1, 1);
  return monthKey(prev);
}

export function nextMonthKey(d = new Date()): string {
  const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  return monthKey(next);
}

export function computeAccuracy(forecast: number, actual: number): number {
  if (actual <= 0 && forecast <= 0) return 100;
  if (forecast <= 0 || actual <= 0) return 0;
  const errorPct = Math.abs(forecast - actual) / Math.max(forecast, actual);
  return Math.max(0, Math.round((1 - errorPct) * 100));
}

export function rewardForAccuracy(accuracy: number): { xp: number; sc: number } {
  if (accuracy >= 95) return { xp: 200, sc: 50 };
  if (accuracy >= 85) return { xp: 100, sc: 25 };
  if (accuracy >= 70) return { xp: 50, sc: 10 };
  if (accuracy >= 50) return { xp: 20, sc: 5 };
  return { xp: 5, sc: 0 };
}

export async function settleMonth(month: string) {
  const [year, mon] = month.split("-").map(Number);
  const start = new Date(year, mon - 1, 1);
  const end = new Date(year, mon, 1);

  const predictions = await prisma.prediction.findMany({
    where: { month, settledAt: null },
  });
  if (predictions.length === 0) return { settled: 0 };

  const userIds = Array.from(new Set(predictions.map((p) => p.userId)));
  const tx = await prisma.transaction.findMany({
    where: { userId: { in: userIds }, type: "expense", date: { gte: start, lt: end } },
  });

  const totalsByUser: Record<string, { TOTAL: number } & Record<string, number>> = {};
  for (const t of tx) {
    if (!totalsByUser[t.userId]) totalsByUser[t.userId] = { TOTAL: 0 };
    totalsByUser[t.userId].TOTAL += t.amount;
    totalsByUser[t.userId][t.category] = (totalsByUser[t.userId][t.category] ?? 0) + t.amount;
  }

  let settled = 0;
  for (const p of predictions) {
    const actual = totalsByUser[p.userId]?.[p.category] ?? 0;
    const accuracy = computeAccuracy(p.forecast, actual);
    const { xp, sc } = rewardForAccuracy(accuracy);
    await prisma.prediction.update({
      where: { id: p.id },
      data: { actual, accuracy, xpAwarded: xp, scAwarded: sc, settledAt: new Date() },
    });
    if (xp > 0) {
      await prisma.user.update({ where: { id: p.userId }, data: { xp: { increment: xp } } });
    }
    if (sc > 0) {
      await award({
        userId: p.userId,
        currency: "SC",
        delta: sc,
        reason: "GOAL_MILESTONE",
        refType: "Prediction",
        refId: p.id,
        meta: { month, category: p.category, accuracy },
      });
    }
    settled++;
  }
  return { settled };
}
