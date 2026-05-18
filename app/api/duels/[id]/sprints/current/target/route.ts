import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { parseBody } from "@/lib/validate";
import { rateLimit, DEFAULT_MUTATION } from "@/lib/ratelimit";

const schema = z.object({ amount: z.coerce.number().positive().max(1_000_000) });

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const rl = rateLimit(req, { key: "duels.target", ...DEFAULT_MUTATION });
  if (rl) return rl;
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const { data, error } = await parseBody(req, schema);
  if (error) return error;
  const duel = await prisma.duel.findUnique({
    where: { id: params.id },
    include: { players: true, sprints: { where: { status: "ACTIVE" } } },
  });
  if (!duel) return bad("Not found", 404);
  const player = duel.players.find((p) => p.userId === r.user.id);
  if (!player) return bad("Forbidden", 403);
  const sprint = duel.sprints[0];
  if (!sprint) return bad("No active sprint", 400);
  const existing = await prisma.sprintTarget.findUnique({
    where: { sprintId_playerId: { sprintId: sprint.id, playerId: player.id } },
  });
  if (existing) {
    await prisma.sprintTarget.update({ where: { id: existing.id }, data: { amount: data.amount, setAt: new Date() } });
  } else {
    await prisma.sprintTarget.create({ data: { sprintId: sprint.id, playerId: player.id, amount: data.amount } });
  }
  return ok({ ok: true });
}
