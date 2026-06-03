import { NextRequest } from "next/server";
import { z } from "zod";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { award } from "@/lib/wallet";
import { log } from "@/lib/audit";
import { rateLimit, DEFAULT_MUTATION } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  category: z.string().min(1).max(80),
  mode: z.enum(["PERCENT", "FIXED"]),
  rate: z.coerce.number().positive().max(100),
  goalId: z.string().min(1),
});

export async function GET(req: NextRequest) {
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const items = await prisma.viceTax.findMany({
    where: { userId: r.user.id },
    include: { goal: { select: { id: true, name: true, currentAmount: true, targetAmount: true } } },
    orderBy: { createdAt: "desc" },
  });
  return ok({ items });
}

export async function POST(req: NextRequest) {
  const rl = rateLimit(req, { key: "vice-taxes", ...DEFAULT_MUTATION });
  if (rl) return rl;
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const parsed = createSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return bad("Invalid input", 400);

  const goal = await prisma.goal.findUnique({ where: { id: parsed.data.goalId } });
  if (!goal || goal.userId !== r.user.id) return bad("Invalid goal", 400);

  const tax = await prisma.viceTax.upsert({
    where: { userId_category: { userId: r.user.id, category: parsed.data.category } },
    update: {
      mode: parsed.data.mode,
      rate: parsed.data.rate,
      goalId: parsed.data.goalId,
      enabled: true,
    },
    create: {
      userId: r.user.id,
      category: parsed.data.category,
      mode: parsed.data.mode,
      rate: parsed.data.rate,
      goalId: parsed.data.goalId,
    },
  });

  // Public commitment SC bonus, once per vice tax creation.
  await award({
    userId: r.user.id,
    currency: "SC",
    delta: 10,
    reason: "GOAL_MILESTONE",
    refType: "ViceTax",
    refId: tax.id,
    meta: { kind: "commit" },
  });

  await log(r.user.id, "create", { entity: "ViceTax", entityId: tax.id, req });
  const { evaluate: evalAch } = await import("@/lib/achievements/engine");
  evalAch(r.user.id, { type: "vice-tax-created" }).catch(() => {});
  return ok({ tax });
}
