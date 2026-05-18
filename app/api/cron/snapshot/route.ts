import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { upsertTodaySnapshot } from "@/lib/snapshots";
import { verifyCron } from "@/lib/cron";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const fail = verifyCron(req);
  if (fail) return fail;
  const users = await prisma.user.findMany({ select: { id: true } });
  let processed = 0;
  for (const u of users) {
    try {
      await upsertTodaySnapshot(u.id);
      processed++;
    } catch {}
  }
  return NextResponse.json({ ok: true, processed });
}
