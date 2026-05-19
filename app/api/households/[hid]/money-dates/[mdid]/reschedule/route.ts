import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { parseBody } from "@/lib/validate";
import { rateLimit, DEFAULT_MUTATION } from "@/lib/ratelimit";
import { log } from "@/lib/audit";
import { assertMember } from "@/lib/household";

const schema = z.object({ scheduledAt: z.string().min(1) });

export async function POST(req: NextRequest, { params }: { params: { hid: string; mdid: string } }) {
  const rl = rateLimit(req, { key: "md-reschedule", ...DEFAULT_MUTATION });
  if (rl) return rl;
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const fb = await assertMember(r.user.id, params.hid);
  if (fb) return fb;
  const { data, error } = await parseBody(req, schema);
  if (error) return error;
  const md = await prisma.moneyDate.update({
    where: { id: params.mdid },
    data: { scheduledAt: new Date(data.scheduledAt), status: "RESCHEDULED" },
  });
  await log(r.user.id, "moneyDate.reschedule", { entity: "moneyDate", entityId: md.id, req });
  return ok(md);
}
