import { NextRequest } from "next/server";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { rateLimit, DEFAULT_MUTATION } from "@/lib/ratelimit";
import { isMember, getOtherMember } from "@/lib/household";
import { buildReveal } from "@/lib/moneyMind";
import { award } from "@/lib/wallet";

export const dynamic = "force-dynamic";

type AnswerMap = Record<string, { value: number; note?: string }>;

// Reveal is gated: BOTH partners must have submitted. Once revealed, the round
// is locked and both partners see the full comparison + gap insights.
async function loadReveal(roundId: string, selfUserId: string) {
  const round = await prisma.moneyMindRound.findUnique({
    where: { id: roundId },
    include: { responses: true },
  });
  if (!round) return { error: "Not found" as const, payload: null };
  const partner = await getOtherMember(round.householdId, selfUserId);

  const mine = round.responses.find((x) => x.userId === selfUserId);
  const theirs = round.responses.find((x) => x.userId !== selfUserId);

  const reveal = buildReveal(
    (mine?.answers as AnswerMap) ?? null,
    (theirs?.answers as AnswerMap) ?? null
  );
  // Relabel a/b from the requester's perspective: "you" vs "partner".
  const items = reveal.items.map((it) => ({
    ...it,
    you: it.a,
    partner: it.b,
  }));
  return {
    error: null,
    round,
    payload: {
      status: round.status,
      revealedAt: round.revealedAt?.toISOString() ?? null,
      alignmentScore: reveal.alignmentScore,
      items,
      biggestGaps: reveal.biggestGaps.map((g) => g.promptId),
      strongestAlignments: reveal.strongestAlignments.map((g) => g.promptId),
      partnerName: partner?.user?.name ?? "Partner",
    },
  };
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rl = rateLimit(req, { key: "money-mind:reveal", ...DEFAULT_MUTATION });
  if (rl) return rl;
  const { id } = await params;
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);

  const round = await prisma.moneyMindRound.findUnique({
    where: { id },
    include: { responses: true },
  });
  if (!round) return bad("Not found", 404);
  if (!(await isMember(r.user.id, round.householdId))) return bad("Not found", 404);

  if (round.status !== "REVEALED") {
    const bothSubmitted = round.responses.length === 2 && round.responses.every((x) => x.submitted);
    if (!bothSubmitted) return bad("Both partners must submit before revealing", 409);

    await prisma.moneyMindRound.update({
      where: { id },
      data: { status: "REVEALED", revealedAt: new Date() },
    });

    // Reward the shared vulnerability — once per participant per round.
    for (const resp of round.responses) {
      await award({
        userId: resp.userId,
        currency: "SC",
        delta: 15,
        reason: "PACT_KEPT",
        refType: "MoneyMindRound",
        refId: round.id,
      }).catch(() => {});
    }
  }

  const result = await loadReveal(id, r.user.id);
  if (result.error || !result.payload) return bad("Not found", 404);
  return ok(result.payload);
}

// GET reveal payload (only valid once revealed).
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);

  const round = await prisma.moneyMindRound.findUnique({ where: { id } });
  if (!round) return bad("Not found", 404);
  if (!(await isMember(r.user.id, round.householdId))) return bad("Not found", 404);
  if (round.status !== "REVEALED") return bad("Not revealed yet", 409);

  const result = await loadReveal(id, r.user.id);
  if (result.error || !result.payload) return bad("Not found", 404);
  return ok(result.payload);
}
