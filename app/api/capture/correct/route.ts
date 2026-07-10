import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { rateLimit, DEFAULT_MUTATION } from "@/lib/ratelimit";
import { recordCorrection } from "@/lib/capture";
import { reverseViceTaxForTransaction, applyViceTaxOnTransaction } from "@/lib/viceTax";

export const dynamic = "force-dynamic";

const schema = z.object({
  transactionId: z.string().min(1),
  category: z.string().min(1).max(80),
});

// The correction loop: fixing a guess re-categorizes the transaction AND
// teaches the user's personal override memory, so accuracy climbs fast in
// the first few weeks (spec goal: <20% corrections by week three).
export async function POST(req: NextRequest) {
  const rl = rateLimit(req, { key: "capture:correct", ...DEFAULT_MUTATION });
  if (rl) return rl;
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return bad("Invalid input", 400);

  const tx = await prisma.transaction.findUnique({ where: { id: parsed.data.transactionId } });
  if (!tx || tx.userId !== r.user.id) return bad("Not found", 404);
  if (tx.category === parsed.data.category) return ok({ updated: false });

  const updated = await prisma.transaction.update({
    where: { id: tx.id },
    data: { category: parsed.data.category, categoryConfidence: 1 },
  });

  // Teach the override memory from the raw entry text when available.
  const kind = tx.type === "income" ? "income" : "expense";
  await recordCorrection(
    r.user.id,
    tx.rawDescription ?? tx.description,
    kind,
    parsed.data.category
  ).catch(() => {});

  // Keep vice tax consistent with the new category.
  if (tx.type === "expense") {
    await reverseViceTaxForTransaction(r.user.id, tx.id).catch(() => {});
    await applyViceTaxOnTransaction(r.user.id, {
      id: updated.id, amount: updated.amount, category: updated.category,
      type: updated.type, date: updated.date,
    }).catch(() => {});
  }

  return ok({ updated: true, category: updated.category });
}
