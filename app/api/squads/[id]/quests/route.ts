import { NextRequest } from "next/server";
import { z } from "zod";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { log } from "@/lib/audit";

export const dynamic = "force-dynamic";

const questSchema = z.object({
  title: z.string().min(1).max(80),
  description: z.string().max(400).optional(),
  mode: z.enum(["COOP", "RACE"]).default("COOP"),
  targetAmount: z.coerce.number().positive(),
  deadline: z.string(),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const parsed = questSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return bad("Invalid input", 400);

  const member = await prisma.squadMember.findUnique({
    where: { squadId_userId: { squadId: params.id, userId: r.user.id } },
  });
  if (!member) return bad("Forbidden", 403);

  const deadline = new Date(parsed.data.deadline);
  if (isNaN(deadline.getTime()) || deadline < new Date()) return bad("Deadline must be in the future");

  const quest = await prisma.squadQuest.create({
    data: {
      squadId: params.id,
      title: parsed.data.title,
      description: parsed.data.description,
      mode: parsed.data.mode,
      targetAmount: parsed.data.targetAmount,
      deadline,
      createdById: r.user.id,
    },
  });
  await log(r.user.id, "create", { entity: "SquadQuest", entityId: quest.id, req });
  return ok({ quest });
}
