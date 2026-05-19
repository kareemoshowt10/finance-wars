import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { parseBody } from "@/lib/validate";
import { rateLimit, DEFAULT_MUTATION } from "@/lib/ratelimit";
import { log } from "@/lib/audit";
import { openNextSprint } from "@/lib/duels/sprints";

const createSchema = z
  .object({
    title: z.string().min(1).max(120),
    mode: z.enum(["DUEL", "COOP"]).optional().default("DUEL"),
    goalId: z.string().optional().nullable(),
    targetAmount: z.coerce.number().positive().max(10_000_000),
    sprintLengthDays: z.union([z.literal(3), z.literal(7), z.literal(14)]),
    startDate: z.string(),
    endDate: z.string(),
    stakeText: z.string().min(1).max(280),
    autoPenaltyEnabled: z.boolean().default(false),
    stakeAmount: z.coerce.number().nonnegative().optional(),
    stakePercentCap: z.coerce.number().int().min(1).max(100).optional(),
    stakeAccountId: z.string().optional(),
    dailyCap: z.coerce.number().positive().optional(),
    inviteEmail: z.string().email().optional(),
    practiceOpponentDailyAvg: z.coerce.number().positive().max(5000).optional(),
  })
  .refine(
    (d) => !(d.inviteEmail && d.practiceOpponentDailyAvg),
    { message: "Either invite a partner OR choose practice mode" }
  )
  .refine((d) => d.inviteEmail || d.practiceOpponentDailyAvg, {
    message: "Pick an opponent",
  });

export async function GET(req: NextRequest) {
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const userId = r.user.id;

  const players = await prisma.duelPlayer.findMany({
    where: { OR: [{ userId }, { inviteEmail: r.user.email }] },
    include: {
      duel: {
        include: {
          players: { include: { user: { select: { id: true, name: true, email: true } } } },
        },
      },
    },
  });

  const duels = players.map((p) => p.duel);
  const seen = new Set<string>();
  const unique = duels.filter((d) => (seen.has(d.id) ? false : (seen.add(d.id), true)));

  const active = unique.filter((d) => d.status === "ACTIVE");
  const completed = unique.filter((d) => d.status === "COMPLETED" || d.status === "ABANDONED");
  const pendingInvites = unique.filter((d) => {
    if (d.status !== "PENDING") return false;
    // Show in pending if user is the invitee (not joined yet)
    const me = d.players.find((p) => p.userId === userId);
    if (me) return !me.accepted;
    const invited = d.players.find((p) => p.inviteEmail === r.user.email);
    return !!invited;
  });

  return ok({ active, pendingInvites, completed });
}

export async function POST(req: NextRequest) {
  const rl = rateLimit(req, { key: "duels", ...DEFAULT_MUTATION });
  if (rl) return rl;
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const { data, error } = await parseBody(req, createSchema);
  if (error) return error;

  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return bad("Invalid dates", 422);
  if (start >= end) return bad("Start must be before end", 422);
  const days = (end.getTime() - start.getTime()) / 86400000;
  if (days < data.sprintLengthDays) return bad("Duration too short for one sprint", 422);

  const isPractice = !!data.practiceOpponentDailyAvg;
  const isCoop = data.mode === "COOP";

  const duel = await prisma.duel.create({
    data: {
      creatorUserId: r.user.id,
      title: data.title,
      mode: data.mode,
      goalId: data.goalId ?? null,
      targetAmount: data.targetAmount,
      sprintLengthDays: data.sprintLengthDays,
      startDate: start,
      endDate: end,
      stakeText: isCoop ? (data.stakeText || "Build it together") : data.stakeText,
      autoPenaltyEnabled: isCoop ? false : data.autoPenaltyEnabled,
      stakeAmount: data.stakeAmount ?? null,
      stakePercentCap: data.stakePercentCap ?? 10,
      dailyCap: data.dailyCap ?? 500,
      isPractice,
      practiceOpponentDailyAvg: data.practiceOpponentDailyAvg ?? null,
      status: isPractice ? "ACTIVE" : "PENDING",
    },
  });

  await prisma.duelPlayer.create({
    data: {
      duelId: duel.id,
      userId: r.user.id,
      side: "A",
      accepted: true,
      joinedAt: new Date(),
      stakeAccountId: data.stakeAccountId ?? null,
    },
  });

  if (isPractice) {
    await prisma.duelPlayer.create({
      data: {
        duelId: duel.id,
        userId: null,
        side: "B",
        accepted: true,
        joinedAt: new Date(),
      },
    });
    await openNextSprint(duel.id);
  } else {
    await prisma.duelPlayer.create({
      data: {
        duelId: duel.id,
        userId: null,
        inviteEmail: data.inviteEmail!.toLowerCase(),
        side: "B",
        accepted: false,
      },
    });
    // Notify invitee if user exists
    const invitee = await prisma.user.findUnique({ where: { email: data.inviteEmail!.toLowerCase() } });
    if (invitee) {
      try {
        await prisma.notification.create({
          data: {
            userId: invitee.id,
            kind: "DUEL_INVITE_RECEIVED",
            title: `Duel invite: ${duel.title}`,
            body: `${r.user.name} challenged you. Loser: ${duel.stakeText}`,
            link: `/dashboard/duels/${duel.id}`,
            key: `duel:${duel.id}:invite:${invitee.id}`,
          },
        });
      } catch {}
    }
  }

  await log(r.user.id, "duel.create", { entity: "duel", entityId: duel.id, meta: { title: duel.title }, req });
  const { evaluate: evalAch } = await import("@/lib/achievements/engine");
  evalAch(r.user.id, { type: "duel-created" }).catch(() => {});
  if (!isPractice) evalAch(r.user.id, { type: "duel-invited" }).catch(() => {});
  return ok(duel);
}
