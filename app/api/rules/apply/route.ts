import { NextRequest } from "next/server";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { applyRulesToAll } from "@/lib/rules";
import { rateLimit, DEFAULT_MUTATION } from "@/lib/ratelimit";
import { log } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const rl = rateLimit(req, { key: "rules:apply", ...DEFAULT_MUTATION });
  if (rl) return rl;
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const body = await req.json().catch(() => ({}));
  const onlyUncategorized = !!body?.onlyUncategorized;
  const result = await applyRulesToAll(r.user.id, { onlyUncategorized });
  await log(r.user.id, "rules.apply", { entity: "rule", meta: result, req });
  return ok(result);
}
