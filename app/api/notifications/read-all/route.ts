import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";

export async function POST(req: NextRequest) {
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const now = new Date();
  const res = await prisma.notification.updateMany({
    where: { userId: r.user.id, readAt: null },
    data: { readAt: now },
  });
  return ok({ count: res.count });
}
