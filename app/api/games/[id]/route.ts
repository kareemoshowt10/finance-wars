import { NextRequest } from "next/server";
import { z } from "zod";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { scoreSamePage, scoreBudgetBid, scoreWorstCase, normalizeBudgetBid, type BudgetBidAnswer } from "@/lib/games";
import { award } from "@/lib/wallet";

export const dynamic = "force-dynamic";

const submitSchema = z.object({
  answers: z.record(z.string(), z.union([z.string(), z.number()])),
});

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const session = await prisma.gameSession.findUnique({
    where: { id: params.id },
    include: {
      plays: { include: { user: { select: { id: true, name: true } } } },
      household: { include: { members: { where: { accepted: true }, include: { user: { select: { id: true, name: true } } } } } },
    },
  });
  if (!session) return bad("Not found", 404);
  const isMember = session.household.members.some((m) => m.userId === r.user.id);
  if (!isMember) return bad("Forbidden", 403);

  const myPlay = session.plays.find((p) => p.userId === r.user.id);
  const allPlayed = session.plays.length >= 2;
  let result: unknown = null;
  if (allPlayed && session.status === "COMPLETED") {
    const [a, b] = session.plays;
    if (session.game === "SAME_PAGE") result = scoreSamePage(a.answers as never, b.answers as never);
    else if (session.game === "WORST_CASE") result = scoreWorstCase(a.answers as never, b.answers as never);
    else if (session.game === "BUDGET_BID") result = scoreBudgetBid(a.answers as never, b.answers as never);
  }

  return ok({
    session: {
      id: session.id,
      game: session.game,
      status: session.status,
      createdAt: session.createdAt,
      completedAt: session.completedAt,
      iPlayed: !!myPlay,
      myAnswers: myPlay?.answers ?? null,
      plays: session.plays.map((p) => ({ userId: p.userId, name: p.user.name, score: p.score })),
      members: session.household.members.map((m) => ({ userId: m.userId, name: m.user?.name })),
      result,
    },
  });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const parsed = submitSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return bad("Invalid input", 400);

  const session = await prisma.gameSession.findUnique({
    where: { id: params.id },
    include: {
      plays: true,
      household: { include: { members: true } },
    },
  });
  if (!session) return bad("Not found", 404);
  if (session.status !== "OPEN") return bad("Already completed");
  if (!session.household.members.some((m) => m.userId === r.user.id)) return bad("Forbidden", 403);

  let normalized: Record<string, unknown> = parsed.data.answers;
  if (session.game === "BUDGET_BID") {
    normalized = normalizeBudgetBid(parsed.data.answers as unknown as Partial<BudgetBidAnswer>);
  }

  await prisma.gamePlay.upsert({
    where: { sessionId_userId: { sessionId: session.id, userId: r.user.id } },
    update: { answers: normalized as never },
    create: { sessionId: session.id, userId: r.user.id, answers: normalized as never },
  });

  // If at least 2 plays exist, complete the session and score.
  const plays = await prisma.gamePlay.findMany({ where: { sessionId: session.id } });
  let result: { alignment: number } | null = null;
  if (plays.length >= 2) {
    const [a, b] = plays;
    if (session.game === "SAME_PAGE") result = scoreSamePage(a.answers as never, b.answers as never);
    else if (session.game === "WORST_CASE") result = scoreWorstCase(a.answers as never, b.answers as never);
    else if (session.game === "BUDGET_BID") result = scoreBudgetBid(a.answers as never, b.answers as never);

    await prisma.gameSession.update({
      where: { id: session.id },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
    if (result) {
      const score = result.alignment;
      await prisma.gamePlay.updateMany({ where: { sessionId: session.id }, data: { score } });

      // Award TP scaled by alignment. 80%+ = 20 TP each, 50-79 = 10 TP, <50 = 5 TP + nudge.
      const tp = score >= 80 ? 20 : score >= 50 ? 10 : 5;
      for (const p of plays) {
        await award({
          userId: p.userId,
          currency: "TP",
          delta: tp,
          reason: "PACT_KEPT",
          refType: "GameSession",
          refId: session.id,
          householdId: session.householdId,
          meta: { game: session.game, alignment: score },
        });
      }
    }
  }

  return ok({ completed: !!result, result });
}
