import { prisma } from "../prisma";
import { ACHIEVEMENTS, ACHIEVEMENTS_BY_SLUG } from "./catalog";

export type AchievementEvent =
  | { type: "signup" }
  | { type: "tx-created" }
  | { type: "budget-created" }
  | { type: "budget-month-under" }
  | { type: "goal-created" }
  | { type: "goal-reached" }
  | { type: "account-created" }
  | { type: "csv-import" }
  | { type: "rule-created" }
  | { type: "recurring-created" }
  | { type: "api-token-created" }
  | { type: "cron-subscribed" }
  | { type: "duel-created" }
  | { type: "duel-invited" }
  | { type: "duel-won" }
  | { type: "sprint-won" }
  | { type: "practice-won" }
  | { type: "login-streak"; streak: number }
  | { type: "visit-insights" }
  | { type: "visit-coach" }
  | { type: "visit-scenarios" }
  | { type: "savings-rate"; rate: number }
  | { type: "net-worth-snapshot"; netWorth: number }
  | { type: "portfolio-value"; value: number };

async function unlock(userId: string, slug: string) {
  const def = ACHIEVEMENTS_BY_SLUG[slug];
  if (!def) return false;
  try {
    await prisma.userAchievement.create({
      data: { userId, achievementSlug: slug, completed: true, progress: 1 },
    });
    await prisma.user.update({ where: { id: userId }, data: { xp: { increment: def.xp } } });
    try {
      await prisma.notification.create({
        data: {
          userId,
          kind: "INSIGHT",
          title: `Achievement unlocked: ${def.name}`,
          body: `${def.description} +${def.xp} XP`,
          link: "/dashboard/achievements",
          key: `ach:${slug}`,
        },
      });
    } catch {}
    return true;
  } catch {
    return false;
  }
}

async function alreadyHas(userId: string, slug: string) {
  const found = await prisma.userAchievement.findUnique({
    where: { userId_achievementSlug: { userId, achievementSlug: slug } },
  });
  return !!found?.completed;
}

export async function evaluate(userId: string, event: AchievementEvent) {
  try {
    switch (event.type) {
      case "signup":
        // nothing automatic; reserved
        break;
      case "account-created": {
        if (!(await alreadyHas(userId, "first-account"))) await unlock(userId, "first-account");
        const types = await prisma.account.findMany({ where: { userId }, select: { type: true } });
        const unique = new Set(types.map((t) => t.type));
        if (unique.size >= 4 && !(await alreadyHas(userId, "diversified"))) await unlock(userId, "diversified");
        break;
      }
      case "tx-created": {
        const count = await prisma.transaction.count({ where: { userId } });
        if (count >= 1 && !(await alreadyHas(userId, "first-transaction"))) await unlock(userId, "first-transaction");
        if (count >= 10 && !(await alreadyHas(userId, "ten-tx"))) await unlock(userId, "ten-tx");
        if (count >= 100 && !(await alreadyHas(userId, "hundred-tx"))) await unlock(userId, "hundred-tx");
        break;
      }
      case "budget-created":
        if (!(await alreadyHas(userId, "first-budget"))) await unlock(userId, "first-budget");
        break;
      case "budget-month-under":
        if (!(await alreadyHas(userId, "under-budget-month"))) await unlock(userId, "under-budget-month");
        break;
      case "goal-created":
        if (!(await alreadyHas(userId, "first-goal"))) await unlock(userId, "first-goal");
        break;
      case "goal-reached":
        if (!(await alreadyHas(userId, "first-goal-reached"))) await unlock(userId, "first-goal-reached");
        break;
      case "csv-import":
        if (!(await alreadyHas(userId, "first-csv-import"))) await unlock(userId, "first-csv-import");
        break;
      case "rule-created":
        if (!(await alreadyHas(userId, "first-rule"))) await unlock(userId, "first-rule");
        break;
      case "recurring-created":
        if (!(await alreadyHas(userId, "first-recurring"))) await unlock(userId, "first-recurring");
        break;
      case "api-token-created":
        if (!(await alreadyHas(userId, "api-token"))) await unlock(userId, "api-token");
        break;
      case "cron-subscribed":
        if (!(await alreadyHas(userId, "cron-subscribed"))) await unlock(userId, "cron-subscribed");
        break;
      case "duel-created":
        if (!(await alreadyHas(userId, "first-duel"))) await unlock(userId, "first-duel");
        break;
      case "duel-invited":
        if (!(await alreadyHas(userId, "invited-friend"))) await unlock(userId, "invited-friend");
        break;
      case "duel-won":
        if (!(await alreadyHas(userId, "first-duel-won"))) await unlock(userId, "first-duel-won");
        break;
      case "sprint-won":
        if (!(await alreadyHas(userId, "first-sprint-won"))) await unlock(userId, "first-sprint-won");
        break;
      case "practice-won":
        if (!(await alreadyHas(userId, "sparring-won"))) await unlock(userId, "sparring-won");
        break;
      case "login-streak":
        if (event.streak >= 7 && !(await alreadyHas(userId, "streak-7"))) await unlock(userId, "streak-7");
        if (event.streak >= 30 && !(await alreadyHas(userId, "streak-30"))) await unlock(userId, "streak-30");
        break;
      case "visit-insights":
        if (!(await alreadyHas(userId, "used-insights"))) await unlock(userId, "used-insights");
        break;
      case "visit-coach":
        if (!(await alreadyHas(userId, "used-coach"))) await unlock(userId, "used-coach");
        break;
      case "visit-scenarios":
        if (!(await alreadyHas(userId, "used-scenarios"))) await unlock(userId, "used-scenarios");
        break;
      case "savings-rate":
        if (event.rate >= 0.2 && !(await alreadyHas(userId, "savings-rate-20"))) await unlock(userId, "savings-rate-20");
        if (event.rate >= 0.3 && !(await alreadyHas(userId, "savings-rate-30"))) await unlock(userId, "savings-rate-30");
        break;
      case "net-worth-snapshot":
        if (event.netWorth >= 10_000 && !(await alreadyHas(userId, "net-worth-10k"))) await unlock(userId, "net-worth-10k");
        if (event.netWorth >= 50_000 && !(await alreadyHas(userId, "net-worth-50k"))) await unlock(userId, "net-worth-50k");
        if (event.netWorth >= 100_000 && !(await alreadyHas(userId, "net-worth-100k"))) await unlock(userId, "net-worth-100k");
        break;
      case "portfolio-value":
        if (event.value >= 10_000 && !(await alreadyHas(userId, "stock-portfolio-10k"))) await unlock(userId, "stock-portfolio-10k");
        break;
    }
  } catch {
    // swallow - never block primary action
  }
}

export async function getProgressFor(userId: string) {
  const [unlocked, txCount, accountTypes, user] = await Promise.all([
    prisma.userAchievement.findMany({ where: { userId } }),
    prisma.transaction.count({ where: { userId } }),
    prisma.account.findMany({ where: { userId }, select: { type: true } }),
    prisma.user.findUnique({ where: { id: userId } }),
  ]);
  const map = new Map(unlocked.map((u) => [u.achievementSlug, u]));
  const uniqueTypes = new Set(accountTypes.map((a) => a.type)).size;
  const streak = user?.currentLoginStreak || 0;

  function p(slug: string, current: number, target: number, label?: string) {
    return {
      progress: Math.min(1, current / Math.max(1, target)),
      progressLabel: label || `${current}/${target}`,
    };
  }

  return ACHIEVEMENTS.map((a) => {
    const u = map.get(a.slug);
    let progress = u?.completed ? 1 : 0;
    let progressLabel: string | undefined;
    if (!u?.completed) {
      switch (a.slug) {
        case "ten-tx": ({ progress, progressLabel } = p(a.slug, Math.min(txCount, 10), 10)); break;
        case "hundred-tx": ({ progress, progressLabel } = p(a.slug, Math.min(txCount, 100), 100)); break;
        case "diversified": ({ progress, progressLabel } = p(a.slug, Math.min(uniqueTypes, 4), 4)); break;
        case "streak-7": ({ progress, progressLabel } = p(a.slug, Math.min(streak, 7), 7)); break;
        case "streak-30": ({ progress, progressLabel } = p(a.slug, Math.min(streak, 30), 30)); break;
      }
    }
    return {
      ...a,
      unlocked: !!u?.completed,
      unlockedAt: u?.unlockedAt ?? null,
      progress,
      progressLabel,
    };
  });
}
