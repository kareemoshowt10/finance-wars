import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const goal = await prisma.goal.findUnique({ where: { id: params.id } });
  if (!goal || goal.userId !== r.user.id) return bad("Not found", 404);

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
  const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
  const monthsAtCurrent = monthlySavings > 0 ? remaining / monthlySavings : Infinity;
  const eta = isFinite(monthsAtCurrent)
    ? new Date(Date.now() + monthsAtCurrent * 30 * 86400_000).toISOString()
    : null;
  const monthsToDeadline = Math.max(
    0.0001,
    (new Date(goal.deadline).getTime() - Date.now()) / (30 * 86400_000)
  );
  const requiredPerMonth = remaining / monthsToDeadline;
  const onTrack = monthlySavings >= requiredPerMonth;
  const shortfall = onTrack ? 0 : requiredPerMonth - monthlySavings;

  return ok({
    monthlySavings: Math.round(monthlySavings * 100) / 100,
    remaining,
    monthsAtCurrent: isFinite(monthsAtCurrent) ? Math.round(monthsAtCurrent * 10) / 10 : null,
    eta,
    requiredPerMonth: Math.round(requiredPerMonth * 100) / 100,
    onTrack,
    shortfall: Math.round(shortfall * 100) / 100,
  });
}
