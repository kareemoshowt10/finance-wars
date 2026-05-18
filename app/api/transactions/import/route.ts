import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { applyRules } from "@/lib/rules";

type Row = {
  date?: string; amount?: string; type?: string;
  category?: string; description?: string; account?: string;
};

export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (!user) return bad("Unauthorized", 401);
  const body = await req.json().catch(() => null);
  if (!body || !Array.isArray(body.rows)) return bad("rows[] required");
  const createMissing = !!body.createMissingAccounts;
  const rows = body.rows as Row[];

  const accounts = await prisma.account.findMany({ where: { userId: user.id } });
  const acctMap = new Map(accounts.map((a) => [a.name.toLowerCase(), a]));

  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const r of rows) {
    try {
      const amt = Number(r.amount);
      if (!r.date || isNaN(amt) || amt <= 0) throw new Error("Invalid row");
      const type = (r.type || "").toLowerCase();
      if (type !== "income" && type !== "expense") throw new Error("Invalid type");
      const accountName = (r.account || "").trim();
      if (!accountName) throw new Error("Missing account");
      let acct = acctMap.get(accountName.toLowerCase());
      if (!acct) {
        if (!createMissing) throw new Error(`Account "${accountName}" not found`);
        acct = await prisma.account.create({
          data: { userId: user.id, name: accountName, type: "checking", balance: 0 },
        });
        acctMap.set(accountName.toLowerCase(), acct);
      }
      const desc = r.description || r.category || "Imported";
      let category = r.category || "Other";
      const ruleMatch = await applyRules(user.id, { description: desc, accountId: acct.id });
      if (ruleMatch) category = ruleMatch.category;
      await prisma.transaction.create({
        data: {
          userId: user.id,
          accountId: acct.id,
          amount: amt,
          type,
          category,
          description: desc,
          date: new Date(r.date),
        },
      });
      const delta = type === "income" ? amt : -amt;
      await prisma.account.update({ where: { id: acct.id }, data: { balance: { increment: delta } } });
      success++;
    } catch (e) {
      failed++;
      errors.push(e instanceof Error ? e.message : "Failed");
    }
  }

  const { upsertTodaySnapshot } = await import("@/lib/snapshots");
  await upsertTodaySnapshot(user.id);

  return ok({ success, failed, errors: errors.slice(0, 5) });
}
