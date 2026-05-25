import { NextRequest } from "next/server";
import { z } from "zod";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { award, REWARDS } from "@/lib/wallet";
import { getActiveHousehold } from "@/lib/household";
import { log } from "@/lib/audit";
import { rateLimit, DEFAULT_MUTATION } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

const verifySchema = z.object({
  targetUserId: z.string().min(1),
  kind: z.enum(["CONFESSION", "PACT_KEPT", "REVIEW_APPROVED", "MANUAL"]),
  refType: z.string().max(60).optional(),
  refId: z.string().max(60).optional(),
  note: z.string().max(300).optional(),
});

const KIND_REWARD = {
  CONFESSION: REWARDS.PARTNER_VERIFY,
  PACT_KEPT: REWARDS.PACT_KEPT,
  REVIEW_APPROVED: REWARDS.REVIEW_APPROVED,
  MANUAL: REWARDS.PARTNER_VERIFY,
} as const;

export async function POST(req: NextRequest) {
  const rl = rateLimit(req, { key: "trust:verify", ...DEFAULT_MUTATION });
  if (rl) return rl;
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const parsed = verifySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return bad("Invalid input", 400);

  if (parsed.data.targetUserId === r.user.id) return bad("Cannot verify yourself", 400);

  const household = await getActiveHousehold(r.user.id);
  if (!household) return bad("No active household", 400);

  // Confirm both users are in the same household.
  const both = await prisma.householdMember.findMany({
    where: { householdId: household.id, accepted: true, userId: { in: [r.user.id, parsed.data.targetUserId] } },
  });
  if (both.length < 2) return bad("Target is not a household member", 403);

  // Prevent double-issuing TP for the same ref.
  if (parsed.data.refType && parsed.data.refId) {
    const existing = await prisma.walletEntry.findFirst({
      where: {
        userId: parsed.data.targetUserId,
        fromUserId: r.user.id,
        refType: parsed.data.refType,
        refId: parsed.data.refId,
        currency: "TP",
      },
    });
    if (existing) return bad("Already verified", 409);
  }

  const delta = KIND_REWARD[parsed.data.kind];
  const entry = await award({
    userId: parsed.data.targetUserId,
    currency: "TP",
    delta,
    reason: parsed.data.kind === "CONFESSION" ? "PARTNER_VERIFY" : parsed.data.kind === "PACT_KEPT" ? "PACT_KEPT" : "REVIEW_APPROVED",
    refType: parsed.data.refType,
    refId: parsed.data.refId,
    fromUserId: r.user.id,
    householdId: household.id,
    meta: { note: parsed.data.note },
  });

  // Mark confession partnerSeen if applicable.
  if (parsed.data.kind === "CONFESSION" && parsed.data.refType === "Confession" && parsed.data.refId) {
    await prisma.confession.update({
      where: { id: parsed.data.refId },
      data: { partnerSeen: true },
    }).catch(() => {});
  }

  await prisma.notification.create({
    data: {
      userId: parsed.data.targetUserId,
      kind: "TRUST_AWARDED",
      title: `${r.user.name} awarded you ${delta} Trust Points`,
      body: parsed.data.note || `For: ${parsed.data.kind.toLowerCase().replace("_", " ")}`,
      link: "/dashboard/couples/trust",
    },
  }).catch(() => {});

  await log(r.user.id, "verify", { entity: "Trust", entityId: entry?.id, meta: parsed.data, req });
  return ok({ awarded: delta, entry });
}
