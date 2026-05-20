import { NextRequest } from "next/server";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { getBalances, recentLedger } from "@/lib/wallet";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") || 25), 100);
  const [balances, ledger] = await Promise.all([
    getBalances(r.user.id),
    recentLedger(r.user.id, limit),
  ]);
  return ok({ balances, ledger });
}
