import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { parseBody } from "@/lib/validate";
import { accountSchema } from "@/lib/schemas";
import { rateLimit, DEFAULT_MUTATION } from "@/lib/ratelimit";
import { log } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const accounts = await prisma.account.findMany({
    where: { userId: r.user.id },
    orderBy: { createdAt: "asc" },
  });
  return ok(accounts);
}

export async function POST(req: NextRequest) {
  const rl = rateLimit(req, { key: "accounts", ...DEFAULT_MUTATION });
  if (rl) return rl;
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const { data, error } = await parseBody(req, accountSchema);
  if (error) return error;
  const account = await prisma.account.create({
    data: {
      userId: r.user.id,
      name: data.name,
      type: data.type,
      balance: data.balance ?? 0,
      interestRate: data.interestRate ?? null,
    },
  });
  const { upsertTodaySnapshot } = await import("@/lib/snapshots");
  await upsertTodaySnapshot(r.user.id);
  await log(r.user.id, "account.create", { entity: "account", entityId: account.id, meta: { name: data.name }, req });
  const { evaluate: evalAch } = await import("@/lib/achievements/engine");
  evalAch(r.user.id, { type: "account-created" }).catch(() => {});
  return ok(account);
}
