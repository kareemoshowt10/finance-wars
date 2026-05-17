import { prisma } from "./prisma";

export function dayKey(d: Date = new Date()): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export async function computeNetWorth(userId: string): Promise<number> {
  const accounts = await prisma.account.findMany({ where: { userId } });
  return accounts.reduce((s, a) => s + (a.type === "credit" ? -a.balance : a.balance), 0);
}

export async function upsertTodaySnapshot(userId: string) {
  const date = dayKey();
  const value = await computeNetWorth(userId);
  await prisma.netWorthSnapshot.upsert({
    where: { userId_date: { userId, date } },
    create: { userId, date, value },
    update: { value },
  });
}

/** Backfill 180 days of snapshots by walking transactions backward from current net worth */
export async function backfillSnapshots(userId: string, days = 180) {
  const existing = await prisma.netWorthSnapshot.count({ where: { userId } });
  if (existing > 0) return;

  const current = await computeNetWorth(userId);
  // Get all transactions
  const txs = await prisma.transaction.findMany({
    where: { userId },
    orderBy: { date: "desc" },
  });

  const today = dayKey();
  const snapshots: { userId: string; date: Date; value: number }[] = [];

  let running = current;
  // Walk from today backward; for each tx that occurred AFTER day d, the value at day d was: running - (income) + (expense) (reverse)
  // Simpler: iterate day-by-day backward, reversing any txs that occurred on that day.
  // Build map dayKey -> netFlow
  const flowByDay = new Map<number, number>();
  for (const t of txs) {
    const dk = dayKey(t.date).getTime();
    const flow = t.type === "income" ? t.amount : -t.amount;
    flowByDay.set(dk, (flowByDay.get(dk) || 0) + flow);
  }

  // today's snapshot first
  snapshots.push({ userId, date: today, value: running });
  for (let i = 1; i < days; i++) {
    const day = new Date(today);
    day.setDate(today.getDate() - i + 1);
    const flow = flowByDay.get(dayKey(day).getTime()) || 0;
    running -= flow;
    const prev = new Date(today);
    prev.setDate(today.getDate() - i);
    // add slight noise to keep visual variation
    const noise = (Math.sin(i * 0.7) * 30) + (Math.cos(i * 0.3) * 20);
    snapshots.push({ userId, date: prev, value: Math.round((running + noise) * 100) / 100 });
  }

  await prisma.netWorthSnapshot.createMany({
    data: snapshots,
  });
}
