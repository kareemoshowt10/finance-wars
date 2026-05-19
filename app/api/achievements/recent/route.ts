import { withUser, ok } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { ACHIEVEMENTS_BY_SLUG } from "@/lib/achievements/catalog";

export const dynamic = "force-dynamic";

export async function GET() {
  return withUser(async (user) => {
    const rows = await prisma.userAchievement.findMany({
      where: { userId: user.id, completed: true },
      orderBy: { unlockedAt: "desc" },
      take: 5,
    });
    const items = rows.map((r) => ({
      slug: r.achievementSlug,
      unlockedAt: r.unlockedAt,
      def: ACHIEVEMENTS_BY_SLUG[r.achievementSlug] || null,
    }));
    return ok({ items });
  });
}
