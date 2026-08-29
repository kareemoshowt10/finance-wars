import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyCron } from "@/lib/cron";
import { getHouseholdStreak, hasHouseholdActivityToday } from "@/lib/dailyEngagement";
import { dateKey } from "@/lib/dailyObjectives";

export const dynamic = "force-dynamic";

/**
 * Run once daily, in the evening. Any household with an active streak that
 * hasn't logged a chore yet today gets one nudge to everyone — "the streak
 * dies at midnight unless someone does something." Dedupes per household
 * per day via Notification's (userId, key) unique constraint.
 */
export async function GET(req: Request) {
  const fail = verifyCron(req);
  if (fail) return fail;

  const households = await prisma.household.findMany({
    select: { id: true, name: true, members: { where: { accepted: true }, select: { userId: true } } },
  });

  let nudged = 0;
  const today = dateKey();

  for (const hh of households) {
    try {
      const [streak, activeToday] = await Promise.all([
        getHouseholdStreak(hh.id),
        hasHouseholdActivityToday(hh.id),
      ]);
      if (streak.current <= 0 || activeToday) continue;

      const memberIds = hh.members.map((m) => m.userId).filter((id): id is string => !!id);
      await Promise.all(
        memberIds.map((userId) =>
          prisma.notification
            .create({
              data: {
                userId,
                kind: "HOUSEHOLD_STREAK_AT_RISK",
                title: `🔥 ${hh.name}'s ${streak.current}-day streak is at risk`,
                body: "Nobody's logged a chore today — do one before midnight to keep it alive.",
                link: "/dashboard/household",
                key: `streak-risk:${hh.id}:${today}`,
              },
            })
            .catch(() => null) // unique violation = already nudged today
        )
      );
      nudged++;
    } catch {}
  }

  return NextResponse.json({ ok: true, householdsChecked: households.length, nudged });
}
