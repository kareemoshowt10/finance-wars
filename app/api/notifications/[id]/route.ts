import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const existing = await prisma.notification.findUnique({ where: { id: params.id } });
  if (!existing || existing.userId !== r.user.id) return bad("Not found", 404);
  await prisma.notification.delete({ where: { id: params.id } });
  return ok({ success: true });
}
