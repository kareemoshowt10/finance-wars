import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { monthKey } from "@/lib/utils";
import { parseBody } from "@/lib/validate";
import { budgetSchema } from "@/lib/schemas";
import { rateLimit, DEFAULT_MUTATION } from "@/lib/ratelimit";
import { log } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month") || monthKey();
  const budgets = await prisma.budget.findMany({
    where: { userId: r.user.id, month },
    orderBy: { category: "asc" },
  });
  const [year, mon] = month.split("-").map(Number);
  const start = new Date(year, mon - 1, 1);
  const end = new Date(year, mon, 1);
  const txs = await prisma.transaction.findMany({
    where: { userId: r.user.id, type: "expense", date: { gte: start, lt: end } },
  });
  const spentByCat: Record<string, number> = {};
  for (const t of txs) spentByCat[t.category] = (spentByCat[t.category] || 0) + t.amount;
  return ok(budgets.map((b) => ({ ...b, spent: spentByCat[b.category] || 0 })));
}

export async function POST(req: NextRequest) {
  const rl = rateLimit(req, { key: "budgets", ...DEFAULT_MUTATION });
  if (rl) return rl;
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const { data, error } = await parseBody(req, budgetSchema);
  if (error) return error;
  const m = data.month || monthKey();
  try {
    const budget = await prisma.budget.upsert({
      where: { userId_category_month: { userId: r.user.id, category: data.category, month: m } },
      update: { limit: data.limit },
      create: { userId: r.user.id, category: data.category, limit: data.limit, month: m },
    });
    await log(r.user.id, "budget.upsert", {
      entity: "budget",
      entityId: budget.id,
      meta: { category: data.category, limit: data.limit, month: m },
      req,
    });
    const { evaluate: evalAch } = await import("@/lib/achievements/engine");
    evalAch(r.user.id, { type: "budget-created" }).catch(() => {});
    return ok(budget);
  } catch {
    return bad("Could not save budget");
  }
}
