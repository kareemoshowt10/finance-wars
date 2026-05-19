import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const duel = await prisma.duel.findUnique({
    where: { id: params.id },
    include: {
      players: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      sprints: {
        orderBy: { weekNumber: "asc" },
        include: {
          contributions: { orderBy: { createdAt: "desc" } },
          targets: true,
        },
      },
    },
  });
  if (!duel) return bad("Not found", 404);
  const isMember =
    duel.players.some((p) => p.userId === r.user.id) ||
    duel.players.some((p) => p.inviteEmail === r.user.email);
  if (!isMember) return bad("Forbidden", 403);

  const playersOut = duel.players.map((p) => ({
    ...p,
    displayName: p.user?.name || (p.inviteEmail ? p.inviteEmail.split("@")[0] : "Sparring Partner"),
  }));

  const currentSprint = duel.sprints.find((s) => s.status === "ACTIVE") ?? null;

  const events = await prisma.duelEvent.findMany({
    where: { duelId: duel.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const cheers = await prisma.cheer.findMany({
    where: { duelId: duel.id },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  // open disputes
  const openDisputes = await prisma.dispute.findMany({
    where: { contribution: { sprint: { duelId: duel.id } }, status: "PENDING" },
    include: { contribution: true },
    orderBy: { createdAt: "desc" },
  });

  const me = duel.players.find((p) => p.userId === r.user.id) ?? null;

  const allContribs = duel.sprints.flatMap((s) => s.contributions);
  const combinedPoints = allContribs
    .filter((c) => c.disputeStatus !== "PENDING" && c.disputeStatus !== "CONCEDED")
    .reduce((sum, c) => sum + c.amount, 0);
  const totalSprints = Math.max(
    1,
    Math.ceil((duel.endDate.getTime() - duel.startDate.getTime()) / (duel.sprintLengthDays * 86400000))
  );
  const sprintCombinedTarget =
    duel.mode === "COOP" ? Math.round((duel.targetAmount / totalSprints) * 100) / 100 : null;

  return ok({
    duel,
    mode: duel.mode,
    combinedPoints: Math.round(combinedPoints * 100) / 100,
    sprintCombinedTarget,
    players: playersOut,
    sprints: duel.sprints,
    currentSprintId: currentSprint?.id ?? null,
    events,
    cheers,
    openDisputes,
    me,
  });
}
