import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { parseBody } from "@/lib/validate";
import { rateLimit, DEFAULT_MUTATION } from "@/lib/ratelimit";
import { log } from "@/lib/audit";
import { computeContribPoints, recomputePlayerTotals } from "@/lib/duels/util";

const patchSchema = z.object({
  amount: z.coerce.number().positive().max(1_000_000).optional(),
  note: z.string().max(500).optional().nullable(),
});

async function loadCtx(req: NextRequest, duelId: string, cid: string) {
  const r = await resolveRequestUser(req);
  if (!r) return { error: bad("Unauthorized", 401) };
  const contrib = await prisma.contribution.findUnique({
    where: { id: cid },
    include: { player: true, sprint: true },
  });
  if (!contrib || contrib.sprint.duelId !== duelId) return { error: bad("Not found", 404) };
  if (contrib.player.userId !== r.user.id) return { error: bad("Forbidden", 403) };
  if (contrib.editableUntil.getTime() < Date.now()) return { error: bad("No longer editable", 400) };
  return { contrib, r };
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string; cid: string } }) {
  const rl = rateLimit(req, { key: "duels.contrib.patch", ...DEFAULT_MUTATION });
  if (rl) return rl;
  const ctx = await loadCtx(req, params.id, params.cid);
  if (ctx.error) return ctx.error;
  const { data, error } = await parseBody(req, patchSchema);
  if (error) return error;
  const { contrib, r } = ctx;
  const newAmount = data.amount ?? contrib.amount;
  const points = await computeContribPoints({
    playerId: contrib.playerId,
    sprintId: contrib.sprintId,
    amount: newAmount,
    atDate: contrib.createdAt,
  });
  await prisma.contribution.update({
    where: { id: contrib.id },
    data: {
      amount: newAmount,
      note: data.note ?? contrib.note,
      pointsAwarded: points,
    },
  });
  await recomputePlayerTotals(contrib.playerId);
  await log(r.user.id, "duel.contribution.update", { entity: "contribution", entityId: contrib.id, req });
  return ok({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string; cid: string } }) {
  const rl = rateLimit(req, { key: "duels.contrib.delete", ...DEFAULT_MUTATION });
  if (rl) return rl;
  const ctx = await loadCtx(req, params.id, params.cid);
  if (ctx.error) return ctx.error;
  const { contrib, r } = ctx;
  await prisma.contribution.delete({ where: { id: contrib.id } });
  await recomputePlayerTotals(contrib.playerId);
  await log(r.user.id, "duel.contribution.delete", { entity: "contribution", entityId: contrib.id, req });
  return ok({ ok: true });
}
