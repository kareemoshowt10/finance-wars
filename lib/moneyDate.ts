import { prisma } from "./prisma";

export type AgendaItem = {
  kind: string;
  label: string;
  body: string;
  link?: string;
  suggestedAction?: string;
};

export type AgendaSection = {
  title: string;
  items: AgendaItem[];
};

export type Agenda = {
  summary: string;
  sections: AgendaSection[];
};

export type AgendaInputs = {
  topSpending: { category: string; current: number; prev: number }[];
  goalsProgress: { id: string; name: string; pctChange: number; currentAmount: number; targetAmount: number }[];
  pendingReviews: { id: string; amount: number; description: string; requesterName: string }[];
  missedSprintTargets: { duelTitle: string; weekNumber: number; target: number; actual: number }[];
  upcomingBills: { description: string; amount: number; date: Date }[];
  largeTxs: { description: string; amount: number; category: string }[];
  sprintResults: { duelTitle: string; weekNumber: number; winner: string }[];
};

export function composeAgenda(inputs: AgendaInputs): Agenda {
  const sections: AgendaSection[] = [];

  if (inputs.topSpending.length) {
    sections.push({
      title: "Spending",
      items: inputs.topSpending.slice(0, 3).map((t) => {
        const delta = t.prev > 0 ? Math.round(((t.current - t.prev) / t.prev) * 100) : 0;
        const dir = delta >= 0 ? "up" : "down";
        return {
          kind: "spending",
          label: t.category,
          body: `$${t.current.toFixed(0)} this period (${dir} ${Math.abs(delta)}% vs last)`,
          suggestedAction: delta > 25 ? "Adjust budget" : "Note",
        };
      }),
    });
  }
  if (inputs.goalsProgress.length) {
    sections.push({
      title: "Goals",
      items: inputs.goalsProgress.slice(0, 4).map((g) => ({
        kind: "goal",
        label: g.name,
        body: `${Math.round((g.currentAmount / g.targetAmount) * 100)}% of $${g.targetAmount.toFixed(0)} — ${g.pctChange >= 0 ? "+" : ""}${g.pctChange.toFixed(1)}% this period`,
        link: "/dashboard/goals",
        suggestedAction: "Approve",
      })),
    });
  }
  if (inputs.pendingReviews.length) {
    sections.push({
      title: "Purchases",
      items: inputs.pendingReviews.map((p) => ({
        kind: "purchase-review",
        label: p.description || "Pending purchase",
        body: `$${p.amount.toFixed(0)} from ${p.requesterName}`,
        link: `/dashboard/couples/purchase-reviews/${p.id}`,
        suggestedAction: "Approve",
      })),
    });
  }
  if (inputs.missedSprintTargets.length) {
    sections.push({
      title: "Sprints",
      items: inputs.missedSprintTargets.slice(0, 3).map((s) => ({
        kind: "sprint-missed",
        label: `${s.duelTitle} · Week ${s.weekNumber}`,
        body: `Hit $${s.actual.toFixed(0)} of $${s.target.toFixed(0)} target`,
        link: "/dashboard/duels",
        suggestedAction: "Adjust budget",
      })),
    });
  }
  if (inputs.upcomingBills.length) {
    sections.push({
      title: "Bills",
      items: inputs.upcomingBills.slice(0, 5).map((b) => ({
        kind: "bill",
        label: b.description,
        body: `$${b.amount.toFixed(0)} due ${b.date.toISOString().slice(0, 10)}`,
        link: "/dashboard/recurring",
        suggestedAction: "Note",
      })),
    });
  }
  if (inputs.largeTxs.length) {
    sections.push({
      title: "Large transactions",
      items: inputs.largeTxs.slice(0, 4).map((t) => ({
        kind: "large-tx",
        label: t.description,
        body: `$${t.amount.toFixed(0)} · ${t.category}`,
        link: "/dashboard/transactions",
        suggestedAction: "Note",
      })),
    });
  }
  if (inputs.sprintResults.length) {
    sections.push({
      title: "Sprint results",
      items: inputs.sprintResults.slice(0, 3).map((s) => ({
        kind: "sprint-result",
        label: `${s.duelTitle} · Week ${s.weekNumber}`,
        body: `Winner: ${s.winner}`,
        link: "/dashboard/duels",
      })),
    });
  }

  const counts = sections.reduce((s, sec) => s + sec.items.length, 0);
  const summary = counts === 0
    ? "Nothing pressing this week — a chance to talk dreams."
    : `${counts} item${counts === 1 ? "" : "s"} to discuss across ${sections.length} area${sections.length === 1 ? "" : "s"}.`;
  return { summary, sections };
}

export async function buildAgenda(householdId: string): Promise<Agenda> {
  const household = await prisma.household.findUnique({
    where: { id: householdId },
    include: { members: { where: { accepted: true, userId: { not: null } }, include: { user: true } } },
  });
  if (!household) return composeAgenda({ topSpending: [], goalsProgress: [], pendingReviews: [], missedSprintTargets: [], upcomingBills: [], largeTxs: [], sprintResults: [] });

  const memberIds = household.members.map((m) => m.userId!).filter(Boolean);
  const now = new Date();
  const periodStart = new Date(now.getTime() - 14 * 86400000);
  const prevStart = new Date(now.getTime() - 28 * 86400000);

  const txs = await prisma.transaction.findMany({
    where: { userId: { in: memberIds }, type: "expense", date: { gte: prevStart } },
  });
  const curr: Record<string, number> = {};
  const prev: Record<string, number> = {};
  for (const t of txs) {
    const map = t.date >= periodStart ? curr : prev;
    map[t.category] = (map[t.category] || 0) + t.amount;
  }
  const topSpending = Object.entries(curr)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([category, current]) => ({ category, current, prev: prev[category] || 0 }));

  const goals = await prisma.goal.findMany({ where: { userId: { in: memberIds } } });
  const goalContribs = await prisma.goalContribution.findMany({
    where: { userId: { in: memberIds }, date: { gte: periodStart } },
  });
  const contribsByGoal: Record<string, number> = {};
  for (const c of goalContribs) contribsByGoal[c.goalId] = (contribsByGoal[c.goalId] || 0) + c.amount;
  const goalsProgress = goals.map((g) => ({
    id: g.id,
    name: g.name,
    pctChange: g.currentAmount > 0 ? ((contribsByGoal[g.id] || 0) / g.currentAmount) * 100 : 0,
    currentAmount: g.currentAmount,
    targetAmount: g.targetAmount,
  })).filter((g) => g.pctChange !== 0).slice(0, 5);

  const pendingReviews = await prisma.purchaseReview.findMany({
    where: { householdId, status: "PENDING" },
    include: { requester: { select: { name: true } } },
  });
  const txMap = await prisma.transaction.findMany({
    where: { id: { in: pendingReviews.map((p) => p.transactionId) } },
    select: { id: true, description: true },
  });
  const txMapById = new Map(txMap.map((t) => [t.id, t.description]));

  const recurring = await prisma.recurringTransaction.findMany({
    where: { userId: { in: memberIds }, active: true, type: "expense", nextRunDate: { gte: now, lte: new Date(now.getTime() + 14 * 86400000) } },
  });

  const week = new Date(now.getTime() - 7 * 86400000);
  const allRecentTxs = await prisma.transaction.findMany({
    where: { userId: { in: memberIds }, type: "expense", date: { gte: week } },
    orderBy: { amount: "desc" },
    take: 10,
  });
  const avg = allRecentTxs.length ? allRecentTxs.reduce((s, t) => s + t.amount, 0) / allRecentTxs.length : 0;
  const largeTxs = allRecentTxs.filter((t) => t.amount > avg * 1.5).slice(0, 4);

  const duels = await prisma.duel.findMany({
    where: { players: { some: { userId: { in: memberIds } } }, status: "ACTIVE" },
    include: { sprints: { include: { targets: true, contributions: true }, orderBy: { weekNumber: "desc" }, take: 4 }, players: true },
  });
  const missedSprintTargets: AgendaInputs["missedSprintTargets"] = [];
  const sprintResults: AgendaInputs["sprintResults"] = [];
  for (const d of duels) {
    for (const s of d.sprints) {
      if (s.status === "CLOSED") {
        const winner = d.players.find((p) => p.id === s.winnerPlayerId);
        sprintResults.push({
          duelTitle: d.title,
          weekNumber: s.weekNumber,
          winner: winner ? `Side ${winner.side}` : "TBD",
        });
        for (const t of s.targets) {
          const actual = s.contributions.filter((c) => c.playerId === t.playerId).reduce((sum, c) => sum + c.amount, 0);
          if (actual < t.amount * 0.9) {
            missedSprintTargets.push({ duelTitle: d.title, weekNumber: s.weekNumber, target: t.amount, actual });
          }
        }
      }
    }
  }

  return composeAgenda({
    topSpending,
    goalsProgress,
    pendingReviews: pendingReviews.map((p) => ({
      id: p.id,
      amount: p.amount,
      description: txMapById.get(p.transactionId) || "Purchase",
      requesterName: p.requester.name,
    })),
    missedSprintTargets: missedSprintTargets.slice(0, 4),
    upcomingBills: recurring.map((r) => ({ description: r.description, amount: r.amount, date: r.nextRunDate })),
    largeTxs: largeTxs.map((t) => ({ description: t.description, amount: t.amount, category: t.category })),
    sprintResults: sprintResults.slice(0, 4),
  });
}
