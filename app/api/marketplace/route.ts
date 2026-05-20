import { NextRequest } from "next/server";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getBalances } from "@/lib/wallet";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const [items, balances] = await Promise.all([
    prisma.marketplaceItem.findMany({ where: { active: true }, orderBy: [{ category: "asc" }, { cost: "asc" }] }),
    getBalances(r.user.id),
  ]);
  return ok({ items, balances });
}
