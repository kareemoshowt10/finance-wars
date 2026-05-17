import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (!user) return bad("Unauthorized", 401);
  const existing = await prisma.transaction.findUnique({ where: { id: params.id } });
  if (!existing || existing.userId !== user.id) return bad("Not found", 404);
  const body = await req.json().catch(() => null);
  if (!body) return bad("Invalid JSON");

  // reverse previous balance impact
  const prevDelta = existing.type === "income" ? existing.amount : -existing.amount;
  await prisma.account.update({
    where: { id: existing.accountId },
    data: { balance: { increment: -prevDelta } },
  });

  const data: Record<string, unknown> = {};
  if (typeof body.accountId === "string") data.accountId = body.accountId;
  if (body.amount !== undefined) data.amount = Math.abs(Number(body.amount));
  if (body.type === "income" || body.type === "expense") data.type = body.type;
  if (typeof body.category === "string") data.category = body.category;
  if (typeof body.description === "string") data.description = body.description;
  if (body.date) data.date = new Date(body.date);

  const updated = await prisma.transaction.update({ where: { id: params.id }, data });

  // apply new balance impact
  const newDelta = updated.type === "income" ? updated.amount : -updated.amount;
  await prisma.account.update({
    where: { id: updated.accountId },
    data: { balance: { increment: newDelta } },
  });

  return ok(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (!user) return bad("Unauthorized", 401);
  const existing = await prisma.transaction.findUnique({ where: { id: params.id } });
  if (!existing || existing.userId !== user.id) return bad("Not found", 404);
  const delta = existing.type === "income" ? existing.amount : -existing.amount;
  await prisma.account.update({
    where: { id: existing.accountId },
    data: { balance: { increment: -delta } },
  });
  await prisma.transaction.delete({ where: { id: params.id } });
  return ok({ success: true });
}
