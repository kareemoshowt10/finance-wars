import { prisma } from "./prisma";

// Lifestyle Inflation Detector — quietly the most useful thing in the app.
// Compares the user's last N days against the prior N days, per category and
// per active recurring transaction, surfacing creeping increases that would
// otherwise feel invisible. Pure read; no mutations.

const WINDOW_DAYS = 90;
const MIN_PRIOR_SPEND = 30; // ignore categories with trivially small history
const MIN_DELTA = 25;       // ignore deltas under this dollar amount
const MIN_PCT = 0.15;       // must be at least 15% higher to count

export type CategoryCreep = {
  category: string;
  recentSpend: number;
  priorSpend: number;
  delta: number;       // recent - prior, positive = inflated
  pctChange: number;   // 0.20 = 20% more than prior
  txCount: number;
  hint: "vice-tax" | "review" | "investigate";
};

export type SubscriptionCreep = {
  recurringId: string;
  description: string;
  category: string;
  currentAmount: number;
  priorAvgAmount: number;
  delta: number;
  pctChange: number;
};

export type InflationReport = {
  windowDays: number;
  recentTotal: number;
  priorTotal: number;
  netDelta: number;        // recent - prior across ALL expenses
  netPct: number;          // overall change
  categories: CategoryCreep[];   // inflated categories, hottest first
  improvements: CategoryCreep[]; // categories where spending dropped (worth celebrating)
  subscriptions: SubscriptionCreep[];
  generatedAt: string;
};

function startOf(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function getInflationReport(userId: string, now: Date = new Date()): Promise<InflationReport> {
  const today = startOf(now);
  const recentStart = new Date(today.getTime() - WINDOW_DAYS * 86_400_000);
  const priorStart = new Date(recentStart.getTime() - WINDOW_DAYS * 86_400_000);

  const txs = await prisma.transaction.findMany({
    where: { userId, type: "expense", date: { gte: priorStart, lte: today } },
    select: { amount: true, category: true, date: true },
  });

  const recentTxs = txs.filter((t) => t.date >= recentStart);
  const priorTxs = txs.filter((t) => t.date < recentStart);

  const sumByCat = (rows: { amount: number; category: string }[]) => {
    const m: Record<string, { sum: number; count: number }> = {};
    for (const r of rows) {
      m[r.category] = m[r.category] || { sum: 0, count: 0 };
      m[r.category].sum += r.amount;
      m[r.category].count += 1;
    }
    return m;
  };
  const recent = sumByCat(recentTxs);
  const prior = sumByCat(priorTxs);

  const categories: CategoryCreep[] = [];
  const improvements: CategoryCreep[] = [];
  const allCats = new Set([...Object.keys(recent), ...Object.keys(prior)]);
  for (const cat of allCats) {
    const r = recent[cat]?.sum ?? 0;
    const p = prior[cat]?.sum ?? 0;
    if (p < MIN_PRIOR_SPEND) continue;
    const delta = r - p;
    const pct = p > 0 ? delta / p : 0;
    if (Math.abs(delta) < MIN_DELTA) continue;
    const row: CategoryCreep = {
      category: cat,
      recentSpend: Math.round(r * 100) / 100,
      priorSpend: Math.round(p * 100) / 100,
      delta: Math.round(delta * 100) / 100,
      pctChange: Math.round(pct * 1000) / 1000,
      txCount: recent[cat]?.count ?? 0,
      hint: pct >= 0.4 ? "vice-tax" : pct >= 0.25 ? "review" : "investigate",
    };
    if (pct >= MIN_PCT) categories.push(row);
    else if (pct <= -MIN_PCT) improvements.push(row);
  }
  categories.sort((a, b) => b.delta - a.delta);
  improvements.sort((a, b) => a.delta - b.delta); // most-negative first

  // Subscription creep — compare each active recurring's current amount to the
  // average of its prior charges, if we have multiple.
  const recurrings = await prisma.recurringTransaction.findMany({
    where: { userId, active: true, type: "expense" },
  });
  const subscriptions: SubscriptionCreep[] = [];
  for (const rec of recurrings) {
    const priorMatches = priorTxs.filter(
      (t) => t.category === rec.category && Math.abs(t.amount - rec.amount) > 1
    );
    if (priorMatches.length === 0) continue;
    const priorAvg = priorMatches.reduce((s, t) => s + t.amount, 0) / priorMatches.length;
    const delta = rec.amount - priorAvg;
    if (delta <= 0 || Math.abs(delta / priorAvg) < 0.1) continue;
    subscriptions.push({
      recurringId: rec.id,
      description: rec.description,
      category: rec.category,
      currentAmount: rec.amount,
      priorAvgAmount: Math.round(priorAvg * 100) / 100,
      delta: Math.round(delta * 100) / 100,
      pctChange: Math.round((delta / priorAvg) * 1000) / 1000,
    });
  }
  subscriptions.sort((a, b) => b.delta - a.delta);

  const recentTotal = recentTxs.reduce((s, t) => s + t.amount, 0);
  const priorTotal = priorTxs.reduce((s, t) => s + t.amount, 0);
  const netDelta = recentTotal - priorTotal;

  return {
    windowDays: WINDOW_DAYS,
    recentTotal: Math.round(recentTotal * 100) / 100,
    priorTotal: Math.round(priorTotal * 100) / 100,
    netDelta: Math.round(netDelta * 100) / 100,
    netPct: priorTotal > 0 ? Math.round((netDelta / priorTotal) * 1000) / 1000 : 0,
    categories,
    improvements,
    subscriptions,
    generatedAt: now.toISOString(),
  };
}

// Returns the single most-actionable creep line for a one-shot UI nudge.
export function topCreep(report: InflationReport): CategoryCreep | null {
  return report.categories[0] ?? null;
}
