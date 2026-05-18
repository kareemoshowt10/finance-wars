import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { rateLimit, DEFAULT_MUTATION } from "@/lib/ratelimit";
import { log } from "@/lib/audit";
import { openNextSprint } from "@/lib/duels/sprints";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const rl = rateLimit(req, { key: "duels.accept", ...DEFAULT_MUTATION });
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
  if (invitee.accepted) return bad("Already accepted", 400);
  await prisma.duelPlayer.update({
    where: { id: invitee.id },
    data: { userId: r.user.id, accepted: true, joinedAt: new Date() },
  });
  const refreshed = await prisma.duel.findUnique({
    where: { id: params.id },
    include: { players: true },
  });
  if (refreshed && refreshed.players.every((p) => p.accepted)) {
    await prisma.duel.update({ where: { id: duel.id }, data: { status: "ACTIVE" } });
    await openNextSprint(duel.id);
    // notify creator
    try {
      await prisma.notification.create({
        data: {
          userId: duel.creatorUserId,
          kind: "DUEL_ACCEPTED",
          title: `${r.user.name} accepted`,
          body: `${duel.title} is live.`,
          link: `/dashboard/duels/${duel.id}`,
          key: `duel:${duel.id}:accepted`,
        },
      });
    } catch {}
  }
  await log(r.user.id, "duel.accept", { entity: "duel", entityId: duel.id, req });
  return ok({ ok: true });
}
