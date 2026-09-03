import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { assertMember } from "@/lib/household";
import { isValidTimeZone } from "@/lib/time";
import { pactBothSigned } from "@/lib/pact";
import { log } from "@/lib/audit";

export async function GET(req: NextRequest, { params }: { params: { hid: string } }) {
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const fb = await assertMember(r.user.id, params.hid);
  if (fb) return fb;

  const household = await prisma.household.findUnique({
    where: { id: params.hid },
    include: {
      pact: { include: { signatures: true } },
      members: { include: { user: { select: { id: true, email: true, name: true } } } },
    },
  });
  if (!household) return bad("Not found", 404);

  const myShares = await prisma.accountShare.findMany({
    where: { householdId: params.hid, ownerUserId: r.user.id },
  });
  const myAccounts = await prisma.account.findMany({
    where: { userId: r.user.id },
    select: { id: true, name: true, type: true, balance: true },
  });

  const bothSigned = household.pact ? await pactBothSigned(household.pact.id) : false;
  const pendingInvites = household.members.filter((m) => !m.accepted && !m.declined);

  return ok({
    ...household,
    myShares,
    myAccounts,
    pactBothSigned: bothSigned,
    pendingInvites,
  });
}

const updateSchema = z.object({
  name: z.string().min(1).max(60).optional(),
  timezone: z.string().min(1).max(64).optional(),
});

/**
 * Household settings. The timezone matters more than it looks: it decides
 * when the shared streak rolls over, when a chore is "due today", when Daily
 * Objectives reset, and when the at-risk nudge fires. Any member can set it —
 * it describes where the household is, not who's in charge.
 */
export async function PATCH(req: NextRequest, { params }: { params: { hid: string } }) {
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const fb = await assertMember(r.user.id, params.hid);
  if (fb) return fb;

  const parsed = updateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return bad("Invalid input", 400);
  if (parsed.data.timezone && !isValidTimeZone(parsed.data.timezone)) {
    return bad("Unrecognised timezone");
  }
  if (!parsed.data.name && !parsed.data.timezone) return bad("Nothing to update");

  const household = await prisma.household.update({
    where: { id: params.hid },
    data: parsed.data,
    select: { id: true, name: true, timezone: true },
  });
  await log(r.user.id, "update", { entity: "Household", entityId: params.hid, meta: parsed.data, req });

  return ok({ household });
}
