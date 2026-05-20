import { NextRequest } from "next/server";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { householdTrustLedger } from "@/lib/wallet";
import { getActiveHousehold } from "@/lib/household";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const household = await getActiveHousehold(r.user.id);
  if (!household) return bad("No active household", 400);

  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") || 100), 200);

  const [entries, members] = await Promise.all([
    householdTrustLedger(household.id, limit),
    prisma.householdMember.findMany({
      where: { householdId: household.id, accepted: true },
      include: { user: { select: { id: true, name: true } } },
    }),
  ]);

  const balances: Record<string, number> = {};
  const issuedByPair: Record<string, number> = {};
  for (const m of members) {
    if (m.userId) balances[m.userId] = 0;
  }

  for (const e of entries) {
    balances[e.userId] = (balances[e.userId] ?? 0) + e.delta;
    if (e.fromUserId) {
      const key = `${e.fromUserId}->${e.userId}`;
      issuedByPair[key] = (issuedByPair[key] ?? 0) + e.delta;
    }
  }

  // 7-day buckets for sparkline
  const buckets: Record<string, number[]> = {};
  const now = Date.now();
  for (const uid of Object.keys(balances)) buckets[uid] = Array(7).fill(0);
  for (const e of entries) {
    const ageDays = Math.floor((now - e.createdAt.getTime()) / 86400000);
    if (ageDays >= 0 && ageDays < 7) {
      const idx = 6 - ageDays;
      if (buckets[e.userId]) buckets[e.userId][idx] += e.delta;
    }
  }

  return ok({
    household: { id: household.id, name: household.name },
    members: members.map((m) => ({
      userId: m.userId,
      name: m.user?.name || m.inviteEmail || "Member",
      balance: m.userId ? balances[m.userId] ?? 0 : 0,
      sparkline: m.userId ? buckets[m.userId] ?? [] : [],
    })),
    issuedByPair,
    entries: entries.map((e) => ({
      id: e.id,
      to: { id: e.userId, name: e.user.name },
      from: e.from ? { id: e.from.id, name: e.from.name } : null,
      delta: e.delta,
      reason: e.reason,
      refType: e.refType,
      refId: e.refId,
      createdAt: e.createdAt,
    })),
  });
}
