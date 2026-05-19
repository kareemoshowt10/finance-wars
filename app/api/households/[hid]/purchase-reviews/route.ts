import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { assertMember } from "@/lib/household";

export async function GET(req: NextRequest, { params }: { params: { hid: string } }) {
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const fb = await assertMember(r.user.id, params.hid);
  if (fb) return fb;
  const status = new URL(req.url).searchParams.get("status") || "all";
  const where: Record<string, unknown> = { householdId: params.hid };
  if (status === "pending") where.status = "PENDING";
  const reviews = await prisma.purchaseReview.findMany({
    where,
    include: {
      requester: { select: { id: true, name: true } },
      approver: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const txIds = reviews.map((r) => r.transactionId);
  const txs = txIds.length ? await prisma.transaction.findMany({
    where: { id: { in: txIds } },
    include: { account: { select: { name: true } } },
  }) : [];
  const txMap = new Map(txs.map((t) => [t.id, t]));
  return ok(reviews.map((r) => ({ ...r, transaction: txMap.get(r.transactionId) || null })));
}
