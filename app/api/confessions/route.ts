import { NextRequest } from "next/server";
import { z } from "zod";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { award, REWARDS } from "@/lib/wallet";
import { getActiveHousehold } from "@/lib/household";
import { log } from "@/lib/audit";

export const dynamic = "force-dynamic";

const confessSchema = z.object({
  amount: z.coerce.number().positive(),
  category: z.string().min(1).max(80),
  note: z.string().max(500).optional(),
  transactionId: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const items = await prisma.confession.findMany({
    where: { userId: r.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return ok({ items });
}

export async function POST(req: NextRequest) {
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const body = await req.json().catch(() => ({}));
  const parsed = confessSchema.safeParse(body);
  if (!parsed.success) return bad("Invalid input", 400);

  const household = await getActiveHousehold(r.user.id);
  const confession = await prisma.confession.create({
    data: {
      userId: r.user.id,
      householdId: household?.id,
      transactionId: parsed.data.transactionId,
      amount: parsed.data.amount,
      category: parsed.data.category,
      note: parsed.data.note,
    },
  });

  // Reward honest pre-emptive disclosure with Trust Points.
  const tpDelta = REWARDS.CONFESSION_HONEST;
  await award({
    userId: r.user.id,
    currency: "TP",
    delta: tpDelta,
    reason: "CONFESSION_HONEST",
    refType: "Confession",
    refId: confession.id,
    householdId: household?.id,
    meta: { amount: parsed.data.amount, category: parsed.data.category },
  });

  // And a smaller SC bonus for participating in transparency culture.
  await award({
    userId: r.user.id,
    currency: "SC",
    delta: 5,
    reason: "CONFESSION_HONEST",
    refType: "Confession",
    refId: confession.id,
    householdId: household?.id,
  });

  await log(r.user.id, "create", { entity: "Confession", entityId: confession.id, req });

  // Notify partner(s)
  if (household) {
    const members = await prisma.householdMember.findMany({
      where: { householdId: household.id, accepted: true, userId: { not: r.user.id } },
    });
    for (const m of members) {
      if (!m.userId) continue;
      await prisma.notification.create({
        data: {
          userId: m.userId,
          kind: "CONFESSION",
          title: `${r.user.name} confessed a purchase`,
          body: `$${parsed.data.amount.toFixed(2)} in ${parsed.data.category}. Verify to award Trust Points.`,
          link: "/dashboard/couples/trust",
        },
      }).catch(() => {});
    }
  }

  return ok({ confession, awarded: { TP: tpDelta, SC: 5 } });
}
