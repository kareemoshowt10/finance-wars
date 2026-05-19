import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { assertMember, getHouseholdMembers } from "@/lib/household";
import { balanceOf, suggestSettlement } from "@/lib/billsplit";

export async function GET(req: NextRequest, { params }: { params: { hid: string } }) {
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const fb = await assertMember(r.user.id, params.hid);
  if (fb) return fb;

  const [entries, balances, members, settlements] = await Promise.all([
    prisma.ledgerEntry.findMany({
      where: { householdId: params.hid },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    balanceOf(params.hid),
    getHouseholdMembers(params.hid),
    prisma.settlement.findMany({
      where: { householdId: params.hid },
      orderBy: { settledAt: "desc" },
      take: 10,
    }),
  ]);

  // Ensure every member appears in balances
  for (const m of members) {
    if (!m.userId) continue;
    if (!balances.find((b) => b.userId === m.userId)) {
      balances.push({ userId: m.userId, net: 0 });
    }
  }
  const suggested = suggestSettlement(balances);

  return ok({ entries, balances, suggested, settlements });
}
