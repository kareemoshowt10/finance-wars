import { prisma } from "@/lib/prisma";

export async function getDuelForUser(duelId: string, userId: string) {
  const duel = await prisma.duel.findUnique({
    where: { id: duelId },
    include: { players: true },
  });
  if (!duel) return { duel: null, player: null, opponent: null };
  const player = duel.players.find((p) => p.userId === userId) ?? null;
  const opponent = duel.players.find((p) => !player || p.id !== player.id) ?? null;
  return { duel, player, opponent };
}
