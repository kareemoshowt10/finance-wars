import { NextRequest } from "next/server";
import { z } from "zod";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { maybeCompleteQuest } from "@/lib/squad";
import { log } from "@/lib/audit";

export const dynamic = "force-dynamic";

const contribSchema = z.object({
  amount: z.coerce.number().positive(),
  note: z.string().max(200).optional(),
});

export async function POST(req: NextRequest, { params }: { params: { questId: string } }) {
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const parsed = contribSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return bad("Invalid input", 400);

  const quest = await prisma.squadQuest.findUnique({
    where: { id: params.questId },
    include: { squad: { include: { members: true } } },
  });
  if (!quest) return bad("Not found", 404);
  if (quest.status !== "ACTIVE") return bad("Quest is not active");

  const isMember = quest.squad.members.some((m) => m.userId === r.user.id);
  if (!isMember) return bad("Forbidden", 403);

  const contribution = await prisma.squadContribution.create({
    data: {
      questId: quest.id,
      userId: r.user.id,
      amount: parsed.data.amount,
      note: parsed.data.note,
    },
  });
  await log(r.user.id, "contribute", { entity: "SquadQuest", entityId: quest.id, meta: { amount: parsed.data.amount }, req });

  const completion = await maybeCompleteQuest(quest.id);
  return ok({ contribution, completed: !!completion });
}
