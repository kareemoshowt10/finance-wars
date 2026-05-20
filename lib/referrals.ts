import { prisma } from "./prisma";
import { award, REWARDS } from "./wallet";

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function gen(len = 6): string {
  let out = "";
  for (let i = 0; i < len; i++) out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return out;
}

export async function ensureReferralCode(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { referralCode: true } });
  if (user?.referralCode) return user.referralCode;
  for (let i = 0; i < 5; i++) {
    const code = gen(6);
    const exists = await prisma.user.findFirst({ where: { referralCode: code } });
    if (!exists) {
      await prisma.user.update({ where: { id: userId }, data: { referralCode: code } });
      return code;
    }
  }
  throw new Error("Could not generate unique referral code");
}

export async function recordReferralOnSignup(newUserId: string, code: string) {
  const referrer = await prisma.user.findFirst({ where: { referralCode: code.toUpperCase() } });
  if (!referrer || referrer.id === newUserId) return null;
  const existing = await prisma.referral.findUnique({ where: { referredId: newUserId } });
  if (existing) return existing;
  const ref = await prisma.referral.create({
    data: {
      referrerId: referrer.id,
      referredId: newUserId,
      code: code.toUpperCase(),
      status: "CONVERTED",
      convertedAt: new Date(),
    },
  });
  await award({
    userId: referrer.id,
    currency: "SC",
    delta: REWARDS.REFERRAL,
    reason: "REFERRAL",
    refType: "Referral",
    refId: ref.id,
    fromUserId: newUserId,
  });
  // Give the new user a smaller welcome bonus.
  await award({
    userId: newUserId,
    currency: "SC",
    delta: 25,
    reason: "REFERRAL",
    refType: "Referral",
    refId: ref.id,
    fromUserId: referrer.id,
  });
  return ref;
}

export async function getReferralStats(userId: string) {
  const [code, count, recent] = await Promise.all([
    ensureReferralCode(userId),
    prisma.referral.count({ where: { referrerId: userId, status: "CONVERTED" } }),
    prisma.referral.findMany({
      where: { referrerId: userId },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { referred: { select: { name: true } } },
    }),
  ]);
  return {
    code,
    count,
    recent: recent.map((r) => ({ id: r.id, name: r.referred?.name ?? "Pending", status: r.status, createdAt: r.createdAt })),
  };
}
