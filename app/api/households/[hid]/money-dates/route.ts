import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { parseBody } from "@/lib/validate";
import { rateLimit, DEFAULT_MUTATION } from "@/lib/ratelimit";
import { log } from "@/lib/audit";
import { assertMember } from "@/lib/household";

const schema = z.object({
  scheduledAt: z.string().min(1),
  durationMin: z.coerce.number().int().positive().optional().default(30),
  cadence: z.enum(["WEEKLY", "BIWEEKLY", "MONTHLY", "ONEOFF"]).optional().default("WEEKLY"),
});

export async function GET(req: NextRequest, { params }: { params: { hid: string } }) {
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const fb = await assertMember(r.user.id, params.hid);
  if (fb) return fb;
  const now = new Date();
  const [upcoming, history] = await Promise.all([
    prisma.moneyDate.findMany({
      where: { householdId: params.hid, scheduledAt: { gte: now } },
      orderBy: { scheduledAt: "asc" },
    }),
    prisma.moneyDate.findMany({
      where: { householdId: params.hid, scheduledAt: { lt: now } },
      orderBy: { scheduledAt: "desc" },
      take: 10,
    }),
  ]);
  return ok({ upcoming, history });
}

export async function POST(req: NextRequest, { params }: { params: { hid: string } }) {
  const rl = rateLimit(req, { key: "money-dates", ...DEFAULT_MUTATION });
  if (rl) return rl;
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const fb = await assertMember(r.user.id, params.hid);
  if (fb) return fb;
  const { data, error } = await parseBody(req, schema);
  if (error) return error;
  const md = await prisma.moneyDate.create({
    data: {
      householdId: params.hid,
      scheduledAt: new Date(data.scheduledAt),
      durationMin: data.durationMin,
      cadence: data.cadence,
    },
  });
  await log(r.user.id, "moneyDate.create", { entity: "moneyDate", entityId: md.id, req });
  return ok(md);
}
