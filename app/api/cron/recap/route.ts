import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyCron } from "@/lib/cron";
import { generateWeeklyRecap, previousWeek } from "@/lib/weeklyRecap";
import { notify } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const fail = verifyCron(req);
  if (fail) return fail;

  const users = await prisma.user.findMany({ select: { id: true } });
  const prev = previousWeek();
  let generated = 0;
  for (const u of users) {
    try {
      const recap = await generateWeeklyRecap(u.id, prev.start);
      generated++;
      await notify(
        u.id,
        "INSIGHT",
        "Your weekly recap is ready",
        `Net ${recap.net >= 0 ? "+" : ""}$${recap.net.toFixed(0)} · ${recap.txCount} transactions · ${recap.achievementsUnlocked} achievements unlocked.`,
        "/dashboard/recap",
        `recap:${u.id}:${prev.start.toISOString().slice(0, 10)}`
      ).catch(() => {});
    } catch {}
  }
  return NextResponse.json({ ok: true, generated });
}
