import { NextRequest } from "next/server";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { assertMember } from "@/lib/household";
import { getHouseholdStreak, getDailyObjectiveStatuses, hasBonusToday, householdTimeZone } from "@/lib/dailyEngagement";

export const dynamic = "force-dynamic";

/** Today's engagement snapshot: the household's shared streak + this user's 3 daily objectives. */
export async function GET(req: NextRequest, { params }: { params: { hid: string } }) {
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const fb = await assertMember(r.user.id, params.hid);
  if (fb) return fb;

  // Resolved once and threaded through, so the three reads below don't each
  // re-fetch the household row.
  const timezone = await householdTimeZone(params.hid);
  const now = new Date();
  const [streak, objectives, bonusClaimedToday] = await Promise.all([
    getHouseholdStreak(params.hid, now, timezone),
    getDailyObjectiveStatuses(params.hid, r.user.id, now, timezone),
    hasBonusToday(r.user.id, params.hid, now, timezone),
  ]);

  return ok({ streak, objectives, bonusClaimedToday, timezone });
}
