import { NextRequest } from "next/server";
import { z } from "zod";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { generateInviteCode } from "@/lib/squad";
import { log } from "@/lib/audit";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  name: z.string().min(1).max(60),
  emoji: z.string().max(8).optional(),
  visibility: z.enum(["PRIVATE", "LINK"]).optional(),
});

export async function GET(req: NextRequest) {
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const memberships = await prisma.squadMember.findMany({
    where: { userId: r.user.id },
    include: {
      squad: {
        include: {
          _count: { select: { members: true, quests: true } },
        },
      },
    },
    orderBy: { joinedAt: "desc" },
  });
  return ok({
    squads: memberships.map((m) => ({
      id: m.squad.id,
      name: m.squad.name,
      emoji: m.squad.emoji,
      inviteCode: m.squad.inviteCode,
      role: m.role,
      memberCount: m.squad._count.members,
      questCount: m.squad._count.quests,
    })),
  });
}

export async function POST(req: NextRequest) {
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const parsed = createSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return bad("Invalid input", 400);

  let code = generateInviteCode();
  for (let i = 0; i < 5; i++) {
    const exists = await prisma.squad.findUnique({ where: { inviteCode: code } });
    if (!exists) break;
    code = generateInviteCode();
  }

  const squad = await prisma.squad.create({
    data: {
      name: parsed.data.name,
      emoji: parsed.data.emoji || "🎯",
      visibility: parsed.data.visibility || "PRIVATE",
      createdById: r.user.id,
      inviteCode: code,
      members: { create: { userId: r.user.id, role: "OWNER" } },
    },
  });
  await log(r.user.id, "create", { entity: "Squad", entityId: squad.id, req });
  return ok({ squad });
}
