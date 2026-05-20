import { NextRequest } from "next/server";
import { z } from "zod";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { FORECAST_CATEGORIES, nextMonthKey, monthKey } from "@/lib/predictions";
import { log } from "@/lib/audit";

export const dynamic = "force-dynamic";

const submitSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  category: z.string().min(1).max(60),
  forecast: z.coerce.number().min(0),
});

export async function GET(req: NextRequest) {
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);

  const items = await prisma.prediction.findMany({
    where: { userId: r.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const settled = items.filter((p) => p.accuracy != null);
  const avgAccuracy = settled.length > 0 ? Math.round(settled.reduce((s, p) => s + (p.accuracy ?? 0), 0) / settled.length) : null;

  return ok({
    items,
    categories: FORECAST_CATEGORIES,
    nextMonth: nextMonthKey(),
    thisMonth: monthKey(new Date()),
    stats: { settled: settled.length, avgAccuracy },
  });
}

export async function POST(req: NextRequest) {
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const parsed = submitSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return bad("Invalid input", 400);

  // Can only forecast current or next month and not settled.
  const allowed = [monthKey(new Date()), nextMonthKey()];
  if (!allowed.includes(parsed.data.month)) return bad("Forecast must be for this or next month");

  const prediction = await prisma.prediction.upsert({
    where: { userId_month_category: { userId: r.user.id, month: parsed.data.month, category: parsed.data.category } },
    update: { forecast: parsed.data.forecast },
    create: {
      userId: r.user.id,
      month: parsed.data.month,
      category: parsed.data.category,
      forecast: parsed.data.forecast,
    },
  });
  await log(r.user.id, "predict", { entity: "Prediction", entityId: prediction.id, req });
  return ok({ prediction });
}
