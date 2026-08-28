import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "./prisma";

export const ACTIVE_HOUSEHOLD_COOKIE = "fw_active_household";

export async function getMyHouseholds(userId: string) {
  const members = await prisma.householdMember.findMany({
    where: { userId, accepted: true },
    include: { household: true },
    orderBy: { joinedAt: "desc" },
  });
  return members.map((m) => ({ ...m.household, role: m.role, joinedAt: m.joinedAt }));
}

export async function getActiveHousehold(userId: string) {
  const cookieVal = cookies().get(ACTIVE_HOUSEHOLD_COOKIE)?.value;
  if (cookieVal) {
    const member = await prisma.householdMember.findFirst({
      where: { userId, householdId: cookieVal, accepted: true },
      include: { household: true },
    });
    if (member) return member.household;
  }
  const member = await prisma.householdMember.findFirst({
    where: { userId, accepted: true },
    include: { household: true },
    orderBy: { joinedAt: "desc" },
  });
  return member?.household ?? null;
}

export async function getHouseholdMembers(householdId: string) {
  return prisma.householdMember.findMany({
    where: { householdId },
    include: { user: { select: { id: true, email: true, name: true } } },
    orderBy: { role: "asc" },
  });
}

export async function isMember(userId: string, householdId: string) {
  const m = await prisma.householdMember.findFirst({
    where: { userId, householdId, accepted: true },
  });
  return !!m;
}

export async function assertMember(userId: string, householdId: string) {
  if (!(await isMember(userId, householdId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

/** Billing actions (upgrade, downgrade, manage payment method) are restricted to the household's OWNER. */
export async function assertOwner(userId: string, householdId: string) {
  const member = await prisma.householdMember.findFirst({
    where: { userId, householdId, accepted: true },
  });
  if (!member || member.role !== "OWNER") {
    return NextResponse.json({ error: "Only the household owner can manage billing" }, { status: 403 });
  }
  return null;
}

export async function getOtherMember(householdId: string, selfUserId: string) {
  return prisma.householdMember.findFirst({
    where: { householdId, accepted: true, userId: { not: selfUserId } },
    include: { user: { select: { id: true, email: true, name: true } } },
  });
}
