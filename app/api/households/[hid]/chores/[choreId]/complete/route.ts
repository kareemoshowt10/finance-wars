import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { assertMember, getHouseholdMembers } from "@/lib/household";
import { award } from "@/lib/wallet";
import { computeStreak } from "@/lib/chores";
import { getHouseholdStreak, maybeAwardDailyBonus } from "@/lib/dailyEngagement";
import { evaluate } from "@/lib/achievements/engine";
import { log } from "@/lib/audit";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  note: z.string().max(200).optional(),
});

export async function POST(req: NextRequest, { params }: { params: { hid: string; choreId: string } }) {
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const fb = await assertMember(r.user.id, params.hid);
  if (fb) return fb;

  const chore = await prisma.chore.findUnique({ where: { id: params.choreId } });
  if (!chore || chore.householdId !== params.hid || !chore.active) return bad("Not found", 404);

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return bad("Invalid input", 400);

  const completion = await prisma.choreCompletion.create({
    data: {
      choreId: chore.id,
      householdId: params.hid,
      userId: r.user.id,
      note: parsed.data.note,
      crownsAwarded: chore.crownValue,
      xpAwarded: chore.xpValue,
    },
  });

  await Promise.all([
    award({
      userId: r.user.id,
      currency: "CROWNS",
      delta: chore.crownValue,
      reason: "CHORE_COMPLETED",
      refType: "Chore",
      refId: chore.id,
      householdId: params.hid,
      meta: { choreName: chore.name },
    }),
    prisma.user.update({ where: { id: r.user.id }, data: { xp: { increment: chore.xpValue } } }),
    log(r.user.id, "complete", { entity: "Chore", entityId: chore.id, req }),
  ]);

  // Household-wide daily streak: did this person do *something* today, and
  // for how many days running. Any chore counts — the point is showing up.
  const [myCompletions, totalCompletions, members] = await Promise.all([
    prisma.choreCompletion.findMany({
      where: { householdId: params.hid, userId: r.user.id },
      select: { completedAt: true },
      orderBy: { completedAt: "desc" },
      take: 400,
    }),
    prisma.choreCompletion.count({ where: { householdId: params.hid, userId: r.user.id } }),
    getHouseholdMembers(params.hid),
  ]);
  const streak = computeStreak(myCompletions.map((c) => c.completedAt), "DAILY");

  await evaluate(r.user.id, { type: "chore-completed", streak, totalCompletions });

  const householdStreak = await getHouseholdStreak(params.hid);
  await evaluate(r.user.id, { type: "household-streak", current: householdStreak.current });
  const bonusAwarded = await maybeAwardDailyBonus(params.hid, r.user.id);

  const doer = members.find((m) => m.userId === r.user.id);
  await Promise.all(
    members
      .filter((m) => m.userId && m.userId !== r.user.id)
      .map((m) =>
        prisma.notification.create({
          data: {
            userId: m.userId as string,
            kind: "CHORE",
            title: `${chore.emoji} ${doer?.user?.name || "Someone"} did "${chore.name}"`,
            body: `+${chore.crownValue} Crowns, +${chore.xpValue} XP${streak > 1 ? ` — ${streak}-day streak` : ""}`,
            link: "/dashboard/household/chores",
          },
        }).catch(() => null)
      )
  );

  return ok({ completion, streak, totalCompletions, householdStreak, bonusAwarded });
}
