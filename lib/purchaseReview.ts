import { prisma } from "./prisma";

export type TxCandidate = {
  type: "income" | "expense";
  amount: number;
  category: string;
  description?: string;
};

export type ReviewContext = {
  pact?: { bigPurchaseThreshold: number } | null;
  mutedCategories?: string[];
  hasHousehold: boolean;
};

export function evaluateReviewRequired(tx: TxCandidate, ctx: ReviewContext): boolean {
  if (!ctx.hasHousehold) return false;
  if (tx.type !== "expense") return false;
  if (!ctx.pact) return false;
  if (tx.amount < ctx.pact.bigPurchaseThreshold) return false;
  if ((ctx.mutedCategories || []).includes(tx.category)) return false;
  return true;
}

export async function shouldRequireReview(userId: string, householdId: string, tx: TxCandidate): Promise<boolean> {
  const [user, pact] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { purchaseReviewMutedCategories: true } }),
    prisma.pact.findUnique({ where: { householdId } }),
  ]);
  return evaluateReviewRequired(tx, {
    pact: pact ? { bigPurchaseThreshold: pact.bigPurchaseThreshold } : null,
    mutedCategories: user?.purchaseReviewMutedCategories || [],
    hasHousehold: true,
  });
}

export async function enqueueReview(opts: {
  householdId: string;
  transactionId: string;
  requesterUserId: string;
  approverUserId: string;
  amount: number;
  reason?: string;
  ttlHours?: number;
}) {
  const expiresAt = new Date(Date.now() + (opts.ttlHours ?? 24) * 3600 * 1000);
  const review = await prisma.purchaseReview.create({
    data: {
      householdId: opts.householdId,
      transactionId: opts.transactionId,
      requesterUserId: opts.requesterUserId,
      approverUserId: opts.approverUserId,
      amount: opts.amount,
      reason: opts.reason ?? null,
      expiresAt,
    },
  });
  await prisma.transaction.update({
    where: { id: opts.transactionId },
    data: { pending: true, reviewId: review.id },
  });
  return review;
}

export async function decideReview(reviewId: string, deciderUserId: string, status: "APPROVED" | "DENIED") {
  const review = await prisma.purchaseReview.findUnique({ where: { id: reviewId } });
  if (!review) throw new Error("Not found");
  if (review.approverUserId !== deciderUserId) throw new Error("Forbidden");
  if (review.status !== "PENDING") throw new Error("Already decided");
  const updated = await prisma.purchaseReview.update({
    where: { id: reviewId },
    data: { status, decidedAt: new Date() },
  });
  if (status === "APPROVED") {
    await prisma.transaction.update({
      where: { id: review.transactionId },
      data: { pending: false },
    });
  }
  return updated;
}

export function isExpired(review: { expiresAt: Date; status: string }): boolean {
  return review.status === "PENDING" && review.expiresAt < new Date();
}
