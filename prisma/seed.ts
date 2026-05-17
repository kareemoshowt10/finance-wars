import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const EXPENSE_CATS = [
  "Food & Dining", "Groceries", "Transport", "Shopping",
  "Entertainment", "Bills & Utilities", "Housing", "Health", "Travel",
];
const INCOME_CATS = ["Salary", "Freelance", "Investment"];

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

async function main() {
  const email = "demo@financewars.app";
  const password = "demo1234";
  const passwordHash = await bcrypt.hash(password, 10);

  // wipe demo user
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await prisma.user.delete({ where: { email } });
  }

  const user = await prisma.user.create({
    data: { email, passwordHash, name: "Demo Trader", currency: "USD" },
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

  // ~40 transactions across 90 days
  for (let i = 0; i < 40; i++) {
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
      const cat = pick(EXPENSE_CATS);
      transactions.push({
        accountId: pick([accounts[0].id, accounts[2].id]),
        amount: Number(rand(8, 280).toFixed(2)),
        type: "expense",
        category: cat,
        description: pick([
          "Coffee", "Lunch", "Uber", "Amazon", "Spotify", "Rent", "Electric bill",
          "Gym", "Pharmacy", "Trader Joe's", "Airbnb", "Flight", "Restaurant", "Gas",
        ]),
        date,
      });
    }
  }

  await prisma.transaction.createMany({ data: transactions.map((t) => ({ ...t, userId: user.id })) });

  // budgets for current month
  const m = monthKey(now);
  const budgets = [
    { category: "Food & Dining", limit: 400 },
    { category: "Groceries", limit: 500 },
    { category: "Transport", limit: 200 },
    { category: "Entertainment", limit: 150 },
    { category: "Shopping", limit: 350 },
  ];
  for (const b of budgets) {
    await prisma.budget.create({
      data: { userId: user.id, category: b.category, limit: b.limit, month: m },
    });
  }

  // goals
  const inMonths = (n: number) => {
    const d = new Date(now); d.setMonth(d.getMonth() + n); return d;
  };
  await prisma.goal.createMany({
    data: [
      { userId: user.id, name: "Emergency Fund", targetAmount: 15000, currentAmount: 9200, deadline: inMonths(6) },
      { userId: user.id, name: "Tesla Model 3", targetAmount: 42000, currentAmount: 12500, deadline: inMonths(18) },
      { userId: user.id, name: "Japan Trip", targetAmount: 6000, currentAmount: 2100, deadline: inMonths(8) },
    ],
  });

  console.log(`Seeded demo user: ${email} / ${password}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
