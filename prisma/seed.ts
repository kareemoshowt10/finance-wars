import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEFAULT_CATEGORIES } from "../lib/defaults";
import { ACHIEVEMENTS_BY_SLUG } from "../lib/achievements/catalog";
import { seedDebtSucker } from "./seedDebtSucker";

const prisma = new PrismaClient();

const EXPENSE_CATS = ["Food", "Rent", "Transport", "Utilities", "Entertainment", "Health", "Shopping", "Travel", "Subscriptions", "Other"];
const INCOME_CATS = ["Salary", "Investments"];

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function dayKey(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export async function runSeed() {
  const email = "demo@debtsucker.app";
  const password = "demo1234";
  const passwordHash = await bcrypt.hash(password, 10);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) await prisma.user.delete({ where: { email } });

  const user = await prisma.user.create({
    data: { email, passwordHash, name: "Demo Trader", currency: "USD", onboarded: true },
  });

  await prisma.category.createMany({
    data: DEFAULT_CATEGORIES.map((c) => ({ userId: user.id, ...c })),
  });

  const accounts = await Promise.all([
    prisma.account.create({ data: { userId: user.id, name: "Everyday Checking", type: "checking", balance: 4820.55 } }),
    prisma.account.create({ data: { userId: user.id, name: "High-Yield Savings", type: "savings", balance: 18450.10 } }),
    prisma.account.create({ data: { userId: user.id, name: "Platinum Card", type: "credit", balance: 1240.32 } }),
    prisma.account.create({ data: { userId: user.id, name: "Brokerage", type: "investment", balance: 42310.78 } }),
  ]);

  const now = new Date();
  const transactions: {
    accountId: string; amount: number; type: "income" | "expense";
    category: string; description: string; date: Date;
  }[] = [];

  for (let i = 0; i < 60; i++) {
    const dayOffset = Math.floor(rand(0, 90));
    const date = new Date(now);
    date.setDate(date.getDate() - dayOffset);
    const isIncome = Math.random() < 0.18;
    if (isIncome) {
      transactions.push({
        accountId: pick([accounts[0].id, accounts[1].id]),
        amount: Number(rand(800, 4500).toFixed(2)),
        type: "income",
        category: pick(INCOME_CATS),
        description: pick(["Paycheck", "Side project", "Dividends", "Bonus", "Refund"]),
        date,
      });
    } else {
      transactions.push({
        accountId: pick([accounts[0].id, accounts[2].id]),
        amount: Number(rand(8, 280).toFixed(2)),
        type: "expense",
        category: pick(EXPENSE_CATS),
        description: pick(["Coffee", "Lunch", "Uber", "Amazon", "Spotify", "Rent payment", "Electric bill",
          "Gym", "Pharmacy", "Groceries", "Airbnb", "Flight", "Restaurant", "Gas"]),
        date,
      });
    }
  }

  // Add one big anomaly tx for insights
  transactions.push({
    accountId: accounts[0].id, amount: 1850, type: "expense",
    category: "Shopping", description: "MacBook accessories spree",
    date: new Date(now.getTime() - 5 * 86400000),
  });

  await prisma.transaction.createMany({ data: transactions.map((t) => ({ ...t, userId: user.id })) });

  const m = monthKey(now);
  for (const b of [
    { category: "Food", limit: 500 },
    { category: "Transport", limit: 200 },
    { category: "Entertainment", limit: 150 },
    { category: "Shopping", limit: 350 },
  ]) {
    await prisma.budget.create({ data: { userId: user.id, ...b, month: m } });
  }

  const inMonths = (n: number) => { const d = new Date(now); d.setMonth(d.getMonth() + n); return d; };
  const goalEmergency = await prisma.goal.create({ data: { userId: user.id, name: "Emergency Fund", targetAmount: 15000, currentAmount: 9200, deadline: inMonths(6) } });
  const goalTesla = await prisma.goal.create({ data: { userId: user.id, name: "Tesla Model 3", targetAmount: 42000, currentAmount: 12500, deadline: inMonths(18) } });
  const goalJapan = await prisma.goal.create({ data: { userId: user.id, name: "Japan Trip", targetAmount: 6000, currentAmount: 2100, deadline: inMonths(8) } });

  // Goal contributions summing to currentAmount each
  function splitInto(total: number, n: number): number[] {
    const parts: number[] = [];
    let left = total;
    for (let i = 0; i < n - 1; i++) {
      const p = Math.round((left / (n - i)) * (0.8 + Math.random() * 0.4) * 100) / 100;
      parts.push(p);
      left = Math.round((left - p) * 100) / 100;
    }
    parts.push(Math.round(left * 100) / 100);
    return parts;
  }
  for (const g of [
    { goal: goalEmergency, parts: splitInto(9200, 6) },
    { goal: goalTesla, parts: splitInto(12500, 5) },
    { goal: goalJapan, parts: splitInto(2100, 4) },
  ]) {
    const n = g.parts.length;
    await prisma.goalContribution.createMany({
      data: g.parts.map((amt, i) => {
        const d = new Date(now); d.setMonth(d.getMonth() - (n - 1 - i));
        return { userId: user.id, goalId: g.goal.id, amount: amt, date: d, note: i === 0 ? "Initial deposit" : null };
      }),
    });
  }

  // Rules
  await prisma.rule.createMany({
    data: [
      { userId: user.id, name: "Spotify → Subscriptions", pattern: "spotify", categoryOut: "Subscriptions", priority: 10, active: true },
      { userId: user.id, name: "Uber → Transport", pattern: "uber", categoryOut: "Transport", priority: 8, active: true },
      { userId: user.id, name: "Rent payments", pattern: "rent", categoryOut: "Rent", priority: 6, active: true },
    ],
  });

  // Recurring
  await prisma.recurringTransaction.createMany({
    data: [
      {
        userId: user.id, accountId: accounts[0].id, amount: 4200, type: "income",
        category: "Salary", description: "Monthly paycheck", frequency: "MONTHLY",
        nextRunDate: new Date(now.getFullYear(), now.getMonth() + 1, 1), active: true,
      },
      {
        userId: user.id, accountId: accounts[0].id, amount: 1850, type: "expense",
        category: "Rent", description: "Apartment rent", frequency: "MONTHLY",
        nextRunDate: new Date(now.getFullYear(), now.getMonth() + 1, 5), active: true,
      },
      {
        userId: user.id, accountId: accounts[2].id, amount: 14.99, type: "expense",
        category: "Subscriptions", description: "Streaming bundle", frequency: "BIWEEKLY",
        nextRunDate: new Date(now.getTime() + 7 * 86400000), active: true,
      },
    ],
  });

  // Snapshots: 180 days, gentle upward trend with noise
  const start = 50000;
  const today = dayKey(now);
  const snapData: { userId: string; date: Date; value: number }[] = [];
  for (let i = 179; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const t = 179 - i;
    const trend = start + t * 85; // gentle up
    const noise = Math.sin(t * 0.3) * 800 + Math.cos(t * 0.7) * 400 + (Math.random() - 0.5) * 600;
    snapData.push({ userId: user.id, date: d, value: Math.round((trend + noise) * 100) / 100 });
  }
  await prisma.netWorthSnapshot.createMany({ data: snapData });

  // Holdings — brokerage account
  const brokerage = accounts[3];
  await prisma.holding.createMany({
    data: [
      { userId: user.id, accountId: brokerage.id, symbol: "AAPL", shares: 25, costBasis: 4200 },
      { userId: user.id, accountId: brokerage.id, symbol: "TSLA", shares: 12, costBasis: 2900 },
      { userId: user.id, accountId: brokerage.id, symbol: "MSFT", shares: 15, costBasis: 5100 },
      { userId: user.id, accountId: brokerage.id, symbol: "NVDA", shares: 8, costBasis: 3600 },
      { userId: user.id, accountId: brokerage.id, symbol: "GOOGL", shares: 10, costBasis: 1450 },
      { userId: user.id, accountId: brokerage.id, symbol: "VTI", shares: 30, costBasis: 6800 },
    ],
  });

  // Sample notifications
  await prisma.notification.createMany({
    data: [
      { userId: user.id, kind: "BUDGET_WARNING", title: "Shopping budget at 84%", body: "You've used 84% of your $350 Shopping budget.", link: "/dashboard/budgets", key: `budget:warning:Shopping:${m}` },
      { userId: user.id, kind: "GOAL_MILESTONE", title: "50% of Emergency Fund", body: "You're halfway to your $15,000 goal.", link: "/dashboard/goals", key: `goal:50:seed-1` },
      { userId: user.id, kind: "BILL_DUE", title: "Upcoming: Apartment rent", body: "$1,850 due in 5 days.", link: "/dashboard/recurring", key: `bill:seed-rent` },
      { userId: user.id, kind: "LARGE_TX", title: "Unusually large expense", body: "$1,850 on MacBook accessories is over 2× your average.", link: "/dashboard/transactions", key: `large:seed-mac` },
      { userId: user.id, kind: "INSIGHT", title: "You saved 18% this month", body: "Up 3 points from last month. Keep going.", link: "/dashboard/insights", key: `insight:seed-1` },
    ],
  });

  // Audit log entries
  await prisma.auditLog.createMany({
    data: [
      { userId: user.id, action: "auth.signup", entity: "user", entityId: user.id },
      { userId: user.id, action: "account.create", entity: "account", entityId: accounts[0].id, meta: { name: "Everyday Checking" } as never },
      { userId: user.id, action: "account.create", entity: "account", entityId: accounts[1].id, meta: { name: "High-Yield Savings" } as never },
      { userId: user.id, action: "goal.create", entity: "goal", meta: { name: "Emergency Fund" } as never },
      { userId: user.id, action: "budget.upsert", entity: "budget", meta: { category: "Food", limit: 500 } as never },
    ],
  });

  // One placeholder API token (hash only — no plaintext exposed)
  const fakeHash = "0".repeat(64);
  await prisma.apiToken.create({
    data: { userId: user.id, name: "Demo CLI (revoked)", tokenHash: fakeHash, revokedAt: new Date() },
  });

  // ---------------- Achievements + gamification seed ----------------
  const demoSlugs = [
    "first-account", "first-transaction", "ten-tx", "first-budget", "first-goal",
    "first-recurring", "first-rule", "net-worth-10k", "savings-rate-20", "used-insights",
  ];
  let demoXp = 0;
  for (let i = 0; i < demoSlugs.length; i++) {
    const slug = demoSlugs[i];
    const def = ACHIEVEMENTS_BY_SLUG[slug];
    if (!def) continue;
    const daysAgo = Math.floor((i / demoSlugs.length) * 88) + 1;
    const unlockedAt = new Date(now.getTime() - daysAgo * 86400000);
    await prisma.userAchievement.create({
      data: { userId: user.id, achievementSlug: slug, unlockedAt, progress: 1, completed: true },
    });
    demoXp += def.xp;
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { xp: demoXp, currentLoginStreak: 12, longestLoginStreak: 23, lastLoginAt: now },
  });

  console.log(`Seeded demo user: ${email} / ${password}`);

  // ---------------- Duels seed ----------------
  await seedDuels(user.id, accounts[0].id);
}

async function seedDuels(demoUserId: string, demoCheckingId: string) {
  const partnerEmail = "partner@debtsucker.app";
  const partnerPwd = "partner123";
  const passwordHash = await bcrypt.hash(partnerPwd, 10);
  const existing = await prisma.user.findUnique({ where: { email: partnerEmail } });
  if (existing) await prisma.user.delete({ where: { email: partnerEmail } });
  const partner = await prisma.user.create({
    data: { email: partnerEmail, passwordHash, name: "Partner", currency: "USD", onboarded: true },
  });
  await prisma.category.createMany({
    data: DEFAULT_CATEGORIES.map((c) => ({ userId: partner.id, ...c })),
  });
  const partnerChecking = await prisma.account.create({
    data: { userId: partner.id, name: "Partner Checking", type: "checking", balance: 6800 },
  });

  // Active duel: Hawaii Sprint
  const now = new Date();
  const start = new Date(now.getTime() - 21 * 86400000);
  const end = new Date(now.getTime() + 35 * 86400000);

  const duel = await prisma.duel.create({
    data: {
      creatorUserId: demoUserId,
      title: "Hawaii Sprint",
      targetAmount: 4000,
      sprintLengthDays: 7,
      startDate: start,
      endDate: end,
      status: "ACTIVE",
      stakeText: "Loser plans the trip",
      autoPenaltyEnabled: true,
      stakeAmount: 200,
      stakePercentCap: 10,
    },
  });
  const playerA = await prisma.duelPlayer.create({
    data: { duelId: duel.id, userId: demoUserId, side: "A", accepted: true, joinedAt: start, stakeAccountId: demoCheckingId },
  });
  const playerB = await prisma.duelPlayer.create({
    data: { duelId: duel.id, userId: partner.id, side: "B", accepted: true, joinedAt: start, stakeAccountId: partnerChecking.id },
  });

  // Seed 3 closed sprints + 1 active
  const sprintWinners = [playerA.id, playerB.id, playerA.id]; // demo 2-1
  const themeMults = [1.0, 1.5, 1.0];
  const themeLabels = [null, "Double-Down", null];
  let sprintTotalsA = 0, sprintTotalsB = 0, sprintsWonA = 0, sprintsWonB = 0;

  for (let w = 1; w <= 4; w++) {
    const sStart = new Date(start.getTime() + (w - 1) * 7 * 86400000);
    const sEnd = new Date(start.getTime() + w * 7 * 86400000);
    const isClosed = w <= 3;
    const tMult = isClosed ? themeMults[w - 1] : 1.0;
    const sprint = await prisma.sprint.create({
      data: {
        duelId: duel.id, weekNumber: w, startDate: sStart, endDate: sEnd,
        status: isClosed ? "CLOSED" : "ACTIVE",
        themeMultiplier: tMult,
        themeLabel: isClosed ? themeLabels[w - 1] : null,
        winnerPlayerId: isClosed ? sprintWinners[w - 1] : null,
        closedAt: isClosed ? sEnd : null,
      },
    });
    // targets
    await prisma.sprintTarget.create({ data: { sprintId: sprint.id, playerId: playerA.id, amount: 500 } });
    await prisma.sprintTarget.create({ data: { sprintId: sprint.id, playerId: playerB.id, amount: 500 } });

    // contributions
    const aWins = isClosed && sprintWinners[w - 1] === playerA.id;
    const aDays = aWins ? 6 : 4;
    const bDays = aWins ? 4 : 6;
    for (let i = 0; i < aDays; i++) {
      const d = new Date(sStart.getTime() + i * 86400000 + 12 * 3600000);
      const amt = 60 + Math.round(Math.random() * 40);
      const pts = Number((amt * (1 + Math.min(0.5, 0.05 * i)) * tMult).toFixed(2));
      await prisma.contribution.create({
        data: { sprintId: sprint.id, playerId: playerA.id, amount: amt, pointsAwarded: pts, createdAt: d, editableUntil: new Date(d.getTime() + 86400000) },
      });
      sprintTotalsA += pts;
    }
    for (let i = 0; i < bDays; i++) {
      const d = new Date(sStart.getTime() + i * 86400000 + 14 * 3600000);
      const amt = 55 + Math.round(Math.random() * 45);
      const pts = Number((amt * (1 + Math.min(0.5, 0.05 * i)) * tMult).toFixed(2));
      await prisma.contribution.create({
        data: { sprintId: sprint.id, playerId: playerB.id, amount: amt, pointsAwarded: pts, createdAt: d, editableUntil: new Date(d.getTime() + 86400000) },
      });
      sprintTotalsB += pts;
    }

    if (isClosed) {
      if (sprintWinners[w - 1] === playerA.id) sprintsWonA++;
      else sprintsWonB++;
      await prisma.duelEvent.create({
        data: { duelId: duel.id, kind: "SPRINT_CLOSE", payload: { weekNumber: w, winnerPlayerId: sprintWinners[w - 1] } as never, createdAt: sEnd },
      });
    }
    await prisma.duelEvent.create({
      data: { duelId: duel.id, kind: "SPRINT_OPEN", payload: { weekNumber: w } as never, createdAt: sStart },
    });
  }

  // A CONCEDED dispute on partner contribution from sprint 2
  const partnerContribs = await prisma.contribution.findMany({
    where: { playerId: playerB.id }, take: 1, orderBy: { createdAt: "desc" },
  });
  if (partnerContribs[0]) {
    await prisma.dispute.create({
      data: {
        contributionId: partnerContribs[0].id, raisedByPlayerId: playerA.id,
        reason: "Already counted last week", status: "CONCEDED", resolvedAt: new Date(now.getTime() - 7 * 86400000),
        autoResolveAt: new Date(now.getTime() + 7 * 86400000),
      },
    });
    await prisma.contribution.update({ where: { id: partnerContribs[0].id }, data: { disputeStatus: "CONCEDED" } });
    sprintTotalsB -= partnerContribs[0].pointsAwarded;
  }

  await prisma.duelEvent.create({
    data: { duelId: duel.id, kind: "BADGE", playerId: playerA.id, payload: { badge: "FIRST_BLOOD" } as never, createdAt: start },
  });

  // Cheers
  await prisma.cheer.createMany({
    data: [
      { duelId: duel.id, fromPlayerId: playerB.id, sticker: "fire" },
      { duelId: duel.id, fromPlayerId: playerA.id, sticker: "crown" },
      { duelId: duel.id, fromPlayerId: playerB.id, sticker: "flex" },
      { duelId: duel.id, fromPlayerId: playerA.id, sticker: "100" },
    ],
  });
  await prisma.duelEvent.create({
    data: { duelId: duel.id, kind: "CHEER", playerId: playerB.id, payload: { sticker: "fire" } as never },
  });

  // Update totals + streaks
  await prisma.duelPlayer.update({
    where: { id: playerA.id },
    data: { totalPoints: Math.round(sprintTotalsA * 100) / 100, sprintsWon: sprintsWonA, currentStreakDays: 5, longestStreakDays: 7 },
  });
  await prisma.duelPlayer.update({
    where: { id: playerB.id },
    data: { totalPoints: Math.round(sprintTotalsB * 100) / 100, sprintsWon: sprintsWonB, currentStreakDays: 3, longestStreakDays: 6 },
  });

  // Practice duel for demo
  const pStart = new Date(now.getTime() - 6 * 86400000);
  const pEnd = new Date(now.getTime() + 9 * 86400000);
  const practice = await prisma.duel.create({
    data: {
      creatorUserId: demoUserId,
      title: "Espresso Machine Sprint",
      targetAmount: 1200,
      sprintLengthDays: 3,
      startDate: pStart,
      endDate: pEnd,
      status: "ACTIVE",
      stakeText: "Loser hand-grinds beans for a month",
      isPractice: true,
      practiceOpponentDailyAvg: 35,
    },
  });
  const pA = await prisma.duelPlayer.create({
    data: { duelId: practice.id, userId: demoUserId, side: "A", accepted: true, joinedAt: pStart },
  });
  const pB = await prisma.duelPlayer.create({
    data: { duelId: practice.id, userId: null, side: "B", accepted: true, joinedAt: pStart },
  });
  const pSprintEnd = new Date(pStart.getTime() + 3 * 86400000);
  const pSprint = await prisma.sprint.create({
    data: { duelId: practice.id, weekNumber: 1, startDate: pStart, endDate: pSprintEnd, status: "ACTIVE" },
  });
  await prisma.sprintTarget.create({ data: { sprintId: pSprint.id, playerId: pA.id, amount: 120 } });
  await prisma.sprintTarget.create({ data: { sprintId: pSprint.id, playerId: pB.id, amount: 105 } });
  await prisma.duelEvent.create({ data: { duelId: practice.id, kind: "SPRINT_OPEN", payload: { weekNumber: 1 } as never } });
  for (let i = 0; i < 2; i++) {
    const d = new Date(pStart.getTime() + i * 86400000 + 11 * 3600000);
    await prisma.contribution.create({
      data: { sprintId: pSprint.id, playerId: pA.id, amount: 45, pointsAwarded: 45, createdAt: d, editableUntil: new Date(d.getTime() + 86400000) },
    });
    await prisma.contribution.create({
      data: { sprintId: pSprint.id, playerId: pB.id, amount: 35, pointsAwarded: 35, createdAt: d, editableUntil: new Date(d.getTime() + 86400000) },
    });
  }
  await prisma.duelPlayer.update({ where: { id: pA.id }, data: { totalPoints: 90, currentStreakDays: 2 } });
  await prisma.duelPlayer.update({ where: { id: pB.id }, data: { totalPoints: 70, currentStreakDays: 2 } });

  const partnerSlugs = ["first-account", "first-duel", "first-sprint-won"];
  let partnerXp = 0;
  for (let i = 0; i < partnerSlugs.length; i++) {
    const slug = partnerSlugs[i];
    const def = ACHIEVEMENTS_BY_SLUG[slug];
    if (!def) continue;
    const unlockedAt = new Date(Date.now() - (10 + i * 7) * 86400000);
    await prisma.userAchievement.create({
      data: { userId: partner.id, achievementSlug: slug, unlockedAt, progress: 1, completed: true },
    });
    partnerXp += def.xp;
  }
  await prisma.user.update({
    where: { id: partner.id },
    data: { xp: partnerXp, currentLoginStreak: 4, longestLoginStreak: 9, lastLoginAt: new Date() },
  });

  console.log(`Seeded partner: ${partnerEmail} / ${partnerPwd}`);

  await seedCouples(demoUserId, demoCheckingId, partner.id, partnerChecking.id);
}

async function seedCouples(demoUserId: string, demoCheckingId: string, partnerId: string, partnerCheckingId: string) {
  const accountsDemo = await prisma.account.findMany({ where: { userId: demoUserId } });
  const acctMap: Record<string, string> = {};
  for (const a of accountsDemo) acctMap[a.type] = a.id;

  for (const uid of [demoUserId, partnerId]) {
    await prisma.category.upsert({
      where: { userId_name: { userId: uid, name: "Personal Allowance" } },
      update: {},
      create: { userId: uid, name: "Personal Allowance", color: "#ec4899", icon: "wallet", kind: "EXPENSE" },
    });
  }

  const now = new Date();
  const hh = await prisma.household.create({
    data: {
      name: "The Smiths",
      createdById: demoUserId,
      pactSignedAt: now,
      members: {
        create: [
          { userId: demoUserId, role: "OWNER", accepted: true, joinedAt: new Date(now.getTime() - 60 * 86400000) },
          { userId: partnerId, role: "MEMBER", accepted: true, joinedAt: new Date(now.getTime() - 50 * 86400000) },
        ],
      },
      pact: {
        create: {
          bigPurchaseThreshold: 300,
          emergencyFundFloor: 10000,
          savingsRateMin: 15,
          personalAllowanceA: 250,
          personalAllowanceB: 200,
          requireDualSignOff: true,
          version: 1,
        },
      },
    },
    include: { pact: true },
  });

  if (hh.pact) {
    await prisma.pactSignature.createMany({
      data: [
        { pactId: hh.pact.id, userId: demoUserId, version: 1, signedAt: new Date(now.getTime() - 50 * 86400000) },
        { pactId: hh.pact.id, userId: partnerId, version: 1, signedAt: new Date(now.getTime() - 49 * 86400000) },
      ],
    });
  }

  const shares: { accountId: string; level: string; ownerUserId: string }[] = [];
  if (acctMap.checking) shares.push({ accountId: acctMap.checking, level: "FULL", ownerUserId: demoUserId });
  if (acctMap.savings) shares.push({ accountId: acctMap.savings, level: "BALANCE", ownerUserId: demoUserId });
  if (acctMap.credit) shares.push({ accountId: acctMap.credit, level: "HIDDEN", ownerUserId: demoUserId });
  if (acctMap.investment) shares.push({ accountId: acctMap.investment, level: "BALANCE", ownerUserId: demoUserId });
  shares.push({ accountId: partnerCheckingId, level: "FULL", ownerUserId: partnerId });
  for (const s of shares) {
    await prisma.accountShare.create({ data: { ...s, householdId: hh.id } });
  }

  await prisma.moneyDate.create({
    data: {
      householdId: hh.id,
      scheduledAt: new Date(now.getTime() - 14 * 86400000),
      cadence: "WEEKLY",
      status: "COMPLETED",
      completedAt: new Date(now.getTime() - 14 * 86400000 + 1800000),
      decisions: { "Spending:0": "Note", "Goals:0": "Approve" } as never,
    },
  });
  await prisma.moneyDate.create({
    data: {
      householdId: hh.id,
      scheduledAt: new Date(now.getTime() - 7 * 86400000),
      cadence: "WEEKLY",
      status: "COMPLETED",
      completedAt: new Date(now.getTime() - 7 * 86400000 + 1800000),
      decisions: { "Bills:0": "Note" } as never,
    },
  });
  await prisma.moneyDate.create({
    data: {
      householdId: hh.id,
      scheduledAt: new Date(now.getTime() + 3 * 86400000),
      cadence: "WEEKLY",
      status: "UPCOMING",
      agenda: { summary: "Prepared agenda pending fresh data.", sections: [] } as never,
    },
  });

  const macTx = await prisma.transaction.findFirst({
    where: { userId: demoUserId, description: "MacBook accessories spree" },
  });
  if (macTx) {
    const review = await prisma.purchaseReview.create({
      data: {
        householdId: hh.id,
        transactionId: macTx.id,
        requesterUserId: demoUserId,
        approverUserId: partnerId,
        amount: macTx.amount,
        status: "PENDING",
        expiresAt: new Date(now.getTime() + 24 * 3600 * 1000),
      },
    });
    await prisma.transaction.update({
      where: { id: macTx.id },
      data: { pending: true, reviewId: review.id },
    });
  }

  const histTx = await prisma.transaction.create({
    data: {
      userId: partnerId,
      accountId: partnerCheckingId,
      amount: 480,
      type: "expense",
      category: "Travel",
      description: "Hotel deposit",
      date: new Date(now.getTime() - 20 * 86400000),
    },
  });
  await prisma.purchaseReview.create({
    data: {
      householdId: hh.id,
      transactionId: histTx.id,
      requesterUserId: partnerId,
      approverUserId: demoUserId,
      amount: histTx.amount,
      status: "APPROVED",
      decidedAt: new Date(now.getTime() - 19 * 86400000),
      expiresAt: new Date(now.getTime() - 19 * 86400000),
    },
  });

  for (let i = 0; i < 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    await prisma.allowanceLedger.create({
      data: { householdId: hh.id, userId: demoUserId, month: m, allocated: 250, spent: 80 + Math.round(Math.random() * 140) },
    });
    await prisma.allowanceLedger.create({
      data: { householdId: hh.id, userId: partnerId, month: m, allocated: 200, spent: 60 + Math.round(Math.random() * 110) },
    });
  }

  // -------- v2: Shared Bills + Settle-up + Co-op Quest --------
  const checkingId = acctMap.checking!;
  const rent = await prisma.sharedBill.create({
    data: {
      householdId: hh.id,
      name: "Rent",
      amount: 2400,
      frequency: "MONTHLY",
      nextDueDate: new Date(now.getFullYear(), now.getMonth() + 1, 1),
      accountId: checkingId,
      splitMode: "INCOME_RATIO",
      splitConfig: {} as never,
      categoryName: "Housing",
    },
  });
  const internet = await prisma.sharedBill.create({
    data: {
      householdId: hh.id,
      name: "Internet",
      amount: 80,
      frequency: "MONTHLY",
      nextDueDate: new Date(now.getFullYear(), now.getMonth() + 1, 5),
      accountId: checkingId,
      splitMode: "EQUAL",
      splitConfig: {} as never,
      categoryName: "Bills & Utilities",
    },
  });
  const streaming = await prisma.sharedBill.create({
    data: {
      householdId: hh.id,
      name: "Streaming bundle",
      amount: 45,
      frequency: "MONTHLY",
      nextDueDate: new Date(now.getFullYear(), now.getMonth() + 1, 10),
      accountId: checkingId,
      splitMode: "FIXED",
      splitConfig: { [demoUserId]: 27, [partnerId]: 18 } as never,
      categoryName: "Entertainment",
    },
  });

  // 3 months of past charges with realistic history
  for (let i = 1; i <= 3; i++) {
    const due = new Date(now.getFullYear(), now.getMonth() - i, 1);
    // Rent — demo paid, income_ratio split (assume demo earns ~60%, partner ~40%)
    const rentCharge = await prisma.billCharge.create({
      data: {
        sharedBillId: rent.id,
        householdId: hh.id,
        paidByUserId: demoUserId,
        amount: 2400,
        dueDate: due,
        status: "PAID",
        paidAt: new Date(due.getTime() + 86400000),
      },
    });
    // partner owes share — approximate 40% (income ratio)
    await prisma.ledgerEntry.create({
      data: {
        householdId: hh.id,
        fromUserId: partnerId,
        toUserId: demoUserId,
        amount: 960, // 40% of 2400
        reason: `Rent (${due.toISOString().slice(0, 10)})`,
        billChargeId: rentCharge.id,
      },
    });

    // Internet — demo paid 2 months, partner paid the most recent of the 3
    const intDue = new Date(now.getFullYear(), now.getMonth() - i, 5);
    const paidBy = i === 1 ? partnerId : demoUserId;
    const intCharge = await prisma.billCharge.create({
      data: {
        sharedBillId: internet.id,
        householdId: hh.id,
        paidByUserId: paidBy,
        amount: 80,
        dueDate: intDue,
        status: "PAID",
        paidAt: new Date(intDue.getTime() + 86400000),
      },
    });
    await prisma.ledgerEntry.create({
      data: {
        householdId: hh.id,
        fromUserId: paidBy === demoUserId ? partnerId : demoUserId,
        toUserId: paidBy,
        amount: 40,
        reason: `Internet (${intDue.toISOString().slice(0, 10)})`,
        billChargeId: intCharge.id,
      },
    });

    // Streaming — demo paid, fixed 60/40
    const strDue = new Date(now.getFullYear(), now.getMonth() - i, 10);
    const strCharge = await prisma.billCharge.create({
      data: {
        sharedBillId: streaming.id,
        householdId: hh.id,
        paidByUserId: demoUserId,
        amount: 45,
        dueDate: strDue,
        status: "PAID",
        paidAt: new Date(strDue.getTime() + 86400000),
      },
    });
    await prisma.ledgerEntry.create({
      data: {
        householdId: hh.id,
        fromUserId: partnerId,
        toUserId: demoUserId,
        amount: 18,
        reason: `Streaming (${strDue.toISOString().slice(0, 10)})`,
        billChargeId: strCharge.id,
      },
    });
  }

  // Historical settlement 60 days ago, ~$500 (partner→demo)
  const pastSettle = await prisma.settlement.create({
    data: {
      householdId: hh.id,
      fromUserId: partnerId,
      toUserId: demoUserId,
      amount: 500,
      note: "Square up Q1 bills",
      settledAt: new Date(now.getTime() - 60 * 86400000),
    },
  });
  await prisma.ledgerEntry.create({
    data: {
      householdId: hh.id,
      fromUserId: demoUserId,
      toUserId: partnerId,
      amount: 500,
      reason: "Settlement: Square up Q1 bills",
      settlementId: pastSettle.id,
      createdAt: new Date(now.getTime() - 60 * 86400000),
    },
  });

  // After all entries above:
  //   3 rent charges × $960 owed to demo = $2880
  //   internet: 2 charges where partner owes demo $40 = $80; 1 where demo owes partner $40 = -$40
  //   3 streaming × $18 owed to demo = $54
  //   1 settlement: partner→demo $500 → ledger entry reduces partner's debt by $500
  //   Net partner owes demo ≈ 2880 + 80 - 40 + 54 - 500 = $2474
  // We want partner to owe demo ~$340 net — add a balancing settlement (~$2134) to bring near target.
  const balancingSettle = await prisma.settlement.create({
    data: {
      householdId: hh.id,
      fromUserId: partnerId,
      toUserId: demoUserId,
      amount: 2134,
      note: "Mid-period catch-up",
      settledAt: new Date(now.getTime() - 20 * 86400000),
    },
  });
  await prisma.ledgerEntry.create({
    data: {
      householdId: hh.id,
      fromUserId: demoUserId,
      toUserId: partnerId,
      amount: 2134,
      reason: "Settlement: Mid-period catch-up",
      settlementId: balancingSettle.id,
      createdAt: new Date(now.getTime() - 20 * 86400000),
    },
  });

  // Co-op Quest: "House Down Payment" — $20k, 14-day sprints, 6 sprints total.
  // 1 closed sprint + 1 active sprint with contributions on both sides.
  const coopStart = new Date(now.getTime() - 18 * 86400000);
  const coopEnd = new Date(coopStart.getTime() + 6 * 14 * 86400000);
  const coopDuel = await prisma.duel.create({
    data: {
      creatorUserId: demoUserId,
      title: "House Down Payment",
      mode: "COOP",
      targetAmount: 20000,
      sprintLengthDays: 14,
      startDate: coopStart,
      endDate: coopEnd,
      stakeText: "Build it together",
      autoPenaltyEnabled: false,
      status: "ACTIVE",
    },
  });
  const playerA = await prisma.duelPlayer.create({
    data: { duelId: coopDuel.id, userId: demoUserId, side: "A", accepted: true, joinedAt: coopStart },
  });
  const playerB = await prisma.duelPlayer.create({
    data: { duelId: coopDuel.id, userId: partnerId, side: "B", accepted: true, joinedAt: coopStart },
  });
  const sprint1 = await prisma.sprint.create({
    data: {
      duelId: coopDuel.id,
      weekNumber: 1,
      startDate: coopStart,
      endDate: new Date(coopStart.getTime() + 14 * 86400000),
      status: "CLOSED",
      closedAt: new Date(coopStart.getTime() + 14 * 86400000),
    },
  });
  const sprint2 = await prisma.sprint.create({
    data: {
      duelId: coopDuel.id,
      weekNumber: 2,
      startDate: new Date(coopStart.getTime() + 14 * 86400000),
      endDate: new Date(coopStart.getTime() + 28 * 86400000),
      status: "ACTIVE",
    },
  });
  for (const [p, amts] of [
    [playerA, [800, 600, 400]],
    [playerB, [700, 500, 200]],
  ] as const) {
    for (let i = 0; i < amts.length; i++) {
      await prisma.contribution.create({
        data: {
          sprintId: sprint1.id,
          playerId: p.id,
          amount: amts[i],
          pointsAwarded: amts[i],
          editableUntil: new Date(coopStart.getTime() + 14 * 86400000),
          createdAt: new Date(coopStart.getTime() + (i + 1) * 86400000),
        },
      });
    }
  }
  // Active sprint contributions
  for (const [p, amts] of [
    [playerA, [500, 350]],
    [playerB, [400, 300]],
  ] as const) {
    for (let i = 0; i < amts.length; i++) {
      await prisma.contribution.create({
        data: {
          sprintId: sprint2.id,
          playerId: p.id,
          amount: amts[i],
          pointsAwarded: amts[i],
          editableUntil: new Date(coopStart.getTime() + 28 * 86400000),
          createdAt: new Date(coopStart.getTime() + (14 + i + 1) * 86400000),
        },
      });
    }
  }
  // Bump totals for display
  await prisma.duelPlayer.update({
    where: { id: playerA.id },
    data: { totalPoints: 800 + 600 + 400 + 500 + 350, sprintsWon: 1 },
  });
  await prisma.duelPlayer.update({
    where: { id: playerB.id },
    data: { totalPoints: 700 + 500 + 200 + 400 + 300, sprintsWon: 1 },
  });

  console.log(`Seeded household: ${hh.name}`);

  await seedDebtSucker(prisma, hh.id, demoUserId, partnerId);
  await seedWalletDemo(demoUserId, partnerId, hh.id);
  await seedMarketplace();
}

async function seedMarketplace() {
  const items = [
    { slug: "free-pass-token", name: "Free Pass Token", description: "Skip one big-purchase review with your partner.", currency: "TP", cost: 150, category: "Couples", payload: { kind: "free_pass" } },
    { slug: "streak-freeze", name: "Streak Freeze", description: "Protect your login streak for one missed day.", currency: "SHARD", cost: 5, category: "Streaks", payload: { kind: "streak_freeze" } },
    { slug: "charity-match-10", name: "$10 Charity Match", description: "We'll match $10 to a charity of your choice.", currency: "SC", cost: 200, category: "Impact", payload: { kind: "charity_match", amount: 10 } },
    { slug: "date-night", name: "Date Night Unlock", description: "Unlocks a curated $50 date night experience.", currency: "TP", cost: 300, category: "Couples", payload: { kind: "date_night" } },
    { slug: "flair-gold-ring", name: "Gold Ring Flair", description: "Cosmetic profile flair shown next to your name.", currency: "SC", cost: 100, category: "Cosmetic", payload: { kind: "flair", value: "gold-ring" } },
    { slug: "flair-onyx", name: "Onyx Flair", description: "Premium dark cosmetic flair.", currency: "KARMA", cost: 500, category: "Cosmetic", payload: { kind: "flair", value: "onyx" } },
  ];
  for (const it of items) {
    await prisma.marketplaceItem.upsert({
      where: { slug: it.slug },
      update: { name: it.name, description: it.description, currency: it.currency, cost: it.cost, category: it.category, payload: it.payload as never, active: true },
      create: { ...it, payload: it.payload as never },
    });
  }
  console.log(`Seeded ${items.length} marketplace items`);
}

async function seedWalletDemo(demoUserId: string, partnerUserId: string, householdId: string) {
  await prisma.walletEntry.deleteMany({ where: { userId: { in: [demoUserId, partnerUserId] } } });
  await prisma.confession.deleteMany({ where: { userId: { in: [demoUserId, partnerUserId] } } });

  const conf = await prisma.confession.create({
    data: {
      userId: demoUserId,
      householdId,
      amount: 89.5,
      category: "Dining",
      note: "Went out with the team after a long week — wanted you to know first.",
      partnerSeen: true,
    },
  });

  const now = Date.now();
  const entries: { userId: string; currency: string; delta: number; reason: string; fromUserId?: string; refType?: string; refId?: string; daysAgo: number; householdId?: string }[] = [
    { userId: demoUserId, currency: "TP", delta: 25, reason: "CONFESSION_HONEST", refType: "Confession", refId: conf.id, daysAgo: 6, householdId },
    { userId: demoUserId, currency: "TP", delta: 10, reason: "PARTNER_VERIFY", fromUserId: partnerUserId, refType: "Confession", refId: conf.id, daysAgo: 5, householdId },
    { userId: demoUserId, currency: "TP", delta: 15, reason: "PACT_KEPT", fromUserId: partnerUserId, daysAgo: 4, householdId },
    { userId: partnerUserId, currency: "TP", delta: 15, reason: "PACT_KEPT", fromUserId: demoUserId, daysAgo: 4, householdId },
    { userId: demoUserId, currency: "TP", delta: 5, reason: "REVIEW_APPROVED", fromUserId: partnerUserId, daysAgo: 3, householdId },
    { userId: partnerUserId, currency: "TP", delta: 25, reason: "CONFESSION_HONEST", daysAgo: 2, householdId },
    { userId: partnerUserId, currency: "TP", delta: 10, reason: "PARTNER_VERIFY", fromUserId: demoUserId, daysAgo: 1, householdId },
    { userId: demoUserId, currency: "SC", delta: 30, reason: "CHEER_GIVEN", daysAgo: 7 },
    { userId: demoUserId, currency: "SC", delta: 50, reason: "GOAL_MILESTONE", daysAgo: 10 },
    { userId: demoUserId, currency: "SC", delta: 100, reason: "REFERRAL", daysAgo: 14 },
    { userId: partnerUserId, currency: "SC", delta: 25, reason: "CHEER_GIVEN", daysAgo: 5 },
    { userId: demoUserId, currency: "SHARD", delta: 12, reason: "STREAK_BONUS", daysAgo: 3 },
    { userId: partnerUserId, currency: "SHARD", delta: 8, reason: "STREAK_BONUS", daysAgo: 3 },
  ];

  for (const e of entries) {
    await prisma.walletEntry.create({
      data: {
        userId: e.userId,
        currency: e.currency,
        delta: e.delta,
        reason: e.reason,
        fromUserId: e.fromUserId,
        refType: e.refType,
        refId: e.refId,
        householdId: e.householdId,
        createdAt: new Date(now - e.daysAgo * 86400000),
      },
    });
  }

  console.log(`Seeded wallet ledger (${entries.length} entries) + 1 confession`);
}

export { seedMarketplace, seedWalletDemo };

if (require.main === module) {
  runSeed()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });
}
