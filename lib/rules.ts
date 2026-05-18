import { prisma } from "./prisma";

export type RuleMatch = { category: string; tag?: string | null; ruleId: string };

export async function applyRules(
  userId: string,
  tx: { description: string; accountId?: string | null }
): Promise<RuleMatch | null> {
  const rules = await prisma.rule.findMany({
    where: { userId, active: true },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
  });
  const desc = (tx.description || "").toLowerCase();
  for (const r of rules) {
    if (r.accountId && tx.accountId && r.accountId !== tx.accountId) continue;
    if (!r.pattern) continue;
    if (desc.includes(r.pattern.toLowerCase())) {
      return { category: r.categoryOut, tag: r.autoTag, ruleId: r.id };
    }
  }
  return null;
}

export async function applyRulesToAll(
  userId: string,
  opts: { onlyUncategorized?: boolean } = {}
): Promise<{ updated: number; total: number }> {
  const where: Record<string, unknown> = { userId };
  if (opts.onlyUncategorized) where.category = { in: ["", "Other", "Uncategorized"] };
  const txs = await prisma.transaction.findMany({ where });
  let updated = 0;
  for (const t of txs) {
    const m = await applyRules(userId, { description: t.description, accountId: t.accountId });
    if (m && m.category !== t.category) {
      await prisma.transaction.update({ where: { id: t.id }, data: { category: m.category } });
      updated++;
    }
  }
  return { updated, total: txs.length };
}
