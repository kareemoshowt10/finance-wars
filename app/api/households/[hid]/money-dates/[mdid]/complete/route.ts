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

const schema = z.object({ decisions: z.any().optional() });

export async function POST(req: NextRequest, { params }: { params: { hid: string; mdid: string } }) {
  const rl = rateLimit(req, { key: "md-complete", ...DEFAULT_MUTATION });
  if (rl) return rl;
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const fb = await assertMember(r.user.id, params.hid);
  if (fb) return fb;
  const { data, error } = await parseBody(req, schema);
  if (error) return error;

  const md = await prisma.moneyDate.update({
    where: { id: params.mdid },
    data: { status: "COMPLETED", completedAt: new Date(), decisions: data.decisions ?? {} },
  });
  const members = await prisma.householdMember.findMany({
    where: { householdId: params.hid, accepted: true, userId: { not: null } },
  });
  for (const m of members) {
    if (m.userId) {
      await notify(
        m.userId,
        "MONEY_DATE_COMPLETED",
        "Money date complete",
        "Decisions saved.",
        "/dashboard/couples",
        `md:done:${md.id}:${m.userId}`
      );
    }
  }
  await log(r.user.id, "moneyDate.complete", { entity: "moneyDate", entityId: md.id, req });
  return ok(md);
}
