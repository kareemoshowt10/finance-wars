import { withUser, ok } from "@/lib/api";
import { getProgressFor } from "@/lib/achievements/engine";
import { levelFromXp } from "@/lib/achievements/catalog";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  return withUser(async (user) => {
    const items = await getProgressFor(user.id);
    const u = await prisma.user.findUnique({ where: { id: user.id }, select: { xp: true, currentLoginStreak: true, longestLoginStreak: true } });
    const xp = u?.xp || 0;
    return ok({ items, xp, level: levelFromXp(xp), streak: u?.currentLoginStreak || 0, longest: u?.longestLoginStreak || 0 });
  });
}
