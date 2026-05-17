import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken, setSessionCookie } from "@/lib/auth";
import { bad, ok } from "@/lib/api";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return bad("Invalid JSON");
  const { email, password, name } = body as { email?: string; password?: string; name?: string };

  if (!email || !password || !name) return bad("Email, password, and name are required");
  if (password.length < 6) return bad("Password must be at least 6 characters");
  if (!/^\S+@\S+\.\S+$/.test(email)) return bad("Invalid email");

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) return bad("An account with this email already exists", 409);

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email: email.toLowerCase(), passwordHash, name },
  });

  const token = await signToken({ uid: user.id, email: user.email });
  await setSessionCookie(token);
  return ok({ id: user.id, email: user.email, name: user.name });
}
