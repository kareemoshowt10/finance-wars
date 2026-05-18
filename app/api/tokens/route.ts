import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveRequestUser, generateApiToken, hashApiToken } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { parseBody } from "@/lib/validate";
import { apiTokenSchema } from "@/lib/schemas";
import { rateLimit, DEFAULT_MUTATION } from "@/lib/ratelimit";
import { log } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const items = await prisma.apiToken.findMany({
    where: { userId: r.user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, lastUsedAt: true, createdAt: true, revokedAt: true },
  });
  return ok(items);
}

export async function POST(req: NextRequest) {
  const rl = rateLimit(req, { key: "tokens", ...DEFAULT_MUTATION });
  if (rl) return rl;
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const { data, error } = await parseBody(req, apiTokenSchema);
  if (error) return error;
  const plaintext = generateApiToken();
  const tokenHash = hashApiToken(plaintext);
  const token = await prisma.apiToken.create({
    data: { userId: r.user.id, name: data.name, tokenHash },
    select: { id: true, name: true, createdAt: true },
  });
  await log(r.user.id, "token.create", { entity: "apiToken", entityId: token.id, meta: { name: data.name }, req });
  return ok({ ...token, token: plaintext });
}
