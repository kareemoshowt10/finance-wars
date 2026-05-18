import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";

export async function GET(req: NextRequest) {
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const since = new Date();
  since.setDate(since.getDate() - 90);
  const txs = await prisma.transaction.findMany({
    where: { userId: r.user.id, date: { gte: since } },
  });
  let income = 0, expense = 0;
  for (const t of txs) {
    if (t.type === "income") income += t.amount;
    else expense += t.amount;
  }
  const monthlySavings = ((income - expense) / 90) * 30;

  const snaps = await prisma.netWorthSnapshot.findMany({
    where: { userId: r.user.id },
    orderBy: { date: "asc" },
  });
  const currentNetWorth = snaps.length ? snaps[snaps.length - 1].value : 0;

  // Linear regression on last 90 days
  const ninetyAgo = new Date();
  ninetyAgo.setDate(ninetyAgo.getDate() - 90);
  const recent = snaps.filter((s) => s.date >= ninetyAgo);
  let slope = monthlySavings / 30; // fallback (per day)
  if (recent.length > 1) {
    const xs = recent.map((_, i) => i);
    const ys = recent.map((s) => s.value);
    const n = xs.length;
    const sumX = xs.reduce((s, x) => s + x, 0);
    const sumY = ys.reduce((s, y) => s + y, 0);
    const sumXY = xs.reduce((s, x, i) => s + x * ys[i], 0);
    const sumX2 = xs.reduce((s, x) => s + x * x, 0);
    slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX || 1);
  }

  // Project 12 months
  const projection: { date: string; value: number }[] = [];
  for (let m = 1; m <= 12; m++) {
    const d = new Date();
    d.setMonth(d.getMonth() + m);
    projection.push({
      date: d.toISOString().slice(0, 10),
      value: Math.round(currentNetWorth + slope * 30 * m),
    });
  }

  const nextMilestone = Math.ceil(currentNetWorth / 10000) * 10000 + 10000;
  const toMilestone = nextMilestone - currentNetWorth;
  const monthsToMilestone = monthlySavings > 0 ? toMilestone / monthlySavings : null;

  return ok({
    currentNetWorth,
    monthlySavings: Math.round(monthlySavings * 100) / 100,
    projection,
    nextMilestone,
    monthsToMilestone: monthsToMilestone !== null ? Math.round(monthsToMilestone * 10) / 10 : null,
  });
}
