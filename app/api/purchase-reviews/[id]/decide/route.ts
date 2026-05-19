import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { parseBody } from "@/lib/validate";
import { rateLimit, DEFAULT_MUTATION } from "@/lib/ratelimit";
import { log } from "@/lib/audit";
import { decideReview } from "@/lib/purchaseReview";
import { notify } from "@/lib/notifications";

const schema = z.object({ status: z.enum(["APPROVED", "DENIED"]) });

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const rl = rateLimit(req, { key: "review-decide", ...DEFAULT_MUTATION });
  if (rl) return rl;
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const { data, error } = await parseBody(req, schema);
  if (error) return error;
  try {
    const review = await decideReview(params.id, r.user.id, data.status);
    await notify(
      review.requesterUserId,
      data.status === "APPROVED" ? "BIG_PURCHASE_APPROVED" : "BIG_PURCHASE_DENIED",
      data.status === "APPROVED" ? "Purchase approved" : "Purchase denied",
      `$${review.amount.toFixed(0)} ${data.status === "APPROVED" ? "approved" : "denied"} by ${r.user.name}`,
      "/dashboard/couples",
      `review:${data.status}:${review.id}`
    );
    await log(r.user.id, "purchaseReview.decide", { entity: "purchaseReview", entityId: review.id, meta: { status: data.status }, req });
    return ok(review);
  } catch (e: unknown) {
    return bad((e as Error).message || "Failed", 400);
  }
}
