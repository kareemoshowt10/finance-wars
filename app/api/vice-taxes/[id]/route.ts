import { NextRequest } from "next/server";
import { z } from "zod";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { log } from "@/lib/audit";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  enabled: z.boolean().optional(),
  rate: z.coerce.number().positive().max(100).optional(),
  mode: z.enum(["PERCENT", "FIXED"]).optional(),
  goalId: z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const existing = await prisma.viceTax.findUnique({ where: { id } });
  if (!existing || existing.userId !== r.user.id) return bad("Not found", 404);
  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return bad("Invalid input", 400);
  if (parsed.data.goalId) {
    const g = await prisma.goal.findUnique({ where: { id: parsed.data.goalId } });
    if (!g || g.userId !== r.user.id) return bad("Invalid goal", 400);
  }
  const tax = await prisma.viceTax.update({ where: { id }, data: parsed.data });
  await log(r.user.id, "update", { entity: "ViceTax", entityId: id, req });
  return ok({ tax });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const existing = await prisma.viceTax.findUnique({ where: { id } });
  if (!existing || existing.userId !== r.user.id) return bad("Not found", 404);
  await prisma.viceTax.delete({ where: { id } });
  await log(r.user.id, "delete", { entity: "ViceTax", entityId: id, req });
  return ok({ ok: true });
}
