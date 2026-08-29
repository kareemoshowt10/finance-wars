import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { assertMember, getHouseholdMembers } from "@/lib/household";
import { maybeAwardDailyBonus } from "@/lib/dailyEngagement";
import { evaluate } from "@/lib/achievements/engine";
import { log } from "@/lib/audit";

export const dynamic = "force-dynamic";

const sendSchema = z.object({
  toUserId: z.string().min(1),
  emoji: z.string().max(8).optional(),
  message: z.string().max(140).optional(),
});

export async function GET(req: NextRequest, { params }: { params: { hid: string } }) {
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const fb = await assertMember(r.user.id, params.hid);
  if (fb) return fb;

  const cheers = await prisma.householdCheer.findMany({
    where: { householdId: params.hid },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      from: { select: { id: true, name: true } },
      to: { select: { id: true, name: true } },
    },
  });
  return ok({ cheers });
}

export async function POST(req: NextRequest, { params }: { params: { hid: string } }) {
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const fb = await assertMember(r.user.id, params.hid);
  if (fb) return fb;

  const parsed = sendSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return bad("Invalid input", 400);
  if (parsed.data.toUserId === r.user.id) return bad("You can't cheer yourself");

  const members = await getHouseholdMembers(params.hid);
  if (!members.some((m) => m.userId === parsed.data.toUserId)) return bad("Recipient must be a household member");

  const cheer = await prisma.householdCheer.create({
    data: {
      householdId: params.hid,
      fromUserId: r.user.id,
      toUserId: parsed.data.toUserId,
      emoji: parsed.data.emoji || "👏",
      message: parsed.data.message,
    },
  });

  await Promise.all([
    log(r.user.id, "cheer", { entity: "HouseholdCheer", entityId: cheer.id, req }),
    evaluate(r.user.id, { type: "cheer-sent" }),
    prisma.notification
      .create({
        data: {
          userId: parsed.data.toUserId,
          kind: "CHEER_RECEIVED",
          title: `${parsed.data.emoji || "👏"} ${r.user.name} cheered you`,
          body: parsed.data.message || "Keep it up.",
          link: "/dashboard/household",
        },
      })
      .catch(() => null),
  ]);

  const bonusAwarded = await maybeAwardDailyBonus(params.hid, r.user.id);

  return ok({ cheer, bonusAwarded });
}
