import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyCron } from "@/lib/cron";
import { runDuelEngine } from "@/lib/duels/sprints";
import { tickPractice } from "@/lib/duels/practice";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const fail = verifyCron(req);
  if (fail) return fail;

  const stats = await runDuelEngine();
  let practiceContribs = 0;
  const hour = new Date().getUTCHours();
  if (hour === 12) {
    const practiceDuels = await prisma.duel.findMany({
      where: { isPractice: true, status: "ACTIVE" },
      select: { id: true },
    });
    for (const d of practiceDuels) {
      const res = await tickPractice(d.id);
      if (res) practiceContribs++;
    }
  }
  return NextResponse.json({ ok: true, ...stats, practiceContribs });
}
