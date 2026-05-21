import { prisma } from "./prisma";
import { isDebtAccount } from "./debtBoss";

export type Highlight = {
  kind: "achievement" | "boss-ko" | "vice-tax" | "streak" | "savings" | "warning";
  title: string;
  detail: string;
};

export function getWeekBoundaries(date: Date = new Date()) {
  // Week = Monday 00:00 -> Sunday 23:59:59.999.
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=Sun ... 6=Sat
  const diffToMonday = (day + 6) % 7;
  const start = new Date(d);
  start.setDate(d.getDate() - diffToMonday);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  end.setMilliseconds(end.getMilliseconds() - 1);
  return { start, end };
}

export function previousWeek(date: Date = new Date()) {
  const prev = new Date(date);
  prev.setDate(prev.getDate() - 7);
  return getWeekBoundaries(prev);
}

export async function generateWeeklyRecap(userId: string, weekDate: Date = previousWeek().start) {
  const { start, end } = getWeekBoundaries(weekDate);
  const prevBoundary = getWeekBoundaries(new Date(start.getTime() - 86_400_000));

  const [txs, prevTxs, viceTaxContribs, achievements, snaps, debts] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId, date: { gte: start, lte: end } },
      include: { account: { select: { type: true, name: true } } },
    }),
    prisma.transaction.findMany({
      where: { userId, date: { gte: prevBoundary.start, lte: prevBoundary.end } },
    }),
    prisma.goalContribution.findMany({
      where: { userId, date: { gte: start, lte: end }, note: { startsWith: "Vice tax" } },
    }),
    prisma.userAchievement.findMany({
      where: { userId, unlockedAt: { gte: start, lte: end } },
    }),
    prisma.netWorthSnapshot.findMany({
      where: { userId, date: { gte: new Date(start.getTime() - 86_400_000), lte: end } },
      orderBy: { date: "asc" },
    }),
    prisma.account.findMany({ where: { userId } }),
  ]);

  const income = txs.filter((t) => t.type === "income" && !isDebtAccount(t.account.type)).reduce((s, t) => s + t.amount, 0);
  const spend = txs.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const net = income - spend;

  // Top spending category.
  const byCategory: Record<string, number> = {};
  for (const t of txs) {
    if (t.type !== "expense") continue;
    byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
  }
  const topCategoryEntry = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];

  // Biggest single transaction.
  const biggestTx = txs.filter((t) => t.type === "expense").sort((a, b) => b.amount - a.amount)[0];

  // Vice tax funneled.
  const viceTaxFunneled = viceTaxContribs.reduce((s, c) => s + c.amount, 0);

  // Debt paid: income transactions hitting debt accounts.
  const debtPaid = txs
    .filter((t) => t.type === "income" && isDebtAccount(t.account.type))
    .reduce((s, t) => s + t.amount, 0);

  // Bosses defeated this week: walletEntries with DebtBoss refType in window.
  const bossKOs = await prisma.walletEntry.count({
    where: { userId, refType: "DebtBoss", createdAt: { gte: start, lte: end } },
  });

  // Net worth delta from snapshots.
  const firstSnap = snaps[0];
  const lastSnap = snaps[snaps.length - 1];
  const netWorthDelta = firstSnap && lastSnap ? lastSnap.value - firstSnap.value : 0;

  // Highlights.
  const highlights: Highlight[] = [];
  if (achievements.length > 0) {
    highlights.push({
      kind: "achievement",
      title: `${achievements.length} achievement${achievements.length === 1 ? "" : "s"} unlocked`,
      detail: achievements.map((a) => a.achievementSlug).slice(0, 3).join(", "),
    });
  }
  if (bossKOs > 0) {
    highlights.push({
      kind: "boss-ko",
      title: `${bossKOs} debt boss${bossKOs === 1 ? "" : "es"} defeated`,
      detail: "+100 Karma each. Momentum is yours.",
    });
  }
  if (viceTaxFunneled > 0) {
    highlights.push({
      kind: "vice-tax",
      title: `$${viceTaxFunneled.toFixed(2)} funneled by Vice Tax`,
      detail: "Guilty pleasures, redirected.",
    });
  }
  const prevSpend = prevTxs.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  if (prevSpend > 0 && spend < prevSpend) {
    const pct = Math.round(((prevSpend - spend) / prevSpend) * 100);
    if (pct >= 10) {
      highlights.push({
        kind: "savings",
        title: `Spending down ${pct}% vs last week`,
        detail: `$${spend.toFixed(0)} this week vs $${prevSpend.toFixed(0)} last week.`,
      });
    }
  } else if (prevSpend > 0 && spend > prevSpend * 1.25) {
    const pct = Math.round(((spend - prevSpend) / prevSpend) * 100);
    highlights.push({
      kind: "warning",
      title: `Spending up ${pct}% vs last week`,
      detail: `$${spend.toFixed(0)} this week vs $${prevSpend.toFixed(0)} last week.`,
    });
  }
  if (debts.some((a) => isDebtAccount(a.type) && a.balance < -0.01) && debtPaid === 0) {
    highlights.push({
      kind: "warning",
      title: "No debt attacks this week",
      detail: "Interest is compounding. Hit a boss next week.",
    });
  }

  const recap = await prisma.weeklyRecap.upsert({
    where: { userId_weekStart: { userId, weekStart: start } },
    update: {
      weekEnd: end,
      income, spend, net,
      topCategory: topCategoryEntry?.[0] ?? null,
      topCategorySpend: topCategoryEntry?.[1] ?? null,
      biggestTxAmount: biggestTx?.amount ?? null,
      biggestTxDescription: biggestTx?.description ?? null,
      txCount: txs.length,
      viceTaxFunneled,
      debtPaid,
      bossesDefeated: bossKOs,
      netWorthDelta,
      achievementsUnlocked: achievements.length,
      highlights: highlights as unknown as object,
    },
    create: {
      userId, weekStart: start, weekEnd: end,
      income, spend, net,
      topCategory: topCategoryEntry?.[0] ?? null,
      topCategorySpend: topCategoryEntry?.[1] ?? null,
      biggestTxAmount: biggestTx?.amount ?? null,
      biggestTxDescription: biggestTx?.description ?? null,
      txCount: txs.length,
      viceTaxFunneled,
      debtPaid,
      bossesDefeated: bossKOs,
      netWorthDelta,
      achievementsUnlocked: achievements.length,
      highlights: highlights as unknown as object,
    },
  });

  return recap;
}
