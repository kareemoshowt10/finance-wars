import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { rateLimit, DEFAULT_MUTATION } from "@/lib/ratelimit";
import { log } from "@/lib/audit";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const rl = rateLimit(req, { key: "duels.decline", ...DEFAULT_MUTATION });
  if (rl) return rl;
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const duel = await prisma.duel.findUnique({
    where: { id: params.id },
    include: { players: true },
  });
  if (!duel) return bad("Not found", 404);
  const invitee = duel.players.find(
    (p) => p.inviteEmail && p.inviteEmail.toLowerCase() === r.user.email.toLowerCase()
  );
  if (!invitee) return bad("Not invited", 403);
  await prisma.duelPlayer.update({ where: { id: invitee.id }, data: { declined: true } });
  await prisma.duel.update({ where: { id: duel.id }, data: { status: "ABANDONED" } });
  await log(r.user.id, "duel.decline", { entity: "duel", entityId: duel.id, req });
  return ok({ ok: true });
}
