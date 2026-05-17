import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";

export async function GET() {
  const user = await requireUser();
  if (!user) return bad("Unauthorized", 401);
  const items = await prisma.category.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } });
  return ok(items);
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (!user) return bad("Unauthorized", 401);
  const body = await req.json().catch(() => null);
  if (!body) return bad("Invalid JSON");
  const { name, color, icon, kind } = body;
  if (!name || !color || !icon || !kind) return bad("All fields required");
  if (kind !== "INCOME" && kind !== "EXPENSE") return bad("Invalid kind");
  try {
    const item = await prisma.category.create({
      data: { userId: user.id, name: String(name).trim(), color, icon, kind },
    });
    return ok(item);
  } catch {
    return bad("Category with that name already exists");
  }
}
