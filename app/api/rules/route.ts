import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { parseBody } from "@/lib/validate";
import { ruleSchema } from "@/lib/schemas";
import { rateLimit, DEFAULT_MUTATION } from "@/lib/ratelimit";
import { log } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const rules = await prisma.rule.findMany({
    where: { userId: r.user.id },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
  });
  return ok(rules);
}

export async function POST(req: NextRequest) {
  const rl = rateLimit(req, { key: "rules", ...DEFAULT_MUTATION });
  if (rl) return rl;
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const { data, error } = await parseBody(req, ruleSchema);
  if (error) return error;
  if (data.accountId) {
    const acct = await prisma.account.findUnique({ where: { id: data.accountId } });
    if (!acct || acct.userId !== r.user.id) return bad("Invalid account");
  }
  const rule = await prisma.rule.create({
    data: {
      userId: r.user.id,
      name: data.name,
      pattern: data.pattern,
      accountId: data.accountId ?? null,
      categoryOut: data.categoryOut,
      autoTag: data.autoTag ?? null,
      priority: data.priority ?? 0,
      active: data.active ?? true,
    },
  });
  await log(r.user.id, "rule.create", { entity: "rule", entityId: rule.id, req });
  const { evaluate: evalAch } = await import("@/lib/achievements/engine");
  evalAch(r.user.id, { type: "rule-created" }).catch(() => {});
  return ok(rule);
}
