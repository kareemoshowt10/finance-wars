import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken, setSessionCookie } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { parseBody } from "@/lib/validate";
import { loginSchema } from "@/lib/schemas";
import { rateLimit } from "@/lib/ratelimit";
import { log } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const rl = rateLimit(req, { key: "auth/login", limit: 5, windowMs: 60_000 });
  if (rl) return rl;
  const { data, error } = await parseBody(req, loginSchema);
  if (error) return error;

  const user = await prisma.user.findUnique({ where: { email: data.email } });
  if (!user || !user.passwordHash) return bad("Invalid email or password", 401);

  const valid = await bcrypt.compare(data.password, user.passwordHash);
  if (!valid) return bad("Invalid email or password", 401);

  const token = await signToken({ uid: user.id, email: user.email });
  await setSessionCookie(token);
  await log(user.id, "auth.login", { entity: "user", entityId: user.id, req });
  const { touchLoginStreak } = await import("@/lib/streak");
  await touchLoginStreak(user.id);
  return ok({ id: user.id, email: user.email, name: user.name });
}
