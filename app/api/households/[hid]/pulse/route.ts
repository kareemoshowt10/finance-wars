import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { assertMember, getHouseholdMembers } from "@/lib/household";
import { buildLeaderboard, isChoreDue } from "@/lib/chores";
import { summarizeBankPosition } from "@/lib/loans";
import { goalProgressPct, isNeglected, rankCompetingGoals } from "@/lib/householdGoals";

export const dynamic = "force-dynamic";

/**
 * One call that feeds the Household HQ dashboard: today's chores, the bank's
 * book, and where the shared goals stand — everything needed to answer "are
 * we actually pulling together this week?" at a glance.
 */
export async function GET(req: NextRequest, { params }: { params: { hid: string } }) {
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const fb = await assertMember(r.user.id, params.hid);
  if (fb) return fb;

  const since7d = new Date(Date.now() - 7 * 86400000);
  const [members, chores, weekCompletions, loans, goals] = await Promise.all([
    getHouseholdMembers(params.hid),
    prisma.chore.findMany({ where: { householdId: params.hid, active: true } }),
    prisma.choreCompletion.findMany({
      where: { householdId: params.hid, completedAt: { gte: since7d } },
      select: { choreId: true, userId: true, crownsAwarded: true, xpAwarded: true, completedAt: true },
    }),
    prisma.loan.findMany({ where: { householdId: params.hid, status: "ACTIVE" } }),
    prisma.householdGoal.findMany({
      where: { householdId: params.hid, status: "ACTIVE" },
      include: { _count: { select: { votes: true } } },
    }),
  ]);

  const memberList = members
    .filter((m) => m.userId)
    .map((m) => ({ userId: m.userId as string, name: m.user?.name || "Member" }));

  const lastByChore = new Map<string, Date>();
  for (const c of weekCompletions) {
    const cur = lastByChore.get(c.choreId);
    if (!cur || c.completedAt > cur) lastByChore.set(c.choreId, c.completedAt);
  }
  const dueToday = chores.filter((c) => isChoreDue(c.frequency, lastByChore.get(c.id) ?? null));

  const leaderboard = buildLeaderboard(weekCompletions, memberList).slice(0, 5);

  const bankPosition = summarizeBankPosition(loans);
  const totalOutstanding = loans.reduce((s, l) => s + l.balanceRemaining, 0);

  const electiveGoals = goals.filter((g) => g.category === "ELECTIVE");
  const ranked = rankCompetingGoals(
    electiveGoals.map((g) => ({ id: g.id, votes: g._count.votes, targetAmount: g.targetAmount, currentAmount: g.currentAmount }))
  );
  const topElective = ranked[0]
    ? { ...electiveGoals.find((g) => g.id === ranked[0].id)!, pct: ranked[0].pct, votes: ranked[0].votes }
    : null;

  const neglectedEssentials = goals.filter((g) => g.category === "ESSENTIAL" && isNeglected(g));

  return ok({
    members: memberList,
    chores: { total: chores.length, dueToday: dueToday.length, dueTodayList: dueToday.map((c) => ({ id: c.id, name: c.name, emoji: c.emoji })) },
    leaderboard,
    bank: { totalOutstanding: Math.round(totalOutstanding * 100) / 100, activeLoans: loans.length, position: bankPosition },
    goals: {
      active: goals.length,
      topElective: topElective
        ? { id: topElective.id, name: topElective.name, emoji: topElective.emoji, pct: topElective.pct, votes: topElective.votes, targetAmount: topElective.targetAmount, currentAmount: topElective.currentAmount }
        : null,
      neglectedEssentials: neglectedEssentials.map((g) => ({
        id: g.id,
        name: g.name,
        emoji: g.emoji,
        pct: goalProgressPct(g.targetAmount, g.currentAmount),
      })),
    },
  });
}
