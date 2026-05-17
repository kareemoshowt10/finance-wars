import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (!user) return bad("Unauthorized", 401);
  const existing = await prisma.recurringTransaction.findUnique({ where: { id: params.id } });
  if (!existing || existing.userId !== user.id) return bad("Not found", 404);
  const body = await req.json().catch(() => null);
  if (!body) return bad("Invalid JSON");
  const data: Record<string, unknown> = {};
  if (body.accountId) data.accountId = body.accountId;
  if (body.amount !== undefined) data.amount = Math.abs(Number(body.amount));
  if (body.type) data.type = body.type;
  if (body.category) data.category = body.category;
  if (body.description !== undefined) data.description = body.description;
  if (body.frequency) data.frequency = body.frequency;
  if (body.nextRunDate) data.nextRunDate = new Date(body.nextRunDate);
  if (typeof body.active === "boolean") data.active = body.active;
  const updated = await prisma.recurringTransaction.update({ where: { id: params.id }, data });
  return ok(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (!user) return bad("Unauthorized", 401);
  const existing = await prisma.recurringTransaction.findUnique({ where: { id: params.id } });
  if (!existing || existing.userId !== user.id) return bad("Not found", 404);
  await prisma.recurringTransaction.delete({ where: { id: params.id } });
  return ok({ success: true });
}
