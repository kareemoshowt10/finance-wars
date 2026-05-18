import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { rateLimit, DEFAULT_MUTATION } from "@/lib/ratelimit";
import { log } from "@/lib/audit";
import { recomputePlayerTotals } from "@/lib/duels/util";

export async function POST(req: NextRequest, { params }: { params: { id: string; did: string } }) {
  const rl = rateLimit(req, { key: "duels.dispute.uphold", ...DEFAULT_MUTATION });
  if (rl) return rl;
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const dispute = await prisma.dispute.findUnique({
    where: { id: params.did },
    include: { contribution: { include: { player: true, sprint: true } } },
  });
  if (!dispute || dispute.contribution.sprint.duelId !== params.id) return bad("Not found", 404);
  if (dispute.contribution.player.userId !== r.user.id) return bad("Forbidden", 403);
  if (dispute.status !== "PENDING") return bad("Already resolved", 400);

  await prisma.dispute.update({ where: { id: dispute.id }, data: { status: "UPHELD", resolvedAt: new Date() } });
  await prisma.contribution.update({ where: { id: dispute.contributionId }, data: { disputeStatus: null } });
  await recomputePlayerTotals(dispute.contribution.playerId);

  const other = await prisma.duelPlayer.findUnique({ where: { id: dispute.raisedByPlayerId } });
  if (other?.userId) {
    try {
      await prisma.notification.create({
        data: {
          userId: other.userId,
          kind: "DUEL_DISPUTE_RESOLVED",
          title: "Dispute upheld",
          body: "Contribution was upheld. Points restored.",
          link: `/dashboard/duels/${params.id}`,
          key: `duel:${params.id}:dispute:${dispute.id}:resolved`,
        },
      });
    } catch {}
  }
  await log(r.user.id, "duel.dispute.uphold", { entity: "dispute", entityId: dispute.id, req });
  return ok({ ok: true });
}
