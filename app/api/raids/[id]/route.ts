import { NextRequest } from "next/server";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { log } from "@/lib/audit";
import { rateLimit, DEFAULT_MUTATION } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rl = rateLimit(req, { key: "raids:del", ...DEFAULT_MUTATION });
  if (rl) return rl;
  const { id } = await params;
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const existing = await prisma.goalRaid.findUnique({ where: { id } });
  if (!existing || existing.userId !== r.user.id) return bad("Not found", 404);
  await prisma.goalRaid.delete({ where: { id } });
  await log(r.user.id, "raid.delete", { entity: "GoalRaid", entityId: id, req });
  return ok({ ok: true });
}
