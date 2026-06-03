import { NextRequest } from "next/server";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { isMember } from "@/lib/household";
import { getPrompts } from "@/lib/moneyMind";

export const dynamic = "force-dynamic";

// Returns round state WITHOUT exposing the partner's answers while OPEN.
// Only my own answers come back until the round is REVEALED.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);

  const round = await prisma.moneyMindRound.findUnique({
    where: { id },
    include: { responses: true },
  });
  if (!round) return bad("Not found", 404);
  if (!(await isMember(r.user.id, round.householdId))) return bad("Not found", 404);

  const mine = round.responses.find((x) => x.userId === r.user.id);
  const partnerResp = round.responses.find((x) => x.userId !== r.user.id);

  return ok({
    id: round.id,
    status: round.status,
    prompts: getPrompts(),
    myAnswers: mine?.answers ?? {},
    mySubmitted: mine?.submitted ?? false,
    partnerSubmitted: partnerResp?.submitted ?? false,
    bothSubmitted: round.responses.length === 2 && round.responses.every((x) => x.submitted),
    revealedAt: round.revealedAt?.toISOString() ?? null,
  });
}
