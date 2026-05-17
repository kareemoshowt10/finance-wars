import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireUser, clearSessionCookie } from "@/lib/auth";
import { bad, ok } from "@/lib/api";

export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (!user) return bad("Unauthorized", 401);
  const body = await req.json().catch(() => null);
  if (!body?.password) return bad("Password required");
  const valid = await bcrypt.compare(body.password, user.passwordHash);
  if (!valid) return bad("Incorrect password", 401);
  await prisma.user.delete({ where: { id: user.id } });
  await clearSessionCookie();
  return ok({ success: true });
}
