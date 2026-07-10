import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { rateLimit, DEFAULT_MUTATION } from "@/lib/ratelimit";
import { getCaptureAccount } from "@/lib/capture";
import { applyViceTaxOnTransaction } from "@/lib/viceTax";
import { checkDebtKO, recordDebtAttack } from "@/lib/debtBossHooks";
import { checkBudgetThresholds } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const patterns = await prisma.capturePattern.findMany({
    where: { userId: r.user.id },
    orderBy: [{ confirmed: "desc" }, { lastUsedAt: "desc" }],
    take: 20,
  });
  return ok({
    confirmed: patterns.filter((p) => p.confirmed),
    suggested: patterns.filter((p) => !p.confirmed),
  });
}

const actionSchema = z.object({
  id: z.string().min(1),
  action: z.enum(["confirm", "dismiss", "use"]),
});

// confirm — accept a suggested pattern ("Is this your regular paycheck?")
// dismiss — delete the suggestion
// use     — one-tap log: creates a transaction from the pattern instantly
export async function POST(req: NextRequest) {
  const rl = rateLimit(req, { key: "capture:patterns", ...DEFAULT_MUTATION });
  if (rl) return rl;
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);

  const parsed = actionSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return bad("Invalid input", 400);

  const pattern = await prisma.capturePattern.findUnique({ where: { id: parsed.data.id } });
  if (!pattern || pattern.userId !== r.user.id) return bad("Not found", 404);

  if (parsed.data.action === "dismiss") {
    await prisma.capturePattern.delete({ where: { id: pattern.id } });
    return ok({ dismissed: true });
  }

  if (parsed.data.action === "confirm") {
    const updated = await prisma.capturePattern.update({
      where: { id: pattern.id },
      data: { confirmed: true },
    });
    return ok({ pattern: updated });
  }

  // use — the one-tap payday/grocery-run log.
  const account = await getCaptureAccount(r.user.id);
  const type = pattern.kind === "income" ? "income" : "expense";
  const tx = await prisma.transaction.create({
    data: {
      userId: r.user.id,
      accountId: account.id,
      amount: pattern.amount,
      type,
      category: pattern.category,
      description: pattern.description,
      date: new Date(),
      rawDescription: pattern.description,
      categoryConfidence: 1,
      source: "quick_capture",
    },
  });
  await prisma.account.update({
    where: { id: account.id },
    data: { balance: { increment: type === "income" ? pattern.amount : -pattern.amount } },
  });
  await prisma.capturePattern.update({
    where: { id: pattern.id },
    data: { timesUsed: { increment: 1 }, lastUsedAt: new Date(), confirmed: true },
  });

  const { upsertTodaySnapshot } = await import("@/lib/snapshots");
  await upsertTodaySnapshot(r.user.id).catch(() => {});
  if (type === "expense") {
    await checkBudgetThresholds(r.user.id, pattern.category).catch(() => {});
    await applyViceTaxOnTransaction(r.user.id, {
      id: tx.id, amount: tx.amount, category: pattern.category, type, date: tx.date,
    }).catch(() => {});
  } else {
    await recordDebtAttack(r.user.id, account.id).catch(() => {});
    await checkDebtKO(r.user.id, account.id).catch(() => {});
  }

  return ok({ transaction: { id: tx.id, amount: tx.amount, description: tx.description, category: tx.category } });
}
