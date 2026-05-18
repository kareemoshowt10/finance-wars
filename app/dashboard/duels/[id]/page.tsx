import { redirect, notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import DuelArena from "./_components/DuelArena";

export const dynamic = "force-dynamic";

export default async function DuelDetailPage({ params }: { params: { id: string } }) {
  const user = await requireUser();
  if (!user) redirect("/login");
  const duel = await prisma.duel.findUnique({
    where: { id: params.id },
    include: {
      players: { include: { user: { select: { id: true, name: true, email: true } } } },
    },
  });
  if (!duel) notFound();
  const isMember = duel.players.some((p) => p.userId === user.id) || duel.players.some((p) => p.inviteEmail === user.email);
  if (!isMember) redirect("/dashboard/duels");

  return <DuelArena duelId={duel.id} userId={user.id} />;
}
