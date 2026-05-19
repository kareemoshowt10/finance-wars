import { prisma } from "./prisma";

export type ShareLevel = "HIDDEN" | "BALANCE" | "FULL";

export type SharedAccount = {
  id: string;
  name: string;
  type: string;
  balance: number;
  ownerUserId: string;
  ownerName: string;
  level: ShareLevel;
  isSelf: boolean;
};

export type SharedTransaction = {
  id: string;
  accountId: string;
  amount: number;
  type: string;
  category: string;
  description: string;
  date: Date;
  ownerUserId: string;
  pending?: boolean;
};

export type SharedView = {
  members: { userId: string; name: string; email: string }[];
  accounts: SharedAccount[];
  transactions: SharedTransaction[];
  goals: { id: string; userId: string; name: string; targetAmount: number; currentAmount: number; deadline: Date }[];
  netWorth: number;
  monthIncome: number;
  monthSpend: number;
  savingsRate: number;
  pendingReviewsCount: number;
};

export async function getSharedView(viewerUserId: string, householdId: string): Promise<SharedView> {
  const members = await prisma.householdMember.findMany({
    where: { householdId, accepted: true, userId: { not: null } },
    include: { user: { select: { id: true, email: true, name: true } } },
  });
  const memberUserIds = members.map((m) => m.userId!).filter(Boolean);

  const accounts = await prisma.account.findMany({
    where: { userId: { in: memberUserIds } },
  });
  const shares = await prisma.accountShare.findMany({ where: { householdId } });
  const shareByAcct = new Map(shares.map((s) => [s.accountId, s.level as ShareLevel]));

  const visibleAccts: SharedAccount[] = [];
  for (const a of accounts) {
    const isSelf = a.userId === viewerUserId;
    const level: ShareLevel = isSelf ? "FULL" : (shareByAcct.get(a.id) ?? "HIDDEN");
    if (level === "HIDDEN") continue;
    const owner = members.find((m) => m.userId === a.userId);
    visibleAccts.push({
      id: a.id,
      name: a.name,
      type: a.type,
      balance: a.balance,
      ownerUserId: a.userId,
      ownerName: owner?.user?.name || "",
      level,
      isSelf,
    });
  }

  const fullAcctIds = visibleAccts.filter((a) => a.level === "FULL").map((a) => a.id);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const transactions = fullAcctIds.length
    ? await prisma.transaction.findMany({
        where: { accountId: { in: fullAcctIds } },
        orderBy: { date: "desc" },
        take: 200,
      })
    : [];

  const monthTxs = fullAcctIds.length
    ? await prisma.transaction.findMany({
        where: { accountId: { in: fullAcctIds }, date: { gte: monthStart, lt: monthEnd } },
      })
    : [];
  const monthIncome = monthTxs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const monthSpend = monthTxs.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const savingsRate = monthIncome > 0 ? Math.round(((monthIncome - monthSpend) / monthIncome) * 100) : 0;

  const goals = await prisma.goal.findMany({ where: { userId: { in: memberUserIds } } });

  const pendingReviewsCount = await prisma.purchaseReview.count({
    where: { householdId, status: "PENDING" },
  });

  const netWorth = visibleAccts.reduce((s, a) => {
    return s + (a.type === "credit" ? -a.balance : a.balance);
  }, 0);

  return {
    members: members.map((m) => ({
      userId: m.userId!,
      name: m.user?.name || "",
      email: m.user?.email || "",
    })),
    accounts: visibleAccts,
    transactions: transactions.map((t) => ({
      id: t.id,
      accountId: t.accountId,
      amount: t.amount,
      type: t.type,
      category: t.category,
      description: t.description,
      date: t.date,
      ownerUserId: t.userId,
      pending: t.pending,
    })),
    goals: goals.map((g) => ({
      id: g.id,
      userId: g.userId,
      name: g.name,
      targetAmount: g.targetAmount,
      currentAmount: g.currentAmount,
      deadline: g.deadline,
    })),
    netWorth,
    monthIncome,
    monthSpend,
    savingsRate,
    pendingReviewsCount,
  };
}
