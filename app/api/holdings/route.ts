import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { parseBody } from "@/lib/validate";
import { holdingSchema } from "@/lib/schemas";
import { rateLimit, DEFAULT_MUTATION } from "@/lib/ratelimit";
import { log } from "@/lib/audit";
import { getQuotes } from "@/lib/prices";

export async function GET(req: NextRequest) {
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const items = await prisma.holding.findMany({
    where: { userId: r.user.id },
    orderBy: { createdAt: "desc" },
    include: { account: { select: { name: true, type: true } } },
  });
  const quotes = await getQuotes(items.map((h) => h.symbol));
  const enriched = items.map((h) => {
    const q = quotes[h.symbol];
    const currentPrice = q?.price ?? 0;
    const marketValue = currentPrice * h.shares;
    const gain = marketValue - h.costBasis;
    const gainPct = h.costBasis > 0 ? (gain / h.costBasis) * 100 : 0;
    return { ...h, currentPrice, marketValue, gain, gainPct };
  });
  return ok(enriched);
}

export async function POST(req: NextRequest) {
  const rl = rateLimit(req, { key: "holdings", ...DEFAULT_MUTATION });
  if (rl) return rl;
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const { data, error } = await parseBody(req, holdingSchema);
  if (error) return error;
  const acct = await prisma.account.findUnique({ where: { id: data.accountId } });
  if (!acct || acct.userId !== r.user.id) return bad("Invalid account");
  if (acct.type !== "investment") return bad("Account must be an investment account");
  const h = await prisma.holding.create({
    data: {
      userId: r.user.id,
      accountId: data.accountId,
      symbol: data.symbol,
      shares: data.shares,
      costBasis: data.costBasis,
    },
  });
  await log(r.user.id, "holding.create", { entity: "holding", entityId: h.id, meta: { symbol: data.symbol }, req });
  return ok(h);
}
