import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";

export async function GET() {
  const user = await requireUser();
  if (!user) return bad("Unauthorized", 401);

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const recentTx = await prisma.transaction.findMany({
    where: { userId: user.id, date: { gte: lastMonthStart } },
  });

  // MoM per category (expense)
  const thisMonth: Record<string, number> = {};
  const lastMonth: Record<string, number> = {};
  for (const t of recentTx) {
    if (t.type !== "expense") continue;
    const bucket = t.date >= thisMonthStart ? thisMonth : lastMonth;
    bucket[t.category] = (bucket[t.category] || 0) + t.amount;
  }
  const categories = Array.from(new Set([...Object.keys(thisMonth), ...Object.keys(lastMonth)]));
  const mom = categories.map((c) => {
    const cur = thisMonth[c] || 0;
    const prev = lastMonth[c] || 0;
    const change = prev === 0 ? (cur > 0 ? 100 : 0) : ((cur - prev) / prev) * 100;
    return { category: c, current: cur, previous: prev, change };
  }).sort((a, b) => b.current - a.current);

  // Snapshots last 90 days + linear regression forecast
  const ninetyAgo = new Date(now);
  ninetyAgo.setDate(now.getDate() - 90);
  const snaps = await prisma.netWorthSnapshot.findMany({
    where: { userId: user.id, date: { gte: ninetyAgo } },
    orderBy: { date: "asc" },
  });
  const points = snaps.map((s, i) => ({ x: i, y: s.value, date: s.date.toISOString().slice(0, 10) }));
  let slope = 0, intercept = 0;
  if (points.length > 1) {
    const n = points.length;
    const sumX = points.reduce((s, p) => s + p.x, 0);
    const sumY = points.reduce((s, p) => s + p.y, 0);
    const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
    const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0);
    slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX || 1);
    intercept = (sumY - slope * sumX) / n;
  }
  const residuals = points.map((p) => p.y - (slope * p.x + intercept));
  const stddev = Math.sqrt(residuals.reduce((s, r) => s + r * r, 0) / Math.max(1, residuals.length));
  const forecast: { date: string; value: number; low: number; high: number; actual?: number }[] = [];
  for (const p of points) {
    forecast.push({ date: p.date, value: Math.round(slope * p.x + intercept), low: 0, high: 0, actual: p.y });
  }
  const lastX = points.length ? points[points.length - 1].x : 0;
  for (let i = 1; i <= 90; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const x = lastX + i;
    const v = slope * x + intercept;
    forecast.push({
      date: d.toISOString().slice(0, 10),
      value: Math.round(v),
      low: Math.round(v - stddev * 1.5),
      high: Math.round(v + stddev * 1.5),
    });
  }

  // Anomalies: tx > 2 stddev above category mean
  const allTx = await prisma.transaction.findMany({
    where: { userId: user.id, type: "expense" },
    orderBy: { date: "desc" },
    take: 500,
  });
  const byCat: Record<string, number[]> = {};
  for (const t of allTx) (byCat[t.category] ||= []).push(t.amount);
  const stats: Record<string, { mean: number; sd: number }> = {};
  for (const [c, arr] of Object.entries(byCat)) {
    const m = arr.reduce((s, x) => s + x, 0) / arr.length;
    const sd = Math.sqrt(arr.reduce((s, x) => s + (x - m) ** 2, 0) / arr.length);
    stats[c] = { mean: m, sd };
  }
  const anomalies = allTx
    .filter((t) => {
      const s = stats[t.category];
      return s && s.sd > 0 && t.amount > s.mean + 2 * s.sd;
    })
    .slice(0, 5)
    .map((t) => ({
      id: t.id, amount: t.amount, category: t.category,
      description: t.description, date: t.date.toISOString(),
      categoryMean: Math.round(stats[t.category].mean),
    }));

  // Heatmap: last 12 weeks; day-of-week x week
  const heatStart = new Date(now);
  heatStart.setDate(now.getDate() - 12 * 7);
  const heatTx = allTx.filter((t) => t.date >= heatStart);
  const heat: { week: number; dow: number; amount: number }[] = [];
  const heatMap = new Map<string, number>();
  for (const t of heatTx) {
    const diffDays = Math.floor((t.date.getTime() - heatStart.getTime()) / (1000 * 60 * 60 * 24));
    const week = Math.floor(diffDays / 7);
    const dow = t.date.getDay();
    const key = `${week}:${dow}`;
    heatMap.set(key, (heatMap.get(key) || 0) + t.amount);
  }
  for (let w = 0; w < 12; w++) {
    for (let d = 0; d < 7; d++) {
      heat.push({ week: w, dow: d, amount: Math.round(heatMap.get(`${w}:${d}`) || 0) });
    }
  }

  // Savings rate last 6 months
  const sixAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const sixTx = await prisma.transaction.findMany({
    where: { userId: user.id, date: { gte: sixAgo } },
  });
  const monthly: Record<string, { income: number; spend: number }> = {};
  for (const t of sixTx) {
    const k = `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, "0")}`;
    monthly[k] ||= { income: 0, spend: 0 };
    if (t.type === "income") monthly[k].income += t.amount;
    else monthly[k].spend += t.amount;
  }
  const savings: { month: string; rate: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const m = monthly[k] || { income: 0, spend: 0 };
    const rate = m.income > 0 ? Math.max(0, ((m.income - m.spend) / m.income) * 100) : 0;
    savings.push({ month: d.toLocaleDateString("en-US", { month: "short" }), rate: Math.round(rate) });
  }

  return ok({ mom, forecast, anomalies, heat, savings, slope, stddev });
}
