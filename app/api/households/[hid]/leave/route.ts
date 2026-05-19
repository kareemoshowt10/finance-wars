import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { rateLimit, DEFAULT_MUTATION } from "@/lib/ratelimit";
import { log } from "@/lib/audit";
import { assertMember } from "@/lib/household";

export async function POST(req: NextRequest, { params }: { params: { hid: string } }) {
  const rl = rateLimit(req, { key: "household-leave", ...DEFAULT_MUTATION });
  if (rl) return rl;
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const fb = await assertMember(r.user.id, params.hid);
  if (fb) return fb;

  const me = await prisma.householdMember.findFirst({
    where: { householdId: params.hid, userId: r.user.id, accepted: true },
  });
  if (!me) return bad("Not a member", 404);

  if (me.role === "OWNER") {
    const otherOwners = await prisma.householdMember.count({
      where: { householdId: params.hid, role: "OWNER", accepted: true, userId: { not: r.user.id } },
    });
    if (otherOwners === 0) {
      return bad("Can't leave: you're the last owner. Transfer ownership or delete the household first.");
    }
  }

  await prisma.householdMember.delete({ where: { id: me.id } });
  await log(r.user.id, "household.leave", { entity: "household", entityId: params.hid, req });
  return ok({ ok: true });
}
