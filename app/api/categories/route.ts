import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { parseBody } from "@/lib/validate";
import { categorySchema } from "@/lib/schemas";
import { rateLimit, DEFAULT_MUTATION } from "@/lib/ratelimit";
import { log } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const items = await prisma.category.findMany({ where: { userId: r.user.id }, orderBy: { name: "asc" } });
  return ok(items);
}

export async function POST(req: NextRequest) {
  const rl = rateLimit(req, { key: "categories", ...DEFAULT_MUTATION });
  if (rl) return rl;
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const { data, error } = await parseBody(req, categorySchema);
  if (error) return error;
  try {
    const item = await prisma.category.create({
      data: { userId: r.user.id, name: data.name.trim(), color: data.color, icon: data.icon, kind: data.kind },
    });
    await log(r.user.id, "category.create", { entity: "category", entityId: item.id, meta: { name: data.name }, req });
    return ok(item);
  } catch {
    return bad("Category with that name already exists");
  }
}
