import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { assertMember, getHouseholdMembers } from "@/lib/household";
import { assertWithinLimit } from "@/lib/planEnforcement";
import { householdTimeZone } from "@/lib/dailyEngagement";
import { log } from "@/lib/audit";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  name: z.string().min(1).max(80),
  emoji: z.string().max(8).optional(),
  description: z.string().max(300).optional(),
  frequency: z.enum(["DAILY", "WEEKLY", "ONEOFF"]).default("DAILY"),
  category: z.enum(["ESSENTIAL", "ELECTIVE"]).default("ESSENTIAL"),
  crownValue: z.coerce.number().int().min(1).max(1000).default(10),
  xpValue: z.coerce.number().int().min(0).max(1000).default(5),
});

export async function GET(req: NextRequest, { params }: { params: { hid: string } }) {
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const fb = await assertMember(r.user.id, params.hid);
  if (fb) return fb;

  const since = new Date(Date.now() - 30 * 86400000);
  const [timezone, chores, completions, members] = await Promise.all([
    householdTimeZone(params.hid),
    prisma.chore.findMany({
      where: { householdId: params.hid, active: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.choreCompletion.findMany({
      where: { householdId: params.hid, completedAt: { gte: since } },
      orderBy: { completedAt: "desc" },
    }),
    getHouseholdMembers(params.hid),
  ]);

  return ok({
    // The client re-derives "due today" and streaks locally, so it needs the
    // same day boundaries the server uses.
    timezone,
    chores,
    completions,
    members: members
      .filter((m) => m.userId)
      .map((m) => ({ userId: m.userId as string, name: m.user?.name || "Member" })),
  });
}

export async function POST(req: NextRequest, { params }: { params: { hid: string } }) {
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const fb = await assertMember(r.user.id, params.hid);
  if (fb) return fb;

  const parsed = createSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return bad("Invalid input", 400);

  const fbPlan = await assertWithinLimit(params.hid, "chores");
  if (fbPlan) return fbPlan;

  const chore = await prisma.chore.create({
    data: {
      householdId: params.hid,
      name: parsed.data.name,
      emoji: parsed.data.emoji || "🧹",
      description: parsed.data.description,
      frequency: parsed.data.frequency,
      category: parsed.data.category,
      crownValue: parsed.data.crownValue,
      xpValue: parsed.data.xpValue,
      createdById: r.user.id,
    },
  });
  await log(r.user.id, "create", { entity: "Chore", entityId: chore.id, req });
  return ok({ chore });
}
