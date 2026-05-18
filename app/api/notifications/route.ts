import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";

export async function GET(req: NextRequest) {
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const { searchParams } = new URL(req.url);
  const kind = searchParams.get("kind");
  const limit = Math.min(200, Math.max(1, Number(searchParams.get("limit") || 50)));
  const where: Record<string, unknown> = { userId: r.user.id };
  if (kind) where.kind = kind;
  const items = await prisma.notification.findMany({
    where,
    orderBy: [{ readAt: "asc" }, { createdAt: "desc" }],
    take: limit,
  });
  const unread = await prisma.notification.count({
    where: { userId: r.user.id, readAt: null },
  });
  return ok({ items, unread });
}
