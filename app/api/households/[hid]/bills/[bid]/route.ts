import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { parseBody } from "@/lib/validate";
import { assertMember } from "@/lib/household";
import { log } from "@/lib/audit";

const FREQ = ["ONEOFF", "MONTHLY", "WEEKLY", "BIWEEKLY", "YEARLY"] as const;
const SPLIT = ["EQUAL", "PERCENT", "INCOME_RATIO", "FIXED"] as const;

const patchSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  amount: z.coerce.number().positive().optional(),
  frequency: z.enum(FREQ).optional(),
  nextDueDate: z.string().optional(),
  accountId: z.string().optional().nullable(),
  splitMode: z.enum(SPLIT).optional(),
  splitConfig: z.record(z.string(), z.coerce.number()).optional(),
  categoryName: z.string().min(1).max(80).optional(),
  active: z.boolean().optional(),
});

async function guard(req: NextRequest, hid: string, bid: string) {
  const r = await resolveRequestUser(req);
  if (!r) return { resp: bad("Unauthorized", 401) };
  const fb = await assertMember(r.user.id, hid);
  if (fb) return { resp: fb };
  const bill = await prisma.sharedBill.findUnique({ where: { id: bid } });
  if (!bill || bill.householdId !== hid) return { resp: bad("Not found", 404) };
  return { r, bill };
}

export async function PATCH(req: NextRequest, { params }: { params: { hid: string; bid: string } }) {
  const g = await guard(req, params.hid, params.bid);
  if ("resp" in g) return g.resp;
  const { data, error } = await parseBody(req, patchSchema);
  if (error) return error;

  const updateData: Record<string, unknown> = { ...data };
  if (data.nextDueDate) {
    const d = new Date(data.nextDueDate);
    if (isNaN(d.getTime())) return bad("Invalid nextDueDate", 422);
    updateData.nextDueDate = d;
  }
  if (data.splitConfig) updateData.splitConfig = data.splitConfig;

  const updated = await prisma.sharedBill.update({ where: { id: params.bid }, data: updateData as never });
  await log(g.r.user.id, "bill.update", { entity: "bill", entityId: updated.id, req });
  return ok(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: { hid: string; bid: string } }) {
  const g = await guard(req, params.hid, params.bid);
  if ("resp" in g) return g.resp;
  await prisma.sharedBill.delete({ where: { id: params.bid } });
  await log(g.r.user.id, "bill.delete", { entity: "bill", entityId: params.bid, req });
  return ok({ ok: true });
}
