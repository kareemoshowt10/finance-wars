import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getProgressFor } from "@/lib/achievements/engine";
import { levelFromXp } from "@/lib/achievements/catalog";
import AchievementsClient from "./AchievementsClient";

export const dynamic = "force-dynamic";

export default async function AchievementsPage() {
  const user = await requireUser();
  if (!user) redirect("/login");
  const items = await getProgressFor(user.id);
  const u = await prisma.user.findUnique({ where: { id: user.id }, select: { xp: true, currentLoginStreak: true, longestLoginStreak: true } });
  const xp = u?.xp || 0;
  const lvl = levelFromXp(xp);
  return (
    <AchievementsClient
      items={items.map((i) => ({ ...i, unlockedAt: i.unlockedAt ? i.unlockedAt.toISOString() : null }))}
      xp={xp}
      level={lvl}
      streak={u?.currentLoginStreak || 0}
      longest={u?.longestLoginStreak || 0}
    />
  );
}
