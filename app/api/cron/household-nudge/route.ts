import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyCron } from "@/lib/cron";
import { getHouseholdStreak, hasHouseholdActivityToday } from "@/lib/dailyEngagement";
import { dayKey, hourInZone, isValidTimeZone, DEFAULT_TIMEZONE } from "@/lib/time";

export const dynamic = "force-dynamic";

/**
 * Runs hourly and nudges each household during *its own* evening, rather
 * than all of them at one fixed UTC hour — an 8pm-UTC nudge reaches a Los
 * Angeles family at lunchtime, which is both useless as a "before midnight"
 * warning and mildly annoying.
 *
 * Any household with a live streak that hasn't logged a chore yet on its own
 * calendar day gets one nudge to everyone. Deduped per household per local
 * day via Notification's (userId, key) unique constraint, so the hourly
 * cadence can't produce repeat pings.
 */
const NUDGE_HOUR_LOCAL = 20; // 8pm, leaving a few hours to save the streak

export async function GET(req: Request) {
  const fail = verifyCron(req);
  if (fail) return fail;

  const households = await prisma.household.findMany({
    select: {
      id: true,
      name: true,
      timezone: true,
      members: { where: { accepted: true }, select: { userId: true } },
    },
  });

  const now = new Date();
  let nudged = 0;
  let inWindow = 0;

  for (const hh of households) {
    try {
      const tz = hh.timezone && isValidTimeZone(hh.timezone) ? hh.timezone : DEFAULT_TIMEZONE;
      if (hourInZone(now, tz) !== NUDGE_HOUR_LOCAL) continue;
      inWindow++;

      const today = dayKey(now, tz);
      const [streak, activeToday] = await Promise.all([
        getHouseholdStreak(hh.id, now, tz),
        hasHouseholdActivityToday(hh.id, now, tz),
      ]);
      if (streak.current <= 0 || activeToday) continue;

      const memberIds = hh.members.map((m) => m.userId).filter((id): id is string => !!id);
      const sent = await Promise.all(
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
      // Only count a household we actually pinged: on the second hourly pass of
      // the same evening every create is a swallowed unique violation, and
      // reporting those as nudges would make the cron look busier than it is.
      if (sent.some(Boolean)) nudged++;
    } catch {}
  }

  return NextResponse.json({ ok: true, householdsChecked: households.length, inWindow, nudged });
}
