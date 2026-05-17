import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { ACCOUNT_TYPES } from "@/lib/utils";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (!user) return bad("Unauthorized", 401);
  const existing = await prisma.account.findUnique({ where: { id: params.id } });
  if (!existing || existing.userId !== user.id) return bad("Not found", 404);
  const body = await req.json().catch(() => null);
  if (!body) return bad("Invalid JSON");
  const data: Record<string, unknown> = {};
  if (typeof body.name === "string") data.name = body.name;
  if (typeof body.type === "string") {
    if (!ACCOUNT_TYPES.includes(body.type)) return bad("Invalid type");
    data.type = body.type;
  }
  if (body.balance !== undefined) data.balance = Number(body.balance);
  const account = await prisma.account.update({ where: { id: params.id }, data });
  return ok(account);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (!user) return bad("Unauthorized", 401);
  const existing = await prisma.account.findUnique({ where: { id: params.id } });
  if (!existing || existing.userId !== user.id) return bad("Not found", 404);
  await prisma.account.delete({ where: { id: params.id } });
  return ok({ success: true });
}
