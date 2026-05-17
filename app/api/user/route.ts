import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";

export async function PATCH(req: NextRequest) {
  const user = await requireUser();
  if (!user) return bad("Unauthorized", 401);
  const body = await req.json().catch(() => null);
  if (!body) return bad("Invalid JSON");

  const data: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
  if (typeof body.currency === "string" && body.currency.trim()) data.currency = body.currency.trim().toUpperCase();

  if (body.newPassword) {
    if (!body.currentPassword) return bad("Current password required");
    const valid = await bcrypt.compare(body.currentPassword, user.passwordHash);
    if (!valid) return bad("Current password is incorrect", 401);
    if (String(body.newPassword).length < 6) return bad("New password must be at least 6 characters");
    data.passwordHash = await bcrypt.hash(body.newPassword, 10);
  }

  if (Object.keys(data).length === 0) return bad("Nothing to update");

  const updated = await prisma.user.update({
    where: { id: user.id },
    data,
    select: { id: true, email: true, name: true, currency: true },
  });
  return ok(updated);
}
