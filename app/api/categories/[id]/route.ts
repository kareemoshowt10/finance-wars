import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { parseBody } from "@/lib/validate";
import { categoryPatchSchema } from "@/lib/schemas";
import { rateLimit, DEFAULT_MUTATION } from "@/lib/ratelimit";
import { log } from "@/lib/audit";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const rl = rateLimit(req, { key: "cat:patch", ...DEFAULT_MUTATION });
  if (rl) return rl;
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const existing = await prisma.category.findUnique({ where: { id: params.id } });
  if (!existing || existing.userId !== r.user.id) return bad("Not found", 404);
  const { data, error } = await parseBody(req, categoryPatchSchema);
  if (error) return error;
  try {
    const updated = await prisma.category.update({ where: { id: params.id }, data });
    await log(r.user.id, "category.update", { entity: "category", entityId: updated.id, meta: data, req });
    return ok(updated);
  } catch {
    return bad("Update failed");
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const rl = rateLimit(req, { key: "cat:del", ...DEFAULT_MUTATION });
  if (rl) return rl;
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const existing = await prisma.category.findUnique({ where: { id: params.id } });
  if (!existing || existing.userId !== r.user.id) return bad("Not found", 404);
  await prisma.category.delete({ where: { id: params.id } });
  await log(r.user.id, "category.delete", { entity: "category", entityId: params.id, req });
  return ok({ success: true });
}
