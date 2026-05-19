import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { assertMember } from "@/lib/household";
import { pactBothSigned } from "@/lib/pact";

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
