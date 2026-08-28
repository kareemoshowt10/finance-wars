import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { assertMember } from "@/lib/household";
import { log } from "@/lib/audit";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  emoji: z.string().max(8).optional(),
  description: z.string().max(300).nullable().optional(),
  frequency: z.enum(["DAILY", "WEEKLY", "ONEOFF"]).optional(),
  category: z.enum(["ESSENTIAL", "ELECTIVE"]).optional(),
  crownValue: z.coerce.number().int().min(1).max(1000).optional(),
  xpValue: z.coerce.number().int().min(0).max(1000).optional(),
  active: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { hid: string; choreId: string } }) {
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const fb = await assertMember(r.user.id, params.hid);
  if (fb) return fb;

  const chore = await prisma.chore.findUnique({ where: { id: params.choreId } });
  if (!chore || chore.householdId !== params.hid) return bad("Not found", 404);

  const parsed = updateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return bad("Invalid input", 400);

  const updated = await prisma.chore.update({
    where: { id: params.choreId },
    data: parsed.data,
  });
  await log(r.user.id, "update", { entity: "Chore", entityId: chore.id, req });
  return ok({ chore: updated });
}
