import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { rateLimit, DEFAULT_MUTATION } from "@/lib/ratelimit";
import { log } from "@/lib/audit";

export async function POST(req: NextRequest, { params }: { params: { hid: string } }) {
  const rl = rateLimit(req, { key: "household-decline", ...DEFAULT_MUTATION });
  if (rl) return rl;
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const invite = await prisma.householdMember.findFirst({
    where: {
      householdId: params.hid,
      OR: [{ userId: r.user.id }, { inviteEmail: r.user.email.toLowerCase() }],
      accepted: false,
    },
  });
  if (!invite) return bad("No invite", 404);
  await prisma.householdMember.update({
    where: { id: invite.id },
    data: { declined: true, userId: r.user.id },
  });
  await log(r.user.id, "household.decline", { entity: "household", entityId: params.hid, req });
  return ok({ ok: true });
}
