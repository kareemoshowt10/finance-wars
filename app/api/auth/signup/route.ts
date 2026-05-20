import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken, setSessionCookie } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { seedDefaultCategories } from "@/lib/defaults";
import { parseBody } from "@/lib/validate";
import { signupSchema } from "@/lib/schemas";
import { rateLimit } from "@/lib/ratelimit";
import { log } from "@/lib/audit";
import { recordReferralOnSignup } from "@/lib/referrals";

export async function POST(req: NextRequest) {
  const rl = rateLimit(req, { key: "auth/signup", limit: 3, windowMs: 60_000 });
  if (rl) return rl;
  const { data, error } = await parseBody(req, signupSchema);
  if (error) return error;

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) return bad("An account with this email already exists", 409);

  const passwordHash = await bcrypt.hash(data.password, 10);
  const user = await prisma.user.create({
    data: { email: data.email, passwordHash, name: data.name },
  });

  await seedDefaultCategories(user.id);
  if (data.referralCode) {
    await recordReferralOnSignup(user.id, data.referralCode).catch(() => {});
  }
  const token = await signToken({ uid: user.id, email: user.email });
  await setSessionCookie(token);
  await log(user.id, "auth.signup", { entity: "user", entityId: user.id, req });
  return ok({ id: user.id, email: user.email, name: user.name });
}
