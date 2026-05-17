import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (!user) return bad("Unauthorized", 401);
  const existing = await prisma.budget.findUnique({ where: { id: params.id } });
  if (!existing || existing.userId !== user.id) return bad("Not found", 404);
  const body = await req.json().catch(() => null);
  if (!body) return bad("Invalid JSON");
  const data: Record<string, unknown> = {};
  if (typeof body.category === "string") data.category = body.category;
  if (body.limit !== undefined) data.limit = Number(body.limit);
  if (typeof body.month === "string") data.month = body.month;
  const budget = await prisma.budget.update({ where: { id: params.id }, data });
  return ok(budget);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (!user) return bad("Unauthorized", 401);
  const existing = await prisma.budget.findUnique({ where: { id: params.id } });
  if (!existing || existing.userId !== user.id) return bad("Not found", 404);
  await prisma.budget.delete({ where: { id: params.id } });
  return ok({ success: true });
}
