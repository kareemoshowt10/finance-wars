import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function GET() {
  const user = await requireUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const [accounts, transactions, budgets, goals, recurring, categories, snapshots] = await Promise.all([
    prisma.account.findMany({ where: { userId: user.id } }),
    prisma.transaction.findMany({ where: { userId: user.id } }),
    prisma.budget.findMany({ where: { userId: user.id } }),
    prisma.goal.findMany({ where: { userId: user.id } }),
    prisma.recurringTransaction.findMany({ where: { userId: user.id } }),
    prisma.category.findMany({ where: { userId: user.id } }),
    prisma.netWorthSnapshot.findMany({ where: { userId: user.id } }),
  ]);
  const data = {
    user: { email: user.email, name: user.name, currency: user.currency, createdAt: user.createdAt },
    accounts, transactions, budgets, goals, recurring, categories, snapshots,
  };
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="debt-sucker-export.json"`,
    },
  });
}
