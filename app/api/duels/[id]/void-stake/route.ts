import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { rateLimit, DEFAULT_MUTATION } from "@/lib/ratelimit";
import { log } from "@/lib/audit";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const rl = rateLimit(req, { key: "duels.void", ...DEFAULT_MUTATION });
  if (rl) return rl;
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const duel = await prisma.duel.findUnique({
    where: { id: params.id },
    include: { players: true },
  });
  if (!duel) return bad("Not found", 404);
  const me = duel.players.find((p) => p.userId === r.user.id);
  if (!me) return bad("Forbidden", 403);
  await prisma.duel.update({ where: { id: duel.id }, data: { stakeVoided: true } });
  await prisma.duelEvent.create({
    data: { duelId: duel.id, kind: "STAKE_RESOLVED", playerId: me.id, payload: { voided: true } as never },
  });
  await log(r.user.id, "duel.void_stake", { entity: "duel", entityId: duel.id, req });
  return ok({ ok: true });
}
