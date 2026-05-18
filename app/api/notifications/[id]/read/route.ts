import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const existing = await prisma.notification.findUnique({ where: { id: params.id } });
  if (!existing || existing.userId !== r.user.id) return bad("Not found", 404);
  const updated = await prisma.notification.update({
    where: { id: params.id },
    data: { readAt: existing.readAt ?? new Date() },
  });
  return ok(updated);
}
