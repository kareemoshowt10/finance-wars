import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";

export async function GET(req: NextRequest) {
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const items = await prisma.auditLog.findMany({
    where: { userId: r.user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return ok(items);
}
