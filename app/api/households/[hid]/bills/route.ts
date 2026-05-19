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

const createSchema = z.object({
  name: z.string().min(1).max(80),
  amount: z.coerce.number().positive().max(1_000_000),
  frequency: z.enum(FREQ),
  nextDueDate: z.string().min(1),
  accountId: z.string().optional().nullable(),
  splitMode: z.enum(SPLIT),
  splitConfig: z.record(z.string(), z.coerce.number()).optional().default({}),
  categoryName: z.string().min(1).max(80).optional().default("Bills & Utilities"),
});

export async function GET(req: NextRequest, { params }: { params: { hid: string } }) {
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const fb = await assertMember(r.user.id, params.hid);
  if (fb) return fb;

  const bills = await prisma.sharedBill.findMany({
    where: { householdId: params.hid },
    orderBy: [{ active: "desc" }, { nextDueDate: "asc" }],
    include: {
      charges: {
        orderBy: { dueDate: "desc" },
        take: 6,
      },
    },
  });
  return ok(bills);
}

export async function POST(req: NextRequest, { params }: { params: { hid: string } }) {
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const fb = await assertMember(r.user.id, params.hid);
  if (fb) return fb;
  const { data, error } = await parseBody(req, createSchema);
  if (error) return error;

  const due = new Date(data.nextDueDate);
  if (isNaN(due.getTime())) return bad("Invalid nextDueDate", 422);

  const bill = await prisma.sharedBill.create({
    data: {
      householdId: params.hid,
      name: data.name,
      amount: data.amount,
      frequency: data.frequency,
      nextDueDate: due,
      accountId: data.accountId ?? null,
      splitMode: data.splitMode,
      splitConfig: (data.splitConfig ?? {}) as never,
      categoryName: data.categoryName,
    },
  });
  await log(r.user.id, "bill.create", { entity: "bill", entityId: bill.id, meta: { name: bill.name }, req });
  return ok(bill);
}
