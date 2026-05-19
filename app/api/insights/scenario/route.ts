import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { computeNetWorth, upsertTodaySnapshot } from "@/lib/snapshots";
import { evaluate } from "@/lib/achievements/engine";

export const dynamic = "force-dynamic";

function num(v: string | null, def: number, min: number, max: number) {
  const n = v ? Number(v) : def;
  if (!Number.isFinite(n)) return def;
  return Math.max(min, Math.min(max, n));
}

export async function GET(req: NextRequest) {
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const { searchParams } = new URL(req.url);
  const save = num(searchParams.get("save"), 0, 0, 10_000);
  const cut = num(searchParams.get("cut"), 0, 0, 2_000);
  const windfall = num(searchParams.get("windfall"), 0, 0, 50_000);

  await upsertTodaySnapshot(r.user.id).catch(() => {});
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const current = await computeNetWorth(r.user.id);

  // Derive monthly growth rate from last 90 days of snapshots
  const ninetyAgo = new Date(today);
  ninetyAgo.setDate(today.getDate() - 90);
  const snaps = await prisma.netWorthSnapshot.findMany({
    where: { userId: r.user.id, date: { gte: ninetyAgo } },
    orderBy: { date: "asc" },
  });
  let monthlyGrowth = 0;
  if (snaps.length >= 2) {
    const first = snaps[0];
    const last = snaps[snaps.length - 1];
    const days = Math.max(1, (last.date.getTime() - first.date.getTime()) / 86400000);
    const totalChange = last.value - first.value;
    monthlyGrowth = (totalChange / days) * 30;
  }

  const months = 24;
  const baseline: { m: number; date: string; value: number }[] = [];
  const scenario: { m: number; date: string; value: number }[] = [];

  for (let i = 0; i <= months; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
    const dateStr = d.toISOString().slice(0, 10);
    baseline.push({ m: i, date: dateStr, value: Math.round(current + monthlyGrowth * i) });
    const extra = (save + cut) * i;
    const oneShot = i >= 1 ? windfall : 0;
    scenario.push({ m: i, date: dateStr, value: Math.round(current + monthlyGrowth * i + extra + oneShot) });
  }

  const endBaseline = baseline[baseline.length - 1].value;
  const endScenario = scenario[scenario.length - 1].value;

  let monthsTo10kFaster: number | null = null;
  const target = current + 10_000;
  let baseMonth = -1, scenMonth = -1;
  for (let i = 0; i <= months; i++) {
    if (baseMonth === -1 && baseline[i].value >= target) baseMonth = i;
    if (scenMonth === -1 && scenario[i].value >= target) scenMonth = i;
  }
  if (baseMonth >= 0 && scenMonth >= 0) monthsTo10kFaster = baseMonth - scenMonth;
  else if (scenMonth >= 0 && baseMonth === -1) monthsTo10kFaster = months - scenMonth;

  evaluate(r.user.id, { type: "visit-scenarios" }).catch(() => {});

  return ok({ baseline, scenario, endBaseline, endScenario, monthsTo10kFaster, monthlyGrowth, current });
}
