import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { rateLimit, DEFAULT_MUTATION } from "@/lib/ratelimit";
import { log } from "@/lib/audit";
import { assertMember } from "@/lib/household";
import { signPact } from "@/lib/pact";
import { notify } from "@/lib/notifications";

export async function POST(req: NextRequest, { params }: { params: { hid: string } }) {
  const rl = rateLimit(req, { key: "pact-sign", ...DEFAULT_MUTATION });
  if (rl) return rl;
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const fb = await assertMember(r.user.id, params.hid);
  if (fb) return fb;
  const pact = await prisma.pact.findUnique({ where: { householdId: params.hid } });
  if (!pact) return bad("No pact", 404);

  const result = await signPact(pact.id, r.user.id);

  if (result.bothSigned) {
    const members = await prisma.householdMember.findMany({
      where: { householdId: params.hid, accepted: true, userId: { not: null } },
    });
    for (const m of members) {
      if (m.userId) {
        await notify(
          m.userId,
          "PACT_FULLY_SIGNED",
          "Pact signed by both partners",
          "Your household pact is now active.",
          "/dashboard/couples",
          `pact:full:${pact.id}:${result.version}:${m.userId}`
        );
      }
    }
  }

  await log(r.user.id, "pact.sign", { entity: "pact", entityId: pact.id, meta: { version: result.version }, req });
  return ok(result);
}
