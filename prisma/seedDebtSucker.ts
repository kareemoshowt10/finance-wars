import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

/**
 * Seeds Household HQ demo data on top of the existing "The Smiths" household:
 * two more family members, a week of chore activity, a couple of family
 * loans, and the exact scenario from the product brief — two people voting
 * for a PS5, two voting for a pool, and a bathroom remodel nobody's funded
 * in over a month.
 */
export async function seedDebtSucker(prisma: PrismaClient, householdId: string, demoUserId: string, partnerUserId: string) {
  const now = new Date();
  const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000);

  const passwordHash = await bcrypt.hash("demo1234", 10);
  const existingJordan = await prisma.user.findUnique({ where: { email: "jordan@debtsucker.app" } });
  if (existingJordan) await prisma.user.delete({ where: { id: existingJordan.id } });
  const existingRiley = await prisma.user.findUnique({ where: { email: "riley@debtsucker.app" } });
  if (existingRiley) await prisma.user.delete({ where: { id: existingRiley.id } });

  const jordan = await prisma.user.create({
    data: { email: "jordan@debtsucker.app", passwordHash, name: "Jordan Smith", currency: "USD", onboarded: true },
  });
  const riley = await prisma.user.create({
    data: { email: "riley@debtsucker.app", passwordHash, name: "Riley Smith", currency: "USD", onboarded: true },
  });

  await prisma.householdMember.createMany({
    data: [
      { householdId, userId: jordan.id, role: "MEMBER", accepted: true, joinedAt: daysAgo(40) },
      { householdId, userId: riley.id, role: "MEMBER", accepted: true, joinedAt: daysAgo(40) },
    ],
  });

  // --- Chores ---------------------------------------------------------
  const choreDefs = [
    { name: "Dishes", emoji: "🍽️", frequency: "DAILY", crownValue: 10, xpValue: 5 },
    { name: "Unload dishwasher", emoji: "🧺", frequency: "DAILY", crownValue: 8, xpValue: 4 },
    { name: "Take out trash", emoji: "🗑️", frequency: "WEEKLY", crownValue: 15, xpValue: 8 },
    { name: "Vacuum living room", emoji: "🧹", frequency: "WEEKLY", crownValue: 15, xpValue: 8 },
    { name: "Buy cat food", emoji: "🐈", frequency: "WEEKLY", crownValue: 12, xpValue: 6 },
    { name: "Mow the lawn", emoji: "🌱", frequency: "WEEKLY", crownValue: 20, xpValue: 10 },
  ];
  const chores = await Promise.all(
    choreDefs.map((c) =>
      prisma.chore.create({
        data: { householdId, name: c.name, emoji: c.emoji, frequency: c.frequency, category: "ESSENTIAL", crownValue: c.crownValue, xpValue: c.xpValue, createdById: demoUserId },
      })
    )
  );
  const [dishes, dishwasher, trash, vacuum, catFood, lawn] = chores;

  // Two weeks of activity: Riley leads on dishes, Jordan on the dishwasher,
  // the parents split trash/lawn/cat food — a realistic, lopsided household.
  const completions: { chore: (typeof chores)[number]; userId: string; daysAgo: number }[] = [];
  for (let d = 0; d < 14; d++) {
    completions.push({ chore: dishes, userId: d % 3 === 0 ? demoUserId : riley.id, daysAgo: d });
    if (d % 2 === 0) completions.push({ chore: dishwasher, userId: jordan.id, daysAgo: d });
  }
  completions.push({ chore: trash, userId: partnerUserId, daysAgo: 2 });
  completions.push({ chore: trash, userId: partnerUserId, daysAgo: 9 });
  completions.push({ chore: vacuum, userId: riley.id, daysAgo: 4 });
  completions.push({ chore: catFood, userId: jordan.id, daysAgo: 6 });
  completions.push({ chore: catFood, userId: demoUserId, daysAgo: 13 });
  completions.push({ chore: lawn, userId: demoUserId, daysAgo: 5 });

  const xpTotals = new Map<string, number>();
  for (const c of completions) {
    await prisma.choreCompletion.create({
      data: {
        choreId: c.chore.id,
        householdId,
        userId: c.userId,
        completedAt: daysAgo(c.daysAgo),
        crownsAwarded: c.chore.crownValue,
        xpAwarded: c.chore.xpValue,
      },
    });
    await prisma.walletEntry.create({
      data: {
        userId: c.userId,
        currency: "CROWNS",
        delta: c.chore.crownValue,
        reason: "CHORE_COMPLETED",
        refType: "Chore",
        refId: c.chore.id,
        householdId,
        createdAt: daysAgo(c.daysAgo),
      },
    });
    xpTotals.set(c.userId, (xpTotals.get(c.userId) ?? 0) + c.chore.xpValue);
  }
  for (const [userId, xp] of xpTotals) {
    await prisma.user.update({ where: { id: userId }, data: { xp: { increment: xp } } });
  }

  // --- The Bank: family loans ------------------------------------------
  const headsetLoan = await prisma.loan.create({
    data: {
      householdId,
      lenderUserId: demoUserId,
      borrowerUserId: jordan.id,
      principal: 60,
      balanceRemaining: 40,
      interestRateApr: 0,
      purpose: "New gaming headset",
      category: "ELECTIVE",
      status: "ACTIVE",
      createdAt: daysAgo(18),
    },
  });
  await prisma.loanPayment.create({
    data: { loanId: headsetLoan.id, amount: 20, note: "Chore money", createdAt: daysAgo(6) },
  });

  await prisma.loan.create({
    data: {
      householdId,
      lenderUserId: partnerUserId,
      borrowerUserId: riley.id,
      principal: 150,
      balanceRemaining: 150,
      interestRateApr: 5,
      purpose: "Car insurance top-up",
      category: "ESSENTIAL",
      status: "ACTIVE",
      dueDate: daysAgo(-60),
      createdAt: daysAgo(10),
    },
  });

  // --- Household Goals: PS5 vs. the pool, and the neglected bathroom ---
  const ps5 = await prisma.householdGoal.create({
    data: {
      householdId,
      name: "PS5",
      emoji: "🎮",
      description: "Jordan and the demo account are in. Riley and Sam want the pool instead.",
      targetAmount: 500,
      currentAmount: 180,
      category: "ELECTIVE",
      status: "ACTIVE",
      createdById: jordan.id,
      lastContributionAt: daysAgo(2),
      createdAt: daysAgo(20),
    },
  });
  await prisma.householdGoalVote.createMany({ data: [{ goalId: ps5.id, userId: jordan.id }, { goalId: ps5.id, userId: demoUserId }] });
  await prisma.householdGoalContribution.createMany({
    data: [
      { goalId: ps5.id, userId: jordan.id, amount: 100, source: "CASH", createdAt: daysAgo(15) },
      { goalId: ps5.id, userId: demoUserId, amount: 80, source: "CASH", createdAt: daysAgo(2) },
    ],
  });

  const pool = await prisma.householdGoal.create({
    data: {
      householdId,
      name: "Above-Ground Pool",
      emoji: "🏊",
      description: "Riley and Sam's pick. Summer's coming.",
      targetAmount: 2200,
      currentAmount: 300,
      category: "ELECTIVE",
      status: "ACTIVE",
      createdById: riley.id,
      lastContributionAt: daysAgo(5),
      createdAt: daysAgo(25),
    },
  });
  await prisma.householdGoalVote.createMany({ data: [{ goalId: pool.id, userId: riley.id }, { goalId: pool.id, userId: partnerUserId }] });
  await prisma.householdGoalContribution.createMany({
    data: [
      { goalId: pool.id, userId: riley.id, amount: 100, source: "CASH", createdAt: daysAgo(20) },
      { goalId: pool.id, userId: partnerUserId, amount: 200, source: "CASH", createdAt: daysAgo(5) },
    ],
  });

  const bathroom = await prisma.householdGoal.create({
    data: {
      householdId,
      name: "Bathroom Remodel",
      emoji: "🚽",
      description: "The one everyone agrees on and nobody funds.",
      targetAmount: 6000,
      currentAmount: 350,
      category: "ESSENTIAL",
      status: "ACTIVE",
      createdById: demoUserId,
      lastContributionAt: daysAgo(35),
      createdAt: daysAgo(120),
    },
  });
  await prisma.householdGoalContribution.create({
    data: { goalId: bathroom.id, userId: demoUserId, amount: 350, source: "CASH", createdAt: daysAgo(35) },
  });

  console.log("Seeded Household HQ: chores, family loans, and the PS5-vs-pool goal fight");
}
