import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { ACCOUNT_TYPES } from "@/lib/utils";

export async function GET() {
  const user = await requireUser();
  if (!user) return bad("Unauthorized", 401);
  const accounts = await prisma.account.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
  });
  return ok(accounts);
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (!user) return bad("Unauthorized", 401);
  const body = await req.json().catch(() => null);
  if (!body) return bad("Invalid JSON");
  const { name, type, balance } = body as { name?: string; type?: string; balance?: number };
  if (!name || !type) return bad("Name and type are required");
  if (!ACCOUNT_TYPES.includes(type as never)) return bad("Invalid account type");
  const account = await prisma.account.create({
    data: { userId: user.id, name, type, balance: Number(balance) || 0 },
  });
  const { upsertTodaySnapshot } = await import("@/lib/snapshots");
  await upsertTodaySnapshot(user.id);
  return ok(account);
}
