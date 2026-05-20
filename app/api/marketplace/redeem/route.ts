import { NextRequest } from "next/server";
import { z } from "zod";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { spend } from "@/lib/wallet";
import { log } from "@/lib/audit";

export const dynamic = "force-dynamic";

const redeemSchema = z.object({ itemId: z.string().min(1) });

export async function POST(req: NextRequest) {
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const parsed = redeemSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return bad("Invalid input", 400);

  const item = await prisma.marketplaceItem.findUnique({ where: { id: parsed.data.itemId } });
  if (!item || !item.active) return bad("Item not available", 404);

  try {
    await spend(r.user.id, item.currency as never, item.cost, {
      refType: "MarketplaceItem",
      refId: item.id,
      meta: { slug: item.slug },
    });
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "INSUFFICIENT_BALANCE") return bad("Not enough balance", 402);
    return bad("Redemption failed", 500);
  }

  const redemption = await prisma.redemption.create({
    data: {
      userId: r.user.id,
      itemId: item.id,
      cost: item.cost,
      currency: item.currency,
      meta: item.payload as never,
    },
  });

  await log(r.user.id, "redeem", { entity: "Redemption", entityId: redemption.id, meta: { slug: item.slug }, req });
  return ok({ redemption });
}
