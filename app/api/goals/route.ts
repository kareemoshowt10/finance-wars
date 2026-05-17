import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";

export async function GET() {
  const user = await requireUser();
  if (!user) return bad("Unauthorized", 401);
  const goals = await prisma.goal.findMany({
    where: { userId: user.id },
    orderBy: { deadline: "asc" },
  });
  return ok(goals);
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (!user) return bad("Unauthorized", 401);
  const body = await req.json().catch(() => null);
  if (!body) return bad("Invalid JSON");
  const { name, targetAmount, currentAmount, deadline } = body as {
    name?: string; targetAmount?: number; currentAmount?: number; deadline?: string;
  };
  if (!name || targetAmount === undefined || !deadline) return bad("Name, target, and deadline required");
  const goal = await prisma.goal.create({
    data: {
      userId: user.id,
      name,
      targetAmount: Number(targetAmount),
      currentAmount: Number(currentAmount) || 0,
      deadline: new Date(deadline),
    },
  });
  return ok(goal);
}
