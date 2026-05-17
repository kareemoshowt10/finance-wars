import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (!user) return bad("Unauthorized", 401);
  const existing = await prisma.category.findUnique({ where: { id: params.id } });
  if (!existing || existing.userId !== user.id) return bad("Not found", 404);
  const body = await req.json().catch(() => null);
  if (!body) return bad("Invalid JSON");
  const data: Record<string, unknown> = {};
  if (body.name) data.name = String(body.name).trim();
  if (body.color) data.color = body.color;
  if (body.icon) data.icon = body.icon;
  if (body.kind === "INCOME" || body.kind === "EXPENSE") data.kind = body.kind;
  try {
    const updated = await prisma.category.update({ where: { id: params.id }, data });
    return ok(updated);
  } catch {
    return bad("Update failed");
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (!user) return bad("Unauthorized", 401);
  const existing = await prisma.category.findUnique({ where: { id: params.id } });
  if (!existing || existing.userId !== user.id) return bad("Not found", 404);
  await prisma.category.delete({ where: { id: params.id } });
  return ok({ success: true });
}
