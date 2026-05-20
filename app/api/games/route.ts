import { NextRequest } from "next/server";
import { z } from "zod";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getActiveHousehold } from "@/lib/household";
import { log } from "@/lib/audit";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  game: z.enum(["SAME_PAGE", "BUDGET_BID", "WORST_CASE"]),
});

export async function GET(req: NextRequest) {
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const household = await getActiveHousehold(r.user.id);
  if (!household) return ok({ sessions: [] });
  const sessions = await prisma.gameSession.findMany({
    where: { householdId: household.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { plays: { select: { userId: true, score: true } } },
  });
  return ok({ sessions });
}

export async function POST(req: NextRequest) {
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const parsed = createSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return bad("Invalid input", 400);
  const household = await getActiveHousehold(r.user.id);
  if (!household) return bad("No active household", 400);

  const session = await prisma.gameSession.create({
    data: { householdId: household.id, game: parsed.data.game, createdById: r.user.id },
  });
  await log(r.user.id, "create", { entity: "GameSession", entityId: session.id, meta: { game: parsed.data.game }, req });
  return ok({ session });
}
