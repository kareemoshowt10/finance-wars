import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { assertMember, getHouseholdMembers } from "@/lib/household";
import { buildLeaderboard, mostFrequentDoer } from "@/lib/chores";
import { planIncludes } from "@/lib/plans";

export const dynamic = "force-dynamic";

const RANGE_DAYS: Record<string, number> = { week: 7, month: 30, all: 36500 };

export async function GET(req: NextRequest, { params }: { params: { hid: string } }) {
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const fb = await assertMember(r.user.id, params.hid);
  if (fb) return fb;

  let range = req.nextUrl.searchParams.get("range") || "week";
  if (range !== "week") {
    const household = await prisma.household.findUnique({ where: { id: params.hid }, select: { plan: true } });
    if (!planIncludes(household?.plan ?? "free", "full_history")) range = "week";
  }
  const days = RANGE_DAYS[range] ?? RANGE_DAYS.week;
  const since = new Date(Date.now() - days * 86400000);

  const [completions, members, chores] = await Promise.all([
    prisma.choreCompletion.findMany({
      where: { householdId: params.hid, completedAt: { gte: since } },
      select: { choreId: true, userId: true, crownsAwarded: true, xpAwarded: true, completedAt: true },
    }),
    getHouseholdMembers(params.hid),
    prisma.chore.findMany({ where: { householdId: params.hid }, select: { id: true, name: true, emoji: true } }),
  ]);

  const memberList = members
    .filter((m) => m.userId)
    .map((m) => ({ userId: m.userId as string, name: m.user?.name || "Member" }));

  const leaderboard = buildLeaderboard(completions, memberList);

  // "Who does the dishes most" style breakdown, per chore.
  const perChore = chores.map((c) => ({
    choreId: c.id,
    name: c.name,
    emoji: c.emoji,
    doneBy: mostFrequentDoer(completions, c.id).map((d) => ({
      ...d,
      name: memberList.find((m) => m.userId === d.userId)?.name || "Member",
    })),
  }));

  return ok({ range, leaderboard, perChore });
}
