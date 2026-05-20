import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBalances } from "@/lib/wallet";
import MarketplaceView from "./MarketplaceView";

export const dynamic = "force-dynamic";

export default async function MarketplacePage() {
  const user = await requireUser();
  if (!user) redirect("/login");
  const [items, balances, recent] = await Promise.all([
    prisma.marketplaceItem.findMany({ where: { active: true }, orderBy: [{ category: "asc" }, { cost: "asc" }] }),
    getBalances(user.id),
    prisma.redemption.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 10, include: { item: true } }),
  ]);
  return <MarketplaceView items={items} balances={balances} recent={recent.map((r) => ({ id: r.id, name: r.item.name, cost: r.cost, currency: r.currency, createdAt: r.createdAt.toISOString() }))} />;
}
