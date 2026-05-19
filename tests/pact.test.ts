import { describe, it, expect, vi, beforeEach } from "vitest";

const pactFindUnique = vi.fn();
const sigFindMany = vi.fn();
const sigUpsert = vi.fn();
const householdUpdate = vi.fn();
const pactUpdate = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    pact: { findUnique: (...a: unknown[]) => pactFindUnique(...a), update: (...a: unknown[]) => pactUpdate(...a) },
    pactSignature: { findMany: (...a: unknown[]) => sigFindMany(...a), upsert: (...a: unknown[]) => sigUpsert(...a) },
    household: { update: (...a: unknown[]) => householdUpdate(...a) },
  },
}));

import { pactBothSigned, signPact, bumpPactVersion } from "@/lib/pact";

beforeEach(() => {
  pactFindUnique.mockReset();
  sigFindMany.mockReset();
  sigUpsert.mockReset();
  householdUpdate.mockReset();
  pactUpdate.mockReset();
});

describe("pact", () => {
  it("bothSigned false until both members sign current version", async () => {
    pactFindUnique.mockResolvedValue({
      id: "p1", householdId: "h1", version: 2,
      household: { members: [{ userId: "u1" }, { userId: "u2" }] },
    });
    sigFindMany.mockResolvedValue([{ userId: "u1", version: 2 }]);
    expect(await pactBothSigned("p1")).toBe(false);
  });

  it("bothSigned true when all members signed current version", async () => {
    pactFindUnique.mockResolvedValue({
      id: "p1", householdId: "h1", version: 1,
      household: { members: [{ userId: "u1" }, { userId: "u2" }] },
    });
    sigFindMany.mockResolvedValue([{ userId: "u1", version: 1 }, { userId: "u2", version: 1 }]);
    expect(await pactBothSigned("p1")).toBe(true);
  });

  it("signPact upserts current-version signature and reports both signed", async () => {
    pactFindUnique
      .mockResolvedValueOnce({ id: "p1", householdId: "h1", version: 1 })  // signPact call
      .mockResolvedValueOnce({
        id: "p1", householdId: "h1", version: 1,
        household: { members: [{ userId: "u1" }, { userId: "u2" }] },
      });
    sigUpsert.mockResolvedValue({});
    sigFindMany.mockResolvedValue([{ userId: "u1", version: 1 }, { userId: "u2", version: 1 }]);
    const r = await signPact("p1", "u2");
    expect(r.bothSigned).toBe(true);
    expect(r.version).toBe(1);
    expect(sigUpsert).toHaveBeenCalled();
    expect(householdUpdate).toHaveBeenCalled();
  });

  it("bumpPactVersion increments and clears household signedAt", async () => {
    pactFindUnique.mockResolvedValue({ id: "p1", householdId: "h1", version: 3 });
    await bumpPactVersion("p1");
    expect(pactUpdate).toHaveBeenCalledWith({ where: { id: "p1" }, data: { version: 4 } });
    expect(householdUpdate).toHaveBeenCalledWith({ where: { id: "h1" }, data: { pactSignedAt: null } });
  });
});
