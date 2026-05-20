import { NextRequest } from "next/server";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { computeQuestProgress } from "@/lib/squad";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);

  const squad = await prisma.squad.findUnique({
    where: { id: params.id },
    include: {
      members: { include: { user: { select: { id: true, name: true } } } },
      quests: {
        orderBy: { createdAt: "desc" },
        include: {
          contributions: { include: { user: { select: { name: true } } } },
        },
      },
    },
  });
  if (!squad) return bad("Not found", 404);
  const isMember = squad.members.some((m) => m.userId === r.user.id);
  if (!isMember) return bad("Forbidden", 403);

  return ok({
    squad: {
      id: squad.id,
      name: squad.name,
      emoji: squad.emoji,
      inviteCode: squad.inviteCode,
      createdAt: squad.createdAt,
      members: squad.members.map((m) => ({ userId: m.userId, name: m.user.name, role: m.role })),
      quests: squad.quests.map((q) => ({
        id: q.id,
        title: q.title,
        description: q.description,
        mode: q.mode,
        targetAmount: q.targetAmount,
        deadline: q.deadline,
        status: q.status,
        completedAt: q.completedAt,
        progress: computeQuestProgress(q.targetAmount, q.contributions, squad.members),
      })),
    },
  });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const squad = await prisma.squad.findUnique({ where: { id: params.id } });
  if (!squad) return bad("Not found", 404);
  if (squad.createdById !== r.user.id) return bad("Forbidden", 403);
  await prisma.squad.delete({ where: { id: params.id } });
  return ok({ ok: true });
}
