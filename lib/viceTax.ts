import { prisma } from "./prisma";
import { notify } from "./notifications";
import { evaluate as evalAch } from "./achievements/engine";

export function computeTaxAmount(mode: string, rate: number, transactionAmount: number): number {
  if (rate <= 0 || transactionAmount <= 0) return 0;
  if (mode === "PERCENT") return Math.round(transactionAmount * (rate / 100) * 100) / 100;
  return Math.min(transactionAmount, Math.round(rate * 100) / 100);
}

export async function applyViceTaxOnTransaction(userId: string, tx: { id: string; amount: number; category: string; type: string; date: Date }) {
  if (tx.type !== "expense") return null;
  const vice = await prisma.viceTax.findUnique({
    where: { userId_category: { userId, category: tx.category } },
  });
  if (!vice || !vice.enabled) return null;

  const taxAmount = computeTaxAmount(vice.mode, vice.rate, tx.amount);
  if (taxAmount <= 0) return null;

  // Idempotency: never tax the same transaction twice.
  const already = await prisma.goalContribution.findFirst({
    where: { userId, transactionId: tx.id, viceTaxId: { not: null } },
  });
  if (already) return null;

  await prisma.$transaction([
    prisma.goal.update({
      where: { id: vice.goalId },
      data: { currentAmount: { increment: taxAmount } },
    }),
    prisma.goalContribution.create({
      data: {
        userId,
        goalId: vice.goalId,
        amount: taxAmount,
        date: tx.date,
        transactionId: tx.id,
        viceTaxId: vice.id,
        note: `Vice tax · ${tx.category}`,
      },
    }),
    prisma.viceTax.update({
      where: { id: vice.id },
      data: {
        taxedTotal: { increment: taxAmount },
        hitCount: { increment: 1 },
      },
    }),
  ]);

  const newTotal = vice.taxedTotal + taxAmount;
  await notify(
    userId,
    "VICE_TAX_HIT",
    `Vice tax: +${taxAmount.toFixed(2)}`,
    `${tx.category} → goal. Total funneled: ${newTotal.toFixed(2)}.`,
    "/dashboard/vice-tax",
    `vicetax:hit:${tx.id}`
  );
  evalAch(userId, { type: "vice-tax-total", total: newTotal }).catch(() => {});

  return { taxAmount, goalId: vice.goalId };
}

export async function reverseViceTaxForTransaction(userId: string, transactionId: string) {
  const contribs = await prisma.goalContribution.findMany({
    where: { userId, transactionId },
  });
  if (contribs.length === 0) return;
  for (const c of contribs) {
    // Only reverse vice-tax-originated contributions.
    if (!c.viceTaxId) continue;
    await prisma.$transaction([
      prisma.goal.update({
        where: { id: c.goalId },
        data: { currentAmount: { decrement: c.amount } },
      }),
      prisma.goalContribution.delete({ where: { id: c.id } }),
    ]);
    // Decrement the exact vice tax that produced this contribution.
    const tax = await prisma.viceTax.findUnique({ where: { id: c.viceTaxId } });
    if (tax) {
      await prisma.viceTax.update({
        where: { id: tax.id },
        data: {
          taxedTotal: { decrement: c.amount },
          hitCount: { decrement: 1 },
        },
      });
    }
  }
}
