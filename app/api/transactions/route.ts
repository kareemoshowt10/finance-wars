import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { parseBody } from "@/lib/validate";
import { txSchema } from "@/lib/schemas";
import { rateLimit, DEFAULT_MUTATION } from "@/lib/ratelimit";
import { log } from "@/lib/audit";
import { checkBudgetThresholds, checkLargeTransaction } from "@/lib/notifications";

export async function GET(req: NextRequest) {
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const type = searchParams.get("type");
  const search = searchParams.get("q");
  const sort = searchParams.get("sort") || "date";
  const order = (searchParams.get("order") || "desc") as "asc" | "desc";
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const cursor = searchParams.get("cursor");
  const pageSizeRaw = searchParams.get("pageSize");
  const pageSize = Math.min(100, Math.max(1, Number(pageSizeRaw || 25)));
  const legacyLimitRaw = searchParams.get("limit");
  const legacyLimit = legacyLimitRaw ? Number(legacyLimitRaw) : 0;

  const where: Record<string, unknown> = { userId: r.user.id };
  if (category && category !== "all") where.category = category;
  if (type && type !== "all") where.type = type;
  if (search) {
    where.OR = [
      { description: { contains: search, mode: "insensitive" } },
      { category: { contains: search, mode: "insensitive" } },
    ];
  }
  if (from || to) {
    const dr: Record<string, Date> = {};
    if (from) dr.gte = new Date(from);
    if (to) dr.lte = new Date(to);
    where.date = dr;
  }

  const orderBy: Array<Record<string, "asc" | "desc">> =
    sort === "amount" ? [{ amount: order }, { id: order }] : [{ date: order }, { id: order }];

  if (cursor) {
    try {
      const decoded = Buffer.from(cursor, "base64").toString("utf8");
      const [iso, id] = decoded.split("|");
      const d = new Date(iso);
      const condition =
        order === "desc"
          ? { OR: [{ date: { lt: d } }, { date: d, id: { lt: id } }] }
          : { OR: [{ date: { gt: d } }, { date: d, id: { gt: id } }] };
      where.AND = [condition];
    } catch {
      return bad("Invalid cursor");
    }
  }

  const usingPagination = !!(cursor || pageSizeRaw);
  const take = usingPagination ? pageSize + 1 : legacyLimit || 500;
  const rows = await prisma.transaction.findMany({
    where,
    orderBy,
    take,
    include: { account: { select: { name: true, type: true } } },
  });

  if (!usingPagination) {
    return ok(rows);
  }

  const hasMore = rows.length > pageSize;
  const items = hasMore ? rows.slice(0, pageSize) : rows;
  const last = items[items.length - 1];
  const nextCursor =
    hasMore && last
      ? Buffer.from(`${last.date.toISOString()}|${last.id}`).toString("base64")
      : null;
  return ok({ items, nextCursor });
}

export async function POST(req: NextRequest) {
  const rl = rateLimit(req, { key: "transactions", ...DEFAULT_MUTATION });
  if (rl) return rl;
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const { data, error } = await parseBody(req, txSchema);
  if (error) return error;
  const acct = await prisma.account.findUnique({ where: { id: data.accountId } });
  if (!acct || acct.userId !== r.user.id) return bad("Invalid account", 400);

  const tx = await prisma.transaction.create({
    data: {
      userId: r.user.id,
      accountId: data.accountId,
      amount: Math.abs(data.amount),
      type: data.type,
      category: data.category,
      description: data.description || data.category,
      date: data.date ? new Date(data.date) : new Date(),
    },
  });
  const delta = data.type === "income" ? Math.abs(data.amount) : -Math.abs(data.amount);
  await prisma.account.update({
    where: { id: data.accountId },
    data: { balance: { increment: delta } },
  });
  const { upsertTodaySnapshot } = await import("@/lib/snapshots");
  await upsertTodaySnapshot(r.user.id);
  if (data.type === "expense") {
    await checkBudgetThresholds(r.user.id, data.category);
    await checkLargeTransaction(r.user.id, tx.id, tx.amount);
  }
  await log(r.user.id, "transaction.create", {
    entity: "transaction",
    entityId: tx.id,
    meta: { amount: tx.amount, type: tx.type },
    req,
  });
  return ok(tx);
}
