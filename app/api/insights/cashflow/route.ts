import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { advanceDate } from "@/lib/recurring";

function dayKey(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export async function GET(req: NextRequest) {
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);

  const today = dayKey(new Date());
  const horizon = 90;
  const end = new Date(today);
  end.setDate(today.getDate() + horizon);

  // Liquid balance from checking + savings
  const accounts = await prisma.account.findMany({ where: { userId: r.user.id } });
  const liquid = accounts.reduce((s, a) => s + (a.type === "checking" || a.type === "savings" ? a.balance : 0), 0);

  // Average daily non-recurring expense over last 90 days
  const ninetyAgo = new Date(today);
  ninetyAgo.setDate(today.getDate() - 90);
  const txs = await prisma.transaction.findMany({
    where: { userId: r.user.id, type: "expense", date: { gte: ninetyAgo, lt: today } },
  });
  const baselineDailyExpense = txs.length > 0 ? txs.reduce((s, t) => s + t.amount, 0) / 90 : 0;

  // Project recurring forward
  const recurring = await prisma.recurringTransaction.findMany({
    where: { userId: r.user.id, active: true },
  });
  const events: { date: Date; amount: number; type: string; description: string; category: string }[] = [];
  for (const rec of recurring) {
    let next = new Date(rec.nextRunDate);
    // skip past
    while (next < today) next = advanceDate(next, rec.frequency);
    while (next <= end) {
      events.push({ date: dayKey(next), amount: rec.amount, type: rec.type, description: rec.description, category: rec.category });
      next = advanceDate(next, rec.frequency);
    }
  }

  // Build daily series
  const series: { date: string; projectedBalance: number; scheduledIncome: number; scheduledExpense: number }[] = [];
  let balance = liquid;
  let totalIncome = 0;
  let totalExpense = 0;
  let lowPoint = balance;
  let lowDate = today.toISOString().slice(0, 10);

  for (let i = 0; i <= horizon; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dk = dayKey(d).getTime();
    let dayIncome = 0;
    let dayExpense = 0;
    for (const e of events) {
      if (e.date.getTime() === dk) {
        if (e.type === "income") dayIncome += e.amount;
        else dayExpense += e.amount;
      }
    }
    if (i > 0) {
      balance += dayIncome - dayExpense - baselineDailyExpense;
    }
    totalIncome += dayIncome;
    totalExpense += dayExpense;
    if (balance < lowPoint) {
      lowPoint = balance;
      lowDate = d.toISOString().slice(0, 10);
    }
    series.push({
      date: d.toISOString().slice(0, 10),
      projectedBalance: Math.round(balance * 100) / 100,
      scheduledIncome: Math.round(dayIncome * 100) / 100,
      scheduledExpense: Math.round(dayExpense * 100) / 100,
    });
  }

  const upcoming = events
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((e) => ({
      date: e.date.toISOString().slice(0, 10),
      amount: e.amount,
      type: e.type,
      description: e.description,
      category: e.category,
    }));

  return ok({
    series,
    upcoming,
    summary: {
      startBalance: liquid,
      lowPoint: Math.round(lowPoint * 100) / 100,
      lowDate,
      totalScheduledIncome: Math.round(totalIncome * 100) / 100,
      totalScheduledExpense: Math.round(totalExpense * 100) / 100,
      endBalance: series[series.length - 1]?.projectedBalance ?? liquid,
      baselineDailyExpense: Math.round(baselineDailyExpense * 100) / 100,
    },
  });
}
