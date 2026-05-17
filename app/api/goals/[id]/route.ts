import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (!user) return bad("Unauthorized", 401);
  const existing = await prisma.goal.findUnique({ where: { id: params.id } });
  if (!existing || existing.userId !== user.id) return bad("Not found", 404);
  const body = await req.json().catch(() => null);
  if (!body) return bad("Invalid JSON");
  const data: Record<string, unknown> = {};
  if (typeof body.name === "string") data.name = body.name;
  if (body.targetAmount !== undefined) data.targetAmount = Number(body.targetAmount);
  if (body.currentAmount !== undefined) data.currentAmount = Number(body.currentAmount);
  if (body.deadline) data.deadline = new Date(body.deadline);
  const goal = await prisma.goal.update({ where: { id: params.id }, data });
  return ok(goal);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (!user) return bad("Unauthorized", 401);
  const existing = await prisma.goal.findUnique({ where: { id: params.id } });
  if (!existing || existing.userId !== user.id) return bad("Not found", 404);
  await prisma.goal.delete({ where: { id: params.id } });
  return ok({ success: true });
}
