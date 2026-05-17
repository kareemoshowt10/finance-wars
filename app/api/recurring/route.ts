import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";

const FREQ = ["WEEKLY", "BIWEEKLY", "MONTHLY", "YEARLY"];

export async function GET() {
  const user = await requireUser();
  if (!user) return bad("Unauthorized", 401);
  const items = await prisma.recurringTransaction.findMany({
    where: { userId: user.id },
    orderBy: { nextRunDate: "asc" },
    include: { account: { select: { name: true } } },
  });
  return ok(items);
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (!user) return bad("Unauthorized", 401);
  const body = await req.json().catch(() => null);
  if (!body) return bad("Invalid JSON");
  const { accountId, amount, type, category, description, frequency, nextRunDate } = body;
  if (!accountId || !amount || !type || !category || !frequency || !nextRunDate)
    return bad("All fields required");
  if (!FREQ.includes(frequency)) return bad("Invalid frequency");
  if (type !== "income" && type !== "expense") return bad("Invalid type");
  const acct = await prisma.account.findUnique({ where: { id: accountId } });
  if (!acct || acct.userId !== user.id) return bad("Invalid account");
  const item = await prisma.recurringTransaction.create({
    data: {
      userId: user.id,
      accountId,
      amount: Math.abs(Number(amount)),
      type,
      category,
      description: description || category,
      frequency,
      nextRunDate: new Date(nextRunDate),
      active: true,
    },
  });
  return ok(item);
}
