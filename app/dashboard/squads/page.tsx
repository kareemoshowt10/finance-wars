import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SquadsView from "./SquadsView";

export const dynamic = "force-dynamic";

export default async function SquadsPage() {
  const user = await requireUser();
  if (!user) redirect("/login");
  const memberships = await prisma.squadMember.findMany({
    where: { userId: user.id },
    include: { squad: { include: { _count: { select: { members: true, quests: true } } } } },
    orderBy: { joinedAt: "desc" },
  });
  const squads = memberships.map((m) => ({
    id: m.squad.id,
    name: m.squad.name,
    emoji: m.squad.emoji,
    inviteCode: m.squad.inviteCode,
    role: m.role,
    memberCount: m.squad._count.members,
    questCount: m.squad._count.quests,
  }));
  return <SquadsView initialSquads={squads} />;
}
