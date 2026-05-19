import { prisma } from "./prisma";

export async function pactBothSigned(pactId: string): Promise<boolean> {
  const pact = await prisma.pact.findUnique({
    where: { id: pactId },
    include: { household: { include: { members: { where: { accepted: true, userId: { not: null } } } } } },
  });
  if (!pact) return false;
  const sigs = await prisma.pactSignature.findMany({
    where: { pactId, version: pact.version },
  });
  const signerIds = new Set(sigs.map((s) => s.userId));
  const memberIds = pact.household.members.map((m) => m.userId!).filter(Boolean);
  if (memberIds.length < 2) return false;
  return memberIds.every((id) => signerIds.has(id));
}

export async function signPact(pactId: string, userId: string): Promise<{ bothSigned: boolean; version: number }> {
  const pact = await prisma.pact.findUnique({ where: { id: pactId } });
  if (!pact) throw new Error("Pact not found");
  await prisma.pactSignature.upsert({
    where: { pactId_userId_version: { pactId, userId, version: pact.version } },
    update: { signedAt: new Date() },
    create: { pactId, userId, version: pact.version },
  });
  const bothSigned = await pactBothSigned(pactId);
  if (bothSigned) {
    await prisma.household.update({
      where: { id: pact.householdId },
      data: { pactSignedAt: new Date() },
    });
  }
  return { bothSigned, version: pact.version };
}

export async function bumpPactVersion(pactId: string) {
  const pact = await prisma.pact.findUnique({ where: { id: pactId } });
  if (!pact) return;
  await prisma.pact.update({
    where: { id: pactId },
    data: { version: pact.version + 1 },
  });
  await prisma.household.update({
    where: { id: pact.householdId },
    data: { pactSignedAt: null },
  });
}
