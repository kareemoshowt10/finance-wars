import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { aggregateMonth, monthBounds } from "@/lib/calendar/aggregate";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month") || new Date().toISOString().slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(month)) return bad("Bad month");

  const { start, end } = monthBounds(month);
  const userId = r.user.id;

  const [transactions, recurring, goals, players] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId, date: { gte: start, lt: end } },
      orderBy: { date: "asc" },
    }),
    prisma.recurringTransaction.findMany({ where: { userId, active: true } }),
    prisma.goal.findMany({ where: { userId } }),
    prisma.duelPlayer.findMany({
      where: { OR: [{ userId }, { inviteEmail: r.user.email }] },
      include: { duel: { include: { sprints: true } } },
    }),
  ]);

  const seenDuel = new Set<string>();
  const duels: { id: string; title: string; endDate: Date }[] = [];
  const sprints: { id: string; duelId: string; startDate: Date; endDate: Date; weekNumber: number }[] = [];
  for (const p of players) {
    const d = p.duel;
    if (seenDuel.has(d.id)) continue;
    seenDuel.add(d.id);
    if (d.status === "ACTIVE" || d.status === "PENDING") {
      duels.push({ id: d.id, title: d.title, endDate: d.endDate });
      for (const s of d.sprints) sprints.push({ id: s.id, duelId: d.id, startDate: s.startDate, endDate: s.endDate, weekNumber: s.weekNumber });
    }
  }

  const entries = aggregateMonth({
    month,
    transactions: transactions.map((t) => ({ id: t.id, amount: t.amount, type: t.type, description: t.description, date: t.date })),
    recurring: recurring.map((r) => ({ id: r.id, amount: r.amount, type: r.type, description: r.description, category: r.category, frequency: r.frequency, nextRunDate: r.nextRunDate, active: r.active })),
    sprints,
    duels,
    goals: goals.map((g) => ({ id: g.id, name: g.name, deadline: g.deadline })),
  });

  return ok({ month, entries });
}
