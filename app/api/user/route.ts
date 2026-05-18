import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { parseBody } from "@/lib/validate";
import { userPatchSchema } from "@/lib/schemas";
import { rateLimit, DEFAULT_MUTATION } from "@/lib/ratelimit";
import { log } from "@/lib/audit";

export async function PATCH(req: NextRequest) {
  const rl = rateLimit(req, { key: "user:patch", ...DEFAULT_MUTATION });
  if (rl) return rl;
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const user = r.user;
  const { data, error } = await parseBody(req, userPatchSchema);
  if (error) return error;

  const patch: Record<string, unknown> = {};
  if (data.name !== undefined) patch.name = data.name.trim();
  if (data.currency !== undefined) patch.currency = data.currency.toUpperCase();
  if (data.theme !== undefined) patch.theme = data.theme;
  if (data.onboarded !== undefined) patch.onboarded = data.onboarded;

  if (data.email && data.email !== user.email) {
    if (!data.currentPassword) return bad("Current password required to change email");
    const valid = await bcrypt.compare(data.currentPassword, user.passwordHash);
    if (!valid) return bad("Current password is incorrect", 401);
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) return bad("Email already in use", 409);
    patch.email = data.email;
  }

  if (data.newPassword) {
    if (!data.currentPassword) return bad("Current password required");
    const valid = await bcrypt.compare(data.currentPassword, user.passwordHash);
    if (!valid) return bad("Current password is incorrect", 401);
    patch.passwordHash = await bcrypt.hash(data.newPassword, 10);
  }

  if (Object.keys(patch).length === 0) return bad("Nothing to update");

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: patch,
    select: { id: true, email: true, name: true, currency: true, theme: true, onboarded: true },
  });
  await log(user.id, "user.update", { entity: "user", entityId: user.id, meta: { fields: Object.keys(patch) }, req });
  return ok(updated);
}
