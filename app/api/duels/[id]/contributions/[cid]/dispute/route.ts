import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { parseBody } from "@/lib/validate";
import { rateLimit, DEFAULT_MUTATION } from "@/lib/ratelimit";
import { log } from "@/lib/audit";
import { recomputePlayerTotals } from "@/lib/duels/util";

const schema = z.object({ reason: z.string().max(500).optional() });

export async function POST(req: NextRequest, { params }: { params: { id: string; cid: string } }) {
  const rl = rateLimit(req, { key: "duels.dispute", ...DEFAULT_MUTATION });
  if (rl) return rl;
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const { data, error } = await parseBody(req, schema);
  if (error) return error;

  const contrib = await prisma.contribution.findUnique({
    where: { id: params.cid },
    include: { sprint: { include: { duel: { include: { players: true } } } }, player: true, dispute: true },
  });
  if (!contrib || contrib.sprint.duelId !== params.id) return bad("Not found", 404);
  const me = contrib.sprint.duel.players.find((p) => p.userId === r.user.id);
  if (!me) return bad("Forbidden", 403);
  if (me.id === contrib.playerId) return bad("Cannot dispute your own", 400);
  if (contrib.dispute) return bad("Already disputed", 400);

  const autoResolveAt = new Date(Date.now() + 7 * 86400 * 1000);
  const dispute = await prisma.dispute.create({
    data: {
      contributionId: contrib.id,
      raisedByPlayerId: me.id,
      reason: data.reason ?? null,
      autoResolveAt,
    },
  });
  await prisma.contribution.update({ where: { id: contrib.id }, data: { disputeStatus: "PENDING" } });
  await prisma.duelEvent.create({
    data: { duelId: params.id, kind: "DISPUTE", playerId: me.id, payload: { contribId: contrib.id, disputeId: dispute.id } as never },
  });
  await recomputePlayerTotals(contrib.playerId);

  if (contrib.player.userId) {
    try {
      await prisma.notification.create({
        data: {
          userId: contrib.player.userId,
          kind: "DUEL_DISPUTE_RAISED",
          title: "Contribution disputed",
          body: `$${contrib.amount.toFixed(2)} contribution flagged. Concede or uphold within 7 days.`,
          link: `/dashboard/duels/${params.id}`,
          key: `duel:${params.id}:dispute:${dispute.id}`,
        },
      });
    } catch {}
  }

  await log(r.user.id, "duel.dispute", { entity: "contribution", entityId: contrib.id, req });
  return ok(dispute);
}
