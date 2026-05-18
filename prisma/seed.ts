import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEFAULT_CATEGORIES } from "../lib/defaults";

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
  const email = "demo@financewars.app";
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
  await prisma.goal.createMany({
    data: [
      { userId: user.id, name: "Emergency Fund", targetAmount: 15000, currentAmount: 9200, deadline: inMonths(6) },
      { userId: user.id, name: "Tesla Model 3", targetAmount: 42000, currentAmount: 12500, deadline: inMonths(18) },
      { userId: user.id, name: "Japan Trip", targetAmount: 6000, currentAmount: 2100, deadline: inMonths(8) },
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

  console.log(`Seeded demo user: ${email} / ${password}`);
}

if (require.main === module) {
  runSeed()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });
}
