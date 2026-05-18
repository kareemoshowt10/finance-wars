import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";

function normalize(s: string) {
  return s.toLowerCase().replace(/\d+/g, "").replace(/[^a-z\s]/g, "").trim().replace(/\s+/g, " ");
}

const INTERVALS = [7, 14, 30, 365];

function matchInterval(daysAvg: number, stddev: number) {
  if (stddev > 3) return null;
  let best: number | null = null;
  let bestDiff = Infinity;
  for (const i of INTERVALS) {
    const d = Math.abs(i - daysAvg);
    if (d < bestDiff && d <= 3) {
      bestDiff = d;
      best = i;
    }
  }
  return best;
}

export async function GET(req: NextRequest) {
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const since = new Date();
  since.setMonth(since.getMonth() - 6);
  const txs = await prisma.transaction.findMany({
    where: { userId: r.user.id, type: "expense", date: { gte: since } },
    orderBy: { date: "asc" },
  });
  const groups = new Map<string, typeof txs>();
  for (const t of txs) {
    const k = normalize(t.description || t.category);
    if (!k) continue;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(t);
  }

  const results: {
    description: string;
    amount: number;
    intervalDays: number;
    lastSeen: string;
    count: number;
    monthlyEquivalent: number;
  }[] = [];

  for (const [key, items] of groups) {
    if (items.length < 3) continue;
    // similar amounts ±10%
    const amounts = items.map((i) => i.amount);
    const avg = amounts.reduce((s, x) => s + x, 0) / amounts.length;
    const within = amounts.every((a) => Math.abs(a - avg) <= avg * 0.1);
    if (!within) continue;
    // intervals
    const dates = items.map((i) => i.date.getTime()).sort((a, b) => a - b);
    const diffs: number[] = [];
    for (let i = 1; i < dates.length; i++) diffs.push((dates[i] - dates[i - 1]) / 86_400_000);
    if (diffs.length === 0) continue;
    const mean = diffs.reduce((s, x) => s + x, 0) / diffs.length;
    const sd = Math.sqrt(diffs.reduce((s, x) => s + (x - mean) ** 2, 0) / diffs.length);
    const interval = matchInterval(mean, sd);
    if (!interval) continue;
    const lastSeen = new Date(Math.max(...dates));
    const monthlyEquivalent = (avg * 30) / interval;
    results.push({
      description: items[items.length - 1].description || key,
      amount: Math.round(avg * 100) / 100,
      intervalDays: interval,
      lastSeen: lastSeen.toISOString(),
      count: items.length,
      monthlyEquivalent: Math.round(monthlyEquivalent * 100) / 100,
    });
  }

  results.sort((a, b) => b.monthlyEquivalent - a.monthlyEquivalent);
  return ok(results);
}
