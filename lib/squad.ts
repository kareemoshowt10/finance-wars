import { prisma } from "./prisma";
import { award } from "./wallet";

export function generateInviteCode(len = 8): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

export type QuestProgress = {
  total: number;
  target: number;
  pct: number;
  perUser: { userId: string; name: string; amount: number; pct: number }[];
  leader: { userId: string; amount: number } | null;
};

export function computeQuestProgress(
  target: number,
  contributions: { userId: string; amount: number; user?: { name: string | null } | null }[],
  members: { userId: string; user?: { name: string | null } | null }[]
): QuestProgress {
  const byUser = new Map<string, { name: string; amount: number }>();
  for (const m of members) byUser.set(m.userId, { name: m.user?.name || "Member", amount: 0 });
  for (const c of contributions) {
    const entry = byUser.get(c.userId) ?? { name: c.user?.name || "Member", amount: 0 };
    entry.amount += c.amount;
    byUser.set(c.userId, entry);
  }
  const total = Array.from(byUser.values()).reduce((s, v) => s + v.amount, 0);
  const perUser = Array.from(byUser.entries()).map(([userId, v]) => ({
    userId,
    name: v.name,
    amount: v.amount,
    pct: target > 0 ? Math.min(100, (v.amount / target) * 100) : 0,
  })).sort((a, b) => b.amount - a.amount);
  const leader = perUser[0] && perUser[0].amount > 0 ? { userId: perUser[0].userId, amount: perUser[0].amount } : null;
  return {
    total,
    target,
    pct: target > 0 ? Math.min(100, (total / target) * 100) : 0,
    perUser,
    leader,
  };
}

export function isQuestComplete(mode: string, progress: QuestProgress): boolean {
  if (mode === "RACE") {
    return progress.perUser.some((u) => u.amount >= progress.target);
  }
  return progress.total >= progress.target;
}

export async function maybeCompleteQuest(questId: string) {
  const quest = await prisma.squadQuest.findUnique({
    where: { id: questId },
    include: {
      contributions: { include: { user: { select: { name: true } } } },
      squad: { include: { members: { include: { user: { select: { name: true } } } } } },
    },
  });
  if (!quest || quest.status !== "ACTIVE") return null;
  const progress = computeQuestProgress(quest.targetAmount, quest.contributions, quest.squad.members);
  if (!isQuestComplete(quest.mode, progress)) return null;

  await prisma.squadQuest.update({
    where: { id: questId },
    data: { status: "COMPLETED", completedAt: new Date() },
  });

  // Reward SC. RACE: winner takes 100, others 25 for participating.
  // COOP: every contributor gets 50.
  if (quest.mode === "RACE") {
    const winner = progress.perUser.find((u) => u.amount >= quest.targetAmount);
    for (const member of progress.perUser) {
      if (member.amount <= 0) continue;
      await award({
        userId: member.userId,
        currency: "SC",
        delta: member.userId === winner?.userId ? 100 : 25,
        reason: "GOAL_MILESTONE",
        refType: "SquadQuest",
        refId: quest.id,
        meta: { mode: "RACE", placement: member.userId === winner?.userId ? "winner" : "participant" },
      });
    }
  } else {
    for (const member of progress.perUser) {
      if (member.amount <= 0) continue;
      await award({
        userId: member.userId,
        currency: "SC",
        delta: 50,
        reason: "GOAL_MILESTONE",
        refType: "SquadQuest",
        refId: quest.id,
        meta: { mode: "COOP" },
      });
    }
  }
  return { completed: true, progress };
}
