import { NextRequest } from "next/server";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { assertMember } from "@/lib/household";
import { getMonthLedgers, monthKey } from "@/lib/allowance";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: { hid: string } }) {
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const fb = await assertMember(r.user.id, params.hid);
  if (fb) return fb;
  const month = new URL(req.url).searchParams.get("month") || monthKey();
  const ledgers = await getMonthLedgers(params.hid, month);

  // Recent allowance txs
  const memberIds = ledgers.map((l) => l.userId);
  const [y, m] = month.split("-").map(Number);
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 1);
  const txs = memberIds.length ? await prisma.transaction.findMany({
    where: { userId: { in: memberIds }, category: "Personal Allowance", date: { gte: start, lt: end } },
    orderBy: { date: "desc" },
  }) : [];
  return ok({ month, ledgers, transactions: txs });
}
