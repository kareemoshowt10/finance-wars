import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { resolveRequestUser, clearSessionCookie } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { log } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const body = await req.json().catch(() => null);
  if (r.user.passwordHash) {
    if (!body?.password) return bad("Password required");
    const valid = await bcrypt.compare(body.password, r.user.passwordHash);
    if (!valid) return bad("Incorrect password", 401);
  }
  await log(r.user.id, "user.delete", { entity: "user", entityId: r.user.id, req });
  await prisma.user.delete({ where: { id: r.user.id } });
  await clearSessionCookie();
  return ok({ success: true });
}
