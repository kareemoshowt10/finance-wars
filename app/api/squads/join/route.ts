import { NextRequest } from "next/server";
import { z } from "zod";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { log } from "@/lib/audit";

export const dynamic = "force-dynamic";

const joinSchema = z.object({ inviteCode: z.string().min(4).max(16) });

export async function POST(req: NextRequest) {
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const parsed = joinSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return bad("Invalid input", 400);

  const squad = await prisma.squad.findUnique({ where: { inviteCode: parsed.data.inviteCode.toUpperCase() } });
  if (!squad) return bad("Squad not found", 404);

  const existing = await prisma.squadMember.findUnique({
    where: { squadId_userId: { squadId: squad.id, userId: r.user.id } },
  });
  if (existing) return ok({ squad, alreadyMember: true });

  await prisma.squadMember.create({
    data: { squadId: squad.id, userId: r.user.id, role: "MEMBER" },
  });
  await log(r.user.id, "join", { entity: "Squad", entityId: squad.id, req });
  return ok({ squad });
}
