import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { log } from "@/lib/audit";

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const existing = await prisma.apiToken.findUnique({ where: { id: params.id } });
  if (!existing || existing.userId !== r.user.id) return bad("Not found", 404);
  await prisma.apiToken.update({
    where: { id: params.id },
    data: { revokedAt: new Date() },
  });
  await log(r.user.id, "token.revoke", { entity: "apiToken", entityId: params.id, req });
  return ok({ success: true });
}
