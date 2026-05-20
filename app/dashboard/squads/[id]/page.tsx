import { redirect, notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeQuestProgress } from "@/lib/squad";
import SquadDetailView from "./SquadDetailView";

export const dynamic = "force-dynamic";

export default async function SquadDetail({ params }: { params: { id: string } }) {
  const user = await requireUser();
  if (!user) redirect("/login");
  const squad = await prisma.squad.findUnique({
    where: { id: params.id },
    include: {
      members: { include: { user: { select: { id: true, name: true } } } },
      quests: { orderBy: { createdAt: "desc" }, include: { contributions: { include: { user: { select: { name: true } } } } } },
    },
  });
  if (!squad) notFound();
  if (!squad.members.some((m) => m.userId === user.id)) redirect("/dashboard/squads");

  const initial = {
    id: squad.id,
    name: squad.name,
    emoji: squad.emoji,
    inviteCode: squad.inviteCode,
    isOwner: squad.createdById === user.id,
    members: squad.members.map((m) => ({ userId: m.userId, name: m.user.name, role: m.role })),
    quests: squad.quests.map((q) => ({
      id: q.id,
      title: q.title,
      description: q.description,
      mode: q.mode,
      targetAmount: q.targetAmount,
      deadline: q.deadline.toISOString(),
      status: q.status,
      completedAt: q.completedAt?.toISOString() ?? null,
      progress: computeQuestProgress(q.targetAmount, q.contributions, squad.members),
    })),
  };
  return <SquadDetailView initial={initial} meId={user.id} />;
}
