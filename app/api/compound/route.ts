import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { getConsistency } from "@/lib/capture";
import { getActiveHousehold, getHouseholdMembers } from "@/lib/household";

export const dynamic = "force-dynamic";

// The Compound readout: not "you spent $412 this week" but the trajectory
// if this keeps compounding (spec). Weekly net series → projection, the
// consistency north star, and the clan view over shared-visibility entries.
export async function GET(req: NextRequest) {
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const userId = r.user.id;

  const consistency = await getConsistency(userId, 30);

  // ---- Weekly net series, last 12 weeks --------------------------------
  const WEEKS = 12;
  const now = new Date();
  const start = new Date(now.getTime() - WEEKS * 7 * 86_400_000);
  const txs = await prisma.transaction.findMany({
    where: { userId, date: { gte: start } },
    select: { amount: true, type: true, date: true },
  });

  const weeks: { label: string; income: number; expense: number; net: number }[] = [];
  for (let w = WEEKS - 1; w >= 0; w--) {
    const wEnd = new Date(now.getTime() - w * 7 * 86_400_000);
    const wStart = new Date(wEnd.getTime() - 7 * 86_400_000);
    const rows = txs.filter((t) => t.date >= wStart && t.date < wEnd);
    const income = rows.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const expense = rows.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    weeks.push({
      label: wStart.toISOString().slice(5, 10),
      income: Math.round(income * 100) / 100,
      expense: Math.round(expense * 100) / 100,
      net: Math.round((income - expense) * 100) / 100,
    });
  }

  // ---- Projection: if the recent pace keeps compounding ----------------
  const recent = weeks.slice(-4);
  const weeklyNet = recent.length ? recent.reduce((s, w) => s + w.net, 0) / recent.length : 0;
  const monthlyNet = weeklyNet * (52 / 12);
  const APY = 0.045; // parked in a HYSA — deliberately conservative
  const project = (years: number) => {
    const r_ = APY / 12;
    let bal = 0;
    for (let m = 0; m < years * 12; m++) bal = bal * (1 + r_) + monthlyNet;
    return Math.round(bal);
  };
  const projection = monthlyNet > 0
    ? { monthlyNet: Math.round(monthlyNet), y1: project(1), y5: project(5), y10: project(10), apy: APY }
    : { monthlyNet: Math.round(monthlyNet), y1: 0, y5: 0, y10: 0, apy: APY };

  // ---- Clan view: shared-visibility entries across the household -------
  let clan = null;
  const hh = await getActiveHousehold(userId);
  if (hh) {
    const members = await getHouseholdMembers(hh.id);
    const memberIds = members.map((m) => m.userId).filter((x): x is string => !!x);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const shared = await prisma.transaction.findMany({
      // Own rows always visible; partners' rows only when explicitly shared —
      // mirrors the shared-only RLS decision in docs/capture-engine.
      where: {
        date: { gte: monthStart },
        OR: [
          { userId },
          { userId: { in: memberIds.filter((id) => id !== userId) }, visibility: "shared" },
        ],
      },
      select: { userId: true, amount: true, type: true },
    });
    const perMember = memberIds.map((id) => {
      const rows = shared.filter((t) => t.userId === id);
      const income = rows.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
      const expense = rows.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
      const m = members.find((mm) => mm.userId === id);
      return {
        name: m?.user?.name ?? "Member",
        isMe: id === userId,
        income: Math.round(income),
        expense: Math.round(expense),
        net: Math.round(income - expense),
      };
    });
    clan = {
      householdName: hh.name,
      month: monthStart.toISOString().slice(0, 7),
      combinedNet: perMember.reduce((s, m) => s + m.net, 0),
      members: perMember,
    };
  }

  return ok({ consistency, weeks, projection, clan });
}
