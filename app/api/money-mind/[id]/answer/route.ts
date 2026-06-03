import { NextRequest } from "next/server";
import { z } from "zod";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { rateLimit, DEFAULT_MUTATION } from "@/lib/ratelimit";
import { isMember, getOtherMember } from "@/lib/household";
import { CORE_PROMPT_IDS } from "@/lib/moneyMind";
import { notify } from "@/lib/notifications";

export const dynamic = "force-dynamic";

const answerSchema = z.object({
  answers: z.record(
    z.string(),
    z.object({
      value: z.coerce.number().int().min(1).max(7),
      note: z.string().max(500).optional(),
    })
  ),
  submit: z.boolean().optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rl = rateLimit(req, { key: "money-mind:answer", ...DEFAULT_MUTATION });
  if (rl) return rl;
  const { id } = await params;
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);

  const round = await prisma.moneyMindRound.findUnique({ where: { id } });
  if (!round) return bad("Not found", 404);
  if (!(await isMember(r.user.id, round.householdId))) return bad("Not found", 404);
  if (round.status !== "OPEN") return bad("This round is already revealed", 409);

  const parsed = answerSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return bad("Invalid input", 400);

  // Only accept known prompt ids.
  const clean: Record<string, { value: number; note?: string }> = {};
  for (const [k, v] of Object.entries(parsed.data.answers)) {
    if (CORE_PROMPT_IDS.includes(k)) clean[k] = v;
  }

  const submit = !!parsed.data.submit;
  if (submit && Object.keys(clean).length < CORE_PROMPT_IDS.length) {
    return bad("Answer every prompt before submitting", 400);
  }

  await prisma.moneyMindResponse.upsert({
    where: { roundId_userId: { roundId: id, userId: r.user.id } },
    update: { answers: clean, submitted: submit },
    create: { roundId: id, userId: r.user.id, answers: clean, submitted: submit },
  });

  if (submit) {
    const other = await getOtherMember(round.householdId, r.user.id);
    if (other?.userId) {
      const otherResp = await prisma.moneyMindResponse.findUnique({
        where: { roundId_userId: { roundId: id, userId: other.userId } },
      });
      // Nudge partner: either to start, or that both are ready to reveal.
      if (otherResp?.submitted) {
        await notify(
          other.userId,
          "INSIGHT",
          "Money Mind: both of you are ready",
          "You've both answered. Reveal your results together.",
          "/dashboard/couples/money-mind",
          `moneymind:ready:${id}`
        ).catch(() => {});
      } else {
        await notify(
          other.userId,
          "INSIGHT",
          "Money Mind: your partner answered",
          "Your turn — answer privately, then reveal together.",
          "/dashboard/couples/money-mind",
          `moneymind:yourturn:${id}:${r.user.id}`
        ).catch(() => {});
      }
    }
  }

  return ok({ submitted: submit });
}
