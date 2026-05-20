import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyCron } from "@/lib/cron";
import { accrueInterestForUser } from "@/lib/interestAccrual";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const fail = verifyCron(req);
  if (fail) return fail;
  const users = await prisma.user.findMany({ select: { id: true } });
  let processed = 0;
  let chargedAccounts = 0;
  let totalInterest = 0;
  for (const u of users) {
    try {
      const r = await accrueInterestForUser(u.id);
      processed++;
      chargedAccounts += r.chargedAccounts;
      totalInterest += r.totalInterest;
    } catch {}
  }
  return NextResponse.json({
    ok: true,
    processed,
    chargedAccounts,
    totalInterest: Math.round(totalInterest * 100) / 100,
  });
}
