import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { assertMember } from "@/lib/household";
import { assertWithinLimit } from "@/lib/planEnforcement";
import { isNeglected, rankCompetingGoals } from "@/lib/householdGoals";
import { evaluate } from "@/lib/achievements/engine";
import { log } from "@/lib/audit";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  name: z.string().min(1).max(80),
  emoji: z.string().max(8).optional(),
  description: z.string().max(300).optional(),
  targetAmount: z.coerce.number().positive(),
  category: z.enum(["ESSENTIAL", "ELECTIVE"]).default("ELECTIVE"),
  deadline: z.string().optional(),
});

export async function GET(req: NextRequest, { params }: { params: { hid: string } }) {
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const fb = await assertMember(r.user.id, params.hid);
  if (fb) return fb;

  const goals = await prisma.householdGoal.findMany({
    where: { householdId: params.hid },
    orderBy: { createdAt: "asc" },
    include: { votes: true, _count: { select: { votes: true, contributions: true } } },
  });

  const electiveRanked = rankCompetingGoals(
    goals
      .filter((g) => g.category === "ELECTIVE" && g.status === "ACTIVE")
      .map((g) => ({ id: g.id, votes: g._count.votes, targetAmount: g.targetAmount, currentAmount: g.currentAmount }))
  );
  const priorityOrder = new Map(electiveRanked.map((g, i) => [g.id, i]));

  const out = goals.map((g) => ({
    id: g.id,
    name: g.name,
    emoji: g.emoji,
    description: g.description,
    targetAmount: g.targetAmount,
    currentAmount: g.currentAmount,
    category: g.category,
    status: g.status,
    deadline: g.deadline,
    createdAt: g.createdAt,
    voteCount: g._count.votes,
    myVote: g.votes.some((v) => v.userId === r.user.id),
    neglected: isNeglected(g),
    priorityRank: priorityOrder.has(g.id) ? (priorityOrder.get(g.id) as number) + 1 : null,
  }));

  return ok({ goals: out });
}

export async function POST(req: NextRequest, { params }: { params: { hid: string } }) {
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const fb = await assertMember(r.user.id, params.hid);
  if (fb) return fb;

  const parsed = createSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return bad("Invalid input", 400);

  const fbPlan = await assertWithinLimit(params.hid, "goals");
  if (fbPlan) return fbPlan;

  let deadline: Date | undefined;
  if (parsed.data.deadline) {
    deadline = new Date(parsed.data.deadline);
    if (isNaN(deadline.getTime())) return bad("Invalid deadline");
  }

  const goal = await prisma.householdGoal.create({
    data: {
      householdId: params.hid,
      name: parsed.data.name,
      emoji: parsed.data.emoji || "🎯",
      description: parsed.data.description,
      targetAmount: parsed.data.targetAmount,
      category: parsed.data.category,
      deadline,
      createdById: r.user.id,
    },
  });

  await Promise.all([
    log(r.user.id, "create", { entity: "HouseholdGoal", entityId: goal.id, req }),
    evaluate(r.user.id, { type: "household-goal-created" }),
  ]);

  return ok({ goal });
}
