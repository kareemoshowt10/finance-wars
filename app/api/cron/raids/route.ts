import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyCron } from "@/lib/cron";
import { processRaidsForUser } from "@/lib/goalRaidLifecycle";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const fail = verifyCron(req);
  if (fail) return fail;
  // Only scan users that actually have an active raid.
  const active = await prisma.goalRaid.findMany({
    where: { status: "ACTIVE" },
    select: { userId: true },
    distinct: ["userId"],
  });
  let processed = 0;
  let victories = 0;
  let expirings = 0;
  let expirations = 0;
  for (const a of active) {
    try {
      const r = await processRaidsForUser(a.userId);
      processed++;
      victories += r.victories;
      expirings += r.expirings;
      expirations += r.expirations;
    } catch {}
  }
  return NextResponse.json({ ok: true, processed, victories, expirings, expirations });
}
