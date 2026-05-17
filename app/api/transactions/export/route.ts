import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function GET() {
  const user = await requireUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const tx = await prisma.transaction.findMany({
    where: { userId: user.id },
    orderBy: { date: "desc" },
    include: { account: { select: { name: true } } },
  });
  const header = ["date", "amount", "type", "category", "description", "account"];
  const rows = tx.map((t) => [
    t.date.toISOString().slice(0, 10),
    String(t.amount),
    t.type,
    t.category,
    `"${(t.description || "").replace(/"/g, '""')}"`,
    `"${(t.account?.name || "").replace(/"/g, '""')}"`,
  ].join(","));
  const csv = [header.join(","), ...rows].join("\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="transactions.csv"`,
    },
  });
}
