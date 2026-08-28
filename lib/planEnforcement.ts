import { NextResponse } from "next/server";
import { prisma } from "./prisma";
import { planById, Plan } from "./plans";

/**
 * Server-side paywall enforcement for Household HQ. Each check re-reads the
 * household's plan and current usage from the DB — cheap, and the only way
 * to make a limit actually mean something (the client-side copy in the UI
 * is just a preview of this).
 */

type Resource = "chores" | "loans" | "goals";

const COUNTERS: Record<Resource, (householdId: string) => Promise<number>> = {
  chores: (hid) => prisma.chore.count({ where: { householdId: hid, active: true } }),
  loans: (hid) => prisma.loan.count({ where: { householdId: hid, status: "ACTIVE" } }),
  goals: (hid) => prisma.householdGoal.count({ where: { householdId: hid, status: "ACTIVE" } }),
};

const LIMIT_KEY: Record<Resource, keyof Plan> = {
  chores: "choreLimit",
  loans: "activeLoanLimit",
  goals: "activeGoalLimit",
};

const LABEL: Record<Resource, string> = {
  chores: "active chores",
  loans: "active family loans",
  goals: "active household goals",
};

function upgradeResponse(message: string, planId: string) {
  return NextResponse.json({ error: message, upgrade: true, planId }, { status: 402 });
}

async function getPlan(householdId: string) {
  const household = await prisma.household.findUnique({ where: { id: householdId }, select: { plan: true } });
  return planById(household?.plan ?? "free");
}

/** Returns a 402 response if creating one more `resource` would exceed the household's plan, else null. */
export async function assertWithinLimit(householdId: string, resource: Resource) {
  const plan = await getPlan(householdId);
  const limit = plan[LIMIT_KEY[resource]] as number | null;
  if (limit === null) return null;

  const count = await COUNTERS[resource](householdId);
  if (count < limit) return null;
  return upgradeResponse(`You've hit the ${plan.name} plan's limit of ${limit} ${LABEL[resource]}.`, plan.id);
}

/** Returns a 402 if the household is at its member-seat limit (accepted + pending invites), else null. */
export async function assertMemberLimit(householdId: string) {
  const plan = await getPlan(householdId);
  const [accepted, pending] = await Promise.all([
    prisma.householdMember.count({ where: { householdId, accepted: true } }),
    prisma.householdMember.count({ where: { householdId, accepted: false, declined: false } }),
  ]);
  if (accepted + pending < plan.memberLimit) return null;
  return upgradeResponse(`You've hit the ${plan.name} plan's limit of ${plan.memberLimit} household members.`, plan.id);
}

/** Returns a 402 if the household's plan doesn't allow interest-bearing loans, else null. */
export async function assertInterestAllowed(householdId: string) {
  const plan = await getPlan(householdId);
  if (plan.included.includes("loan_interest")) return null;
  return upgradeResponse(`Interest-bearing loans are a Household HQ feature. Upgrade, or set the rate to 0%.`, plan.id);
}
