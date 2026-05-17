import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { monthKey } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const user = await requireUser();
  if (!user) return bad("Unauthorized", 401);
  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month") || monthKey();
  const budgets = await prisma.budget.findMany({
    where: { userId: user.id, month },
    orderBy: { category: "asc" },
  });
  // compute spent per category for this month
  const [year, mon] = month.split("-").map(Number);
  const start = new Date(year, mon - 1, 1);
  const end = new Date(year, mon, 1);
  const txs = await prisma.transaction.findMany({
    where: { userId: user.id, type: "expense", date: { gte: start, lt: end } },
  });
  const spentByCat: Record<string, number> = {};
  for (const t of txs) spentByCat[t.category] = (spentByCat[t.category] || 0) + t.amount;

  return ok(
    budgets.map((b) => ({ ...b, spent: spentByCat[b.category] || 0 }))
  );
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (!user) return bad("Unauthorized", 401);
  const body = await req.json().catch(() => null);
  if (!body) return bad("Invalid JSON");
  const { category, limit, month } = body as { category?: string; limit?: number; month?: string };
  if (!category || limit === undefined) return bad("Category and limit required");
  const m = month || monthKey();
  try {
    const budget = await prisma.budget.upsert({
      where: { userId_category_month: { userId: user.id, category, month: m } },
      update: { limit: Number(limit) },
      create: { userId: user.id, category, limit: Number(limit), month: m },
    });
    return ok(budget);
  } catch {
    return bad("Could not save budget");
  }
}
