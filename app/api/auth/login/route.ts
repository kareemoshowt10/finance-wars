import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken, setSessionCookie } from "@/lib/auth";
import { bad, ok } from "@/lib/api";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return bad("Invalid JSON");
  const { email, password } = body as { email?: string; password?: string };
  if (!email || !password) return bad("Email and password required");

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) return bad("Invalid email or password", 401);

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return bad("Invalid email or password", 401);

  const token = await signToken({ uid: user.id, email: user.email });
  await setSessionCookie(token);
  return ok({ id: user.id, email: user.email, name: user.name });
}
