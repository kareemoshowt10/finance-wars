import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { parseBody } from "@/lib/validate";
import { rateLimit } from "@/lib/ratelimit";
import { STICKERS } from "@/lib/duels/constants";
import { award, REWARDS } from "@/lib/wallet";

const schema = z.object({ sticker: z.enum(STICKERS as unknown as [string, ...string[]]) });

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const rl = rateLimit(req, { key: `duels.cheer:${params.id}`, limit: 1, windowMs: 60_000, bearerLimit: 5 });
  if (rl) return rl;
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const { data, error } = await parseBody(req, schema);
  if (error) return error;
  const duel = await prisma.duel.findUnique({
    where: { id: params.id },
    include: { players: true },
  });
  if (!duel) return bad("Not found", 404);
  const me = duel.players.find((p) => p.userId === r.user.id);
  if (!me) return bad("Forbidden", 403);
  const cheer = await prisma.cheer.create({
    data: { duelId: duel.id, fromPlayerId: me.id, sticker: data.sticker },
  });
  await prisma.duelEvent.create({
    data: { duelId: duel.id, kind: "CHEER", playerId: me.id, payload: { sticker: data.sticker } as never },
  });

  // Social Currency: small reward for giving cheers, smaller for receiving.
  await award({
    userId: r.user.id,
    currency: "SC",
    delta: REWARDS.CHEER_GIVEN,
    reason: "CHEER_GIVEN",
    refType: "Cheer",
    refId: cheer.id,
  });
  const opponent = duel.players.find((p) => p.id !== me.id && p.userId);
  if (opponent?.userId) {
    await award({
      userId: opponent.userId,
      currency: "SC",
      delta: REWARDS.CHEER_RECEIVED,
      reason: "CHEER_RECEIVED",
      refType: "Cheer",
      refId: cheer.id,
      fromUserId: r.user.id,
    });
  }

  return ok(cheer);
}
