import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { rateLimit, DEFAULT_MUTATION } from "@/lib/ratelimit";
import { log } from "@/lib/audit";
import { notify } from "@/lib/notifications";

export async function POST(req: NextRequest, { params }: { params: { hid: string } }) {
  const rl = rateLimit(req, { key: "household-accept", ...DEFAULT_MUTATION });
  if (rl) return rl;
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);

  const invite = await prisma.householdMember.findFirst({
    where: {
      householdId: params.hid,
      OR: [{ userId: r.user.id }, { inviteEmail: r.user.email.toLowerCase() }],
      accepted: false,
      declined: false,
    },
  });
  if (!invite) return bad("No invite found", 404);

  // Avoid unique constraint by deleting any existing dupe rows first
  const existing = await prisma.householdMember.findFirst({
    where: { householdId: params.hid, userId: r.user.id, accepted: true },
  });
  if (existing) {
    await prisma.householdMember.delete({ where: { id: invite.id } });
    return ok({ ok: true });
  }

  const member = await prisma.householdMember.update({
    where: { id: invite.id },
    data: { userId: r.user.id, accepted: true, joinedAt: new Date() },
  });

  // Notify other members
  const others = await prisma.householdMember.findMany({
    where: { householdId: params.hid, accepted: true, userId: { not: r.user.id } },
  });
  for (const o of others) {
    if (o.userId) {
      await notify(
        o.userId,
        "HOUSEHOLD_INVITE_ACCEPTED",
        "Household invite accepted",
        `${r.user.name} joined your household.`,
        "/dashboard/couples",
        `household:joined:${params.hid}:${r.user.id}`
      );
    }
  }

  await log(r.user.id, "household.accept", { entity: "household", entityId: params.hid, req });
  return ok({ member });
}
