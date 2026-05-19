import { prisma } from "./prisma";
import { evaluate } from "./achievements/engine";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Returns updated streak. Idempotent for same calendar day. */
export async function touchLoginStreak(userId: string): Promise<number> {
  try {
    const u = await prisma.user.findUnique({
      where: { id: userId },
      select: { currentLoginStreak: true, longestLoginStreak: true, lastLoginAt: true },
    });
    if (!u) return 0;
    const today = startOfDay(new Date());
    const last = u.lastLoginAt ? startOfDay(u.lastLoginAt) : null;
    let streak = u.currentLoginStreak || 0;
    if (last && last.getTime() === today.getTime()) {
      // same day; just refresh lastLoginAt
      await prisma.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
      return streak;
    }
    if (last) {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      if (last.getTime() === yesterday.getTime()) {
        streak = streak + 1;
      } else {
        streak = 1;
      }
    } else {
      streak = 1;
    }
    const longest = Math.max(u.longestLoginStreak || 0, streak);
    await prisma.user.update({
      where: { id: userId },
      data: { currentLoginStreak: streak, longestLoginStreak: longest, lastLoginAt: new Date() },
    });
    evaluate(userId, { type: "login-streak", streak }).catch(() => {});
    return streak;
  } catch {
    return 0;
  }
}
