import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { rateLimit } from "@/lib/ratelimit";
import { log } from "@/lib/audit";
import {
  parseQuickEntry, guessCategory, findPossibleDuplicate,
  maybeSuggestPattern, getCaptureAccount,
} from "@/lib/capture";
import { applyViceTaxOnTransaction } from "@/lib/viceTax";
import { checkDebtKO, recordDebtAttack } from "@/lib/debtBossHooks";
import { checkBudgetThresholds, checkLargeTransaction } from "@/lib/notifications";

export const dynamic = "force-dynamic";

const schema = z.object({
  text: z.string().min(1).max(300),
  kind: z.enum(["expense", "income"]),
  visibility: z.enum(["personal", "shared"]).optional(),
  category: z.string().max(80).optional(),   // explicit chip pick, skips the guess
  accountId: z.string().optional(),          // optional — defaults to Wallet
  date: z.string().datetime().optional(),
});

// The one endpoint the whole habit runs through. Capture is deliberately
// generous with rate limits relative to other mutations — logging three
// coffees and a paycheck in a minute is normal use, not abuse.
export async function POST(req: NextRequest) {
  const rl = rateLimit(req, { key: "capture", limit: 30, windowMs: 60_000 });
  if (rl) return rl;
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);

  const parsedBody = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsedBody.success) return bad("Invalid input", 400);
  const { text, kind, visibility, category: pickedCategory, accountId, date } = parsedBody.data;

  const parsed = parseQuickEntry(text);
  if ("error" in parsed) return bad(parsed.error, 400);
  const description = parsed.description || (kind === "income" ? "Income" : "Expense");

  // Category: explicit pick > personal override > dictionary > fallback.
  const guess = pickedCategory
    ? { category: pickedCategory, confidence: 1, via: "override" as const }
    : await guessCategory(r.user.id, description, kind);

  // Duplicate nudge — informational only, never blocks (spec).
  const dup = await findPossibleDuplicate(r.user.id, parsed.amount, kind);

  // Account: explicit > lazily-created Wallet.
  let account;
  if (accountId) {
    account = await prisma.account.findUnique({ where: { id: accountId } });
    if (!account || account.userId !== r.user.id) return bad("Invalid account", 400);
  } else {
    account = await getCaptureAccount(r.user.id);
  }

  const type = kind === "income" ? "income" : "expense";
  const tx = await prisma.transaction.create({
    data: {
      userId: r.user.id,
      accountId: account.id,
      amount: parsed.amount,
      type,
      category: guess.category,
      description,
      date: date ? new Date(date) : new Date(),
      rawDescription: text,
      categoryConfidence: guess.confidence,
      visibility: visibility ?? "personal",
      source: "quick_capture",
    },
  });

  const delta = type === "income" ? parsed.amount : -parsed.amount;
  await prisma.account.update({
    where: { id: account.id },
    data: { balance: { increment: delta } },
  });

  // Same downstream pipeline as manual entry — capture feeds everything.
  const { upsertTodaySnapshot } = await import("@/lib/snapshots");
  await upsertTodaySnapshot(r.user.id).catch(() => {});
  if (type === "expense") {
    await checkBudgetThresholds(r.user.id, guess.category).catch(() => {});
    await checkLargeTransaction(r.user.id, tx.id, tx.amount).catch(() => {});
    await applyViceTaxOnTransaction(r.user.id, {
      id: tx.id, amount: tx.amount, category: guess.category, type, date: tx.date,
    }).catch(() => {});
  }
  if (type === "income") {
    await recordDebtAttack(r.user.id, account.id).catch(() => {});
    await checkDebtKO(r.user.id, account.id).catch(() => {});
  }

  // Recurring pattern loop.
  const pattern = await maybeSuggestPattern(
    r.user.id, kind, description, parsed.amount, guess.category
  ).catch(() => ({ suggested: false as const }));

  await log(r.user.id, "capture.create", { entity: "transaction", entityId: tx.id, req });
  const { evaluate: evalAch } = await import("@/lib/achievements/engine");
  evalAch(r.user.id, { type: "tx-created" }).catch(() => {});

  return ok({
    transaction: {
      id: tx.id,
      amount: tx.amount,
      type: tx.type,
      category: tx.category,
      description: tx.description,
      date: tx.date.toISOString(),
      visibility: tx.visibility,
    },
    guess,
    possibleDuplicate: dup ? { id: dup.id, description: dup.description, minutesAgo: Math.round((Date.now() - dup.createdAt.getTime()) / 60_000) } : null,
    patternSuggested: pattern.suggested ? pattern.patternId : null,
  });
}
