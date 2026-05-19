import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { parseBody } from "@/lib/validate";
import { rateLimit, DEFAULT_MUTATION } from "@/lib/ratelimit";
import { log } from "@/lib/audit";
import { assertMember } from "@/lib/household";
import { bumpPactVersion, pactBothSigned } from "@/lib/pact";
import { notify } from "@/lib/notifications";

const patchSchema = z.object({
  bigPurchaseThreshold: z.coerce.number().nonnegative().optional(),
  emergencyFundFloor: z.coerce.number().nonnegative().optional(),
  savingsRateMin: z.coerce.number().int().min(0).max(100).optional(),
  personalAllowanceA: z.coerce.number().nonnegative().optional(),
  personalAllowanceB: z.coerce.number().nonnegative().optional(),
  requireDualSignOff: z.boolean().optional(),
});

export async function GET(req: NextRequest, { params }: { params: { hid: string } }) {
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const fb = await assertMember(r.user.id, params.hid);
  if (fb) return fb;
  const pact = await prisma.pact.findUnique({
    where: { householdId: params.hid },
    include: { signatures: { include: { user: { select: { id: true, name: true } } } } },
  });
  if (!pact) return bad("No pact", 404);
  const both = await pactBothSigned(pact.id);
  return ok({ ...pact, bothSigned: both });
}

export async function PATCH(req: NextRequest, { params }: { params: { hid: string } }) {
  const rl = rateLimit(req, { key: "pact", ...DEFAULT_MUTATION });
  if (rl) return rl;
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const fb = await assertMember(r.user.id, params.hid);
  if (fb) return fb;
  const { data, error } = await parseBody(req, patchSchema);
  if (error) return error;

  const pact = await prisma.pact.findUnique({ where: { householdId: params.hid } });
  if (!pact) return bad("No pact", 404);

  const updated = await prisma.pact.update({
    where: { id: pact.id },
    data,
  });

  await bumpPactVersion(pact.id);

  const members = await prisma.householdMember.findMany({
    where: { householdId: params.hid, accepted: true, userId: { not: null } },
  });
  for (const m of members) {
    if (m.userId) {
      await notify(
        m.userId,
        "PACT_CHANGED_AWAITING_SIGNATURE",
        "Pact updated — please re-sign",
        `${r.user.name} updated the pact. Both partners need to sign again.`,
        "/dashboard/couples",
        `pact:bump:${pact.id}:${updated.updatedAt.getTime()}:${m.userId}`
      );
    }
  }

  await log(r.user.id, "pact.update", { entity: "pact", entityId: pact.id, meta: data, req });
  return ok(updated);
}
