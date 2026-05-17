import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";

export async function GET(req: NextRequest) {
  const user = await requireUser();
  if (!user) return bad("Unauthorized", 401);
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const type = searchParams.get("type");
  const search = searchParams.get("q");
  const sort = searchParams.get("sort") || "date";
  const order = (searchParams.get("order") || "desc") as "asc" | "desc";
  const limit = Number(searchParams.get("limit") || 500);

  const where: Record<string, unknown> = { userId: user.id };
  if (category && category !== "all") where.category = category;
  if (type && type !== "all") where.type = type;
  if (search) where.description = { contains: search };

  const orderBy: Record<string, "asc" | "desc"> =
    sort === "amount" ? { amount: order } : { date: order };

  const tx = await prisma.transaction.findMany({
    where,
    orderBy,
    take: limit,
    include: { account: { select: { name: true, type: true } } },
  });
  return ok(tx);
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (!user) return bad("Unauthorized", 401);
  const body = await req.json().catch(() => null);
  if (!body) return bad("Invalid JSON");
  const { accountId, amount, type, category, description, date } = body as {
    accountId?: string; amount?: number; type?: string; category?: string; description?: string; date?: string;
  };
  if (!accountId || amount === undefined || !type || !category) {
    return bad("Account, amount, type, and category are required");
  }
  if (type !== "income" && type !== "expense") return bad("Type must be income or expense");
  const acct = await prisma.account.findUnique({ where: { id: accountId } });
  if (!acct || acct.userId !== user.id) return bad("Invalid account", 400);

  const tx = await prisma.transaction.create({
    data: {
      userId: user.id,
      accountId,
      amount: Math.abs(Number(amount)),
      type,
      category,
      description: description || category,
      date: date ? new Date(date) : new Date(),
    },
  });
  // adjust account balance
  const delta = type === "income" ? Math.abs(Number(amount)) : -Math.abs(Number(amount));
  await prisma.account.update({
    where: { id: accountId },
    data: { balance: { increment: delta } },
  });
  return ok(tx);
}
