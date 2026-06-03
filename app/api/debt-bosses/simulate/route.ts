import { NextRequest } from "next/server";
import { z } from "zod";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { getDebtBosses } from "@/lib/debtBoss";
import { simulatePayoff } from "@/lib/payoffSim";
import { rateLimit, DEFAULT_MUTATION } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

const schema = z.object({
  extraMonthly: z.coerce.number().min(0).max(1_000_000),
  strategy: z.enum(["avalanche", "snowball", "even"]),
  horizonMonths: z.coerce.number().int().min(1).max(600).optional(),
});

export async function POST(req: NextRequest) {
  const rl = rateLimit(req, { key: "debt-simulate", ...DEFAULT_MUTATION });
  if (rl) return rl;
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return bad("Invalid input", 400);

  const bosses = await getDebtBosses(r.user.id);
  const alive = bosses.filter((b) => !b.defeated);

  const withExtra = simulatePayoff({
    bosses: alive,
    extraMonthly: parsed.data.extraMonthly,
    strategy: parsed.data.strategy,
    horizonMonths: parsed.data.horizonMonths,
  });
  const baseline = simulatePayoff({
    bosses: alive,
    extraMonthly: 0,
    strategy: parsed.data.strategy,
    horizonMonths: parsed.data.horizonMonths,
  });

  return ok({
    withExtra,
    baseline,
    savings: {
      interest: Math.round((baseline.totalInterest - withExtra.totalInterest) * 100) / 100,
      months:
        baseline.payoffMonths != null && withExtra.payoffMonths != null
          ? baseline.payoffMonths - withExtra.payoffMonths
          : null,
    },
  });
}
