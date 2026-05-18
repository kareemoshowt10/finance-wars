import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { parseBody } from "@/lib/validate";
import { rateLimit, DEFAULT_MUTATION } from "@/lib/ratelimit";
import { log } from "@/lib/audit";
import { computeContribPoints, recomputePlayerTotals, startOfDay, addDays } from "@/lib/duels/util";
import { evaluateBadges } from "@/lib/duels/badges";

const schema = z.object({
  amount: z.coerce.number().positive().max(1_000_000),
  note: z.string().max(500).optional(),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const rl = rateLimit(req, { key: "duels.contrib", ...DEFAULT_MUTATION });
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
  if (duel.status !== "ACTIVE") return bad("Duel not active", 400);
  const player = duel.players.find((p) => p.userId === r.user.id);
  if (!player) return bad("Forbidden", 403);
  const sprint = duel.sprints[0];
  if (!sprint) return bad("No active sprint", 400);

  if (data.amount > duel.dailyCap) return bad(`Exceeds daily cap of $${duel.dailyCap}`, 422);
  if (data.amount > duel.dailyCap * 0.5 && (!data.note || data.note.length < 10))
    return bad("Large contribution requires a note (10+ chars)", 422);

  const now = new Date();
  const dStart = startOfDay(now);
  const dEnd = addDays(dStart, 1);
  const todays = await prisma.contribution.count({
    where: { playerId: player.id, createdAt: { gte: dStart, lt: dEnd } },
  });
  if (todays >= 5) return bad("Max 5 entries per day", 429);

  const points = await computeContribPoints({
    playerId: player.id,
    sprintId: sprint.id,
    amount: data.amount,
    atDate: now,
  });

  const editableUntil = new Date(now.getTime() + 24 * 3600 * 1000);
  const contrib = await prisma.contribution.create({
    data: {
      sprintId: sprint.id,
      playerId: player.id,
      amount: data.amount,
      note: data.note ?? null,
      pointsAwarded: points,
      editableUntil,
    },
  });

  await prisma.duelEvent.create({
    data: {
      duelId: duel.id,
      kind: "CONTRIBUTION",
      playerId: player.id,
      payload: { amount: data.amount, points, contribId: contrib.id } as never,
    },
  });

  await recomputePlayerTotals(player.id);
  await evaluateBadges(duel.id, player.id, { trigger: "CONTRIBUTION" });

  // Notify opponent (hour-bucketed)
  const opponent = duel.players.find((p) => p.id !== player.id);
  if (opponent?.userId) {
    const hourKey = `${now.toISOString().slice(0, 13)}`;
    try {
      await prisma.notification.create({
        data: {
          userId: opponent.userId,
          kind: "DUEL_OPPONENT_CONTRIBUTED",
          title: `${r.user.name} just logged a save`,
          body: `$${data.amount.toFixed(2)} on ${duel.title}.`,
          link: `/dashboard/duels/${duel.id}`,
          key: `duel:${duel.id}:opp-contrib:${opponent.userId}:${hourKey}`,
        },
      });
    } catch {}
  }

  await log(r.user.id, "duel.contribution", { entity: "duel", entityId: duel.id, meta: { amount: data.amount }, req });
  return ok(contrib);
}
