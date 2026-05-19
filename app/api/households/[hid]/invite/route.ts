import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { parseBody } from "@/lib/validate";
import { rateLimit, DEFAULT_MUTATION } from "@/lib/ratelimit";
import { log } from "@/lib/audit";
import { assertMember } from "@/lib/household";
import { notify } from "@/lib/notifications";

const schema = z.object({ email: z.string().email().toLowerCase() });

export async function POST(req: NextRequest, { params }: { params: { hid: string } }) {
  const rl = rateLimit(req, { key: "household-invite", ...DEFAULT_MUTATION });
  if (rl) return rl;
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const fb = await assertMember(r.user.id, params.hid);
  if (fb) return fb;
  const { data, error } = await parseBody(req, schema);
  if (error) return error;

  if (data.email === r.user.email.toLowerCase()) {
    return bad("You can't invite yourself");
  }

  const invitedUser = await prisma.user.findUnique({ where: { email: data.email } });

  let member;
  try {
    member = await prisma.householdMember.create({
      data: {
        householdId: params.hid,
        userId: invitedUser?.id ?? null,
        inviteEmail: data.email,
        role: "MEMBER",
        accepted: false,
      },
    });
  } catch {
    return bad("This email is already invited.");
  }

  if (invitedUser) {
    await notify(
      invitedUser.id,
      "HOUSEHOLD_INVITE_RECEIVED",
      "Household invite",
      `${r.user.name} invited you to a household.`,
      "/dashboard/couples",
      `household:invite:${params.hid}:${invitedUser.id}`
    );
  }

  await log(r.user.id, "household.invite", {
    entity: "household",
    entityId: params.hid,
    meta: { email: data.email },
    req,
  });

  const link = `/dashboard/couples?accept=${params.hid}`;
  return ok({ member, link });
}
