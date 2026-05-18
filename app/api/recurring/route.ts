import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { parseBody } from "@/lib/validate";
import { recurringSchema } from "@/lib/schemas";
import { rateLimit, DEFAULT_MUTATION } from "@/lib/ratelimit";
import { log } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const items = await prisma.recurringTransaction.findMany({
    where: { userId: r.user.id },
    orderBy: { nextRunDate: "asc" },
    include: { account: { select: { name: true } } },
  });
  return ok(items);
}

export async function POST(req: NextRequest) {
  const rl = rateLimit(req, { key: "recurring", ...DEFAULT_MUTATION });
  if (rl) return rl;
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const { data, error } = await parseBody(req, recurringSchema);
  if (error) return error;
  const acct = await prisma.account.findUnique({ where: { id: data.accountId } });
  if (!acct || acct.userId !== r.user.id) return bad("Invalid account");
  const item = await prisma.recurringTransaction.create({
    data: {
      userId: r.user.id,
      accountId: data.accountId,
      amount: Math.abs(data.amount),
      type: data.type,
      category: data.category,
      description: data.description || data.category,
      frequency: data.frequency,
      nextRunDate: new Date(data.nextRunDate),
      active: true,
    },
  });
  await log(r.user.id, "recurring.create", { entity: "recurring", entityId: item.id, meta: { amount: item.amount }, req });
  return ok(item);
}
