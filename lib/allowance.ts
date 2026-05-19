import { prisma } from "./prisma";

export function monthKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export const PERSONAL_ALLOWANCE_CATEGORY = "Personal Allowance";

export async function getOrCreateMonth(householdId: string, userId: string, month: string) {
  const pact = await prisma.pact.findUnique({ where: { householdId } });
  if (!pact) return null;
  const members = await prisma.householdMember.findMany({
    where: { householdId, accepted: true, userId: { not: null } },
    orderBy: { joinedAt: "asc" },
  });
  const idx = members.findIndex((m) => m.userId === userId);
  const allocated = idx === 0 ? pact.personalAllowanceA : pact.personalAllowanceB;
  return prisma.allowanceLedger.upsert({
    where: { householdId_userId_month: { householdId, userId, month } },
    update: {},
    create: { householdId, userId, month, allocated, spent: 0 },
  });
}

export async function recordAllowanceSpend(householdId: string, userId: string, month: string, amount: number) {
  const led = await getOrCreateMonth(householdId, userId, month);
  if (!led) return null;
  return prisma.allowanceLedger.update({
    where: { id: led.id },
    data: { spent: { increment: amount } },
  });
}

export async function getMonthLedgers(householdId: string, month: string) {
  const members = await prisma.householdMember.findMany({
    where: { householdId, accepted: true, userId: { not: null } },
    include: { user: { select: { id: true, name: true } } },
  });
  const out = [];
  for (const m of members) {
    const led = await getOrCreateMonth(householdId, m.userId!, month);
    if (led) out.push({ ...led, user: m.user });
  }
  return out;
}
