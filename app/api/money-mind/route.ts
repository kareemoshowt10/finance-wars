import { NextRequest } from "next/server";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { log } from "@/lib/audit";
import { rateLimit, DEFAULT_MUTATION } from "@/lib/ratelimit";
import { getActiveHousehold, getOtherMember } from "@/lib/household";
import { notify } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const hh = await getActiveHousehold(r.user.id);
  if (!hh) return ok({ rounds: [], household: null });

  const rounds = await prisma.moneyMindRound.findMany({
    where: { householdId: hh.id },
    include: { responses: { select: { userId: true, submitted: true } } },
    orderBy: { createdAt: "desc" },
    take: 12,
  });

  const shaped = rounds.map((rd) => ({
    id: rd.id,
    status: rd.status,
    createdAt: rd.createdAt.toISOString(),
    revealedAt: rd.revealedAt?.toISOString() ?? null,
    mySubmitted: rd.responses.some((x) => x.userId === r.user.id && x.submitted),
    submittedCount: rd.responses.filter((x) => x.submitted).length,
  }));

  return ok({ rounds: shaped, household: { id: hh.id, name: hh.name } });
}

export async function POST(req: NextRequest) {
  const rl = rateLimit(req, { key: "money-mind", ...DEFAULT_MUTATION });
  if (rl) return rl;
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const hh = await getActiveHousehold(r.user.id);
  if (!hh) return bad("You need an active household to play Money Mind", 400);

  // One open round at a time per household.
  const open = await prisma.moneyMindRound.findFirst({
    where: { householdId: hh.id, status: "OPEN" },
  });
  if (open) return ok({ round: open, existing: true });

  const round = await prisma.moneyMindRound.create({
    data: { householdId: hh.id, createdById: r.user.id },
  });

  const other = await getOtherMember(hh.id, r.user.id);
  if (other?.userId) {
    await notify(
      other.userId,
      "INSIGHT",
      "Money Mind: your partner started a round",
      "Answer privately, then reveal together to see where you align.",
      "/dashboard/couples/money-mind",
      `moneymind:new:${round.id}`
    ).catch(() => {});
  }

  await log(r.user.id, "moneymind.create", { entity: "MoneyMindRound", entityId: round.id, req });
  return ok({ round });
}
