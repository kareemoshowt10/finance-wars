import { NextRequest } from "next/server";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { generateWeeklyRecap, previousWeek } from "@/lib/weeklyRecap";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);

  // Make sure last week's recap is generated.
  const prev = previousWeek();
  await generateWeeklyRecap(r.user.id, prev.start).catch(() => {});

  const recaps = await prisma.weeklyRecap.findMany({
    where: { userId: r.user.id },
    orderBy: { weekStart: "desc" },
    take: 12,
  });
  return ok({ recaps });
}
