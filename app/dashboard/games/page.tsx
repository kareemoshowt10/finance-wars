import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveHousehold } from "@/lib/household";
import GamesView from "./GamesView";

export const dynamic = "force-dynamic";

export default async function GamesPage() {
  const user = await requireUser();
  if (!user) redirect("/login");
  const household = await getActiveHousehold(user.id);
  if (!household) redirect("/dashboard/couples");

  const sessions = await prisma.gameSession.findMany({
    where: { householdId: household.id },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: { plays: true },
  });
  return (
    <GamesView
      sessions={sessions.map((s) => ({
        id: s.id,
        game: s.game,
        status: s.status,
        createdAt: s.createdAt.toISOString(),
        playCount: s.plays.length,
        myScore: s.plays.find((p) => p.userId === user.id)?.score ?? null,
      }))}
    />
  );
}
