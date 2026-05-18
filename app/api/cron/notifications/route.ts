import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyCron } from "@/lib/cron";
import { checkBudgetThresholds, checkGoalMilestones, checkUpcomingBills } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const fail = verifyCron(req);
  if (fail) return fail;
  const users = await prisma.user.findMany({ select: { id: true } });
  let processed = 0;

  const month = new Date();
  const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;

  for (const u of users) {
    try {
      const budgets = await prisma.budget.findMany({ where: { userId: u.id, month: monthKey } });
      for (const b of budgets) await checkBudgetThresholds(u.id, b.category);

      const goals = await prisma.goal.findMany({ where: { userId: u.id } });
      for (const g of goals) {
        await checkGoalMilestones(u.id, g.id, g.currentAmount, g.currentAmount, g.targetAmount, g.name);
      }

      await checkUpcomingBills(u.id);
      processed++;
    } catch {}
  }
  return NextResponse.json({ ok: true, processed });
}
