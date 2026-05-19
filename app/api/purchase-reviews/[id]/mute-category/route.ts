import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { rateLimit, DEFAULT_MUTATION } from "@/lib/ratelimit";
import { log } from "@/lib/audit";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const rl = rateLimit(req, { key: "review-mute", ...DEFAULT_MUTATION });
  if (rl) return rl;
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const review = await prisma.purchaseReview.findUnique({ where: { id: params.id } });
  if (!review) return bad("Not found", 404);
  if (review.approverUserId !== r.user.id && review.requesterUserId !== r.user.id) return bad("Forbidden", 403);
  const tx = await prisma.transaction.findUnique({ where: { id: review.transactionId } });
  if (!tx) return bad("Tx not found", 404);
  const muted = new Set([...(r.user.purchaseReviewMutedCategories || []), tx.category]);
  await prisma.user.update({
    where: { id: r.user.id },
    data: { purchaseReviewMutedCategories: Array.from(muted) },
  });
  await log(r.user.id, "purchaseReview.muteCategory", { entity: "category", entityId: tx.category, req });
  return ok({ muted: Array.from(muted) });
}
