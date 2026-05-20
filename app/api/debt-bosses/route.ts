import { NextRequest } from "next/server";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { getDebtBosses, pickStrategy } from "@/lib/debtBoss";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const bosses = await getDebtBosses(r.user.id);
  const totalHp = bosses.reduce((s, b) => s + b.hp, 0);
  const totalDps = bosses.reduce((s, b) => s + b.dps30, 0);
  const defeated = bosses.filter((b) => b.defeated).length;
  return ok({
    bosses,
    summary: {
      count: bosses.length,
      defeated,
      totalHp: Math.round(totalHp * 100) / 100,
      totalDps30: Math.round(totalDps * 100) / 100,
      etaMonths: totalDps > 0 && totalHp > 0 ? Math.ceil(totalHp / totalDps) : null,
    },
    strategy: pickStrategy(bosses),
  });
}
