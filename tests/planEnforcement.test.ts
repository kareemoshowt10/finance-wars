import { describe, it, expect, vi, beforeEach } from "vitest";

const householdFindUnique = vi.fn();
const choreCount = vi.fn();
const loanCount = vi.fn();
const goalCount = vi.fn();
const memberCount = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    household: { findUnique: (...a: unknown[]) => householdFindUnique(...a) },
    chore: { count: (...a: unknown[]) => choreCount(...a) },
    loan: { count: (...a: unknown[]) => loanCount(...a) },
    householdGoal: { count: (...a: unknown[]) => goalCount(...a) },
    householdMember: { count: (...a: unknown[]) => memberCount(...a) },
  },
}));

import { assertWithinLimit, assertMemberLimit, assertInterestAllowed } from "@/lib/planEnforcement";

beforeEach(() => {
  householdFindUnique.mockReset();
  choreCount.mockReset();
  loanCount.mockReset();
  goalCount.mockReset();
  memberCount.mockReset();
});

async function bodyOf(res: Response | null) {
  if (!res) return null;
  return res.json();
}

describe("planEnforcement", () => {
  describe("assertWithinLimit", () => {
    it("allows creating a chore under the Free plan's limit", async () => {
      householdFindUnique.mockResolvedValue({ plan: "free" });
      choreCount.mockResolvedValue(4); // limit is 5
      const res = await assertWithinLimit("hh1", "chores");
      expect(res).toBeNull();
    });

    it("blocks with a 402 + upgrade payload once the Free chore limit is hit", async () => {
      householdFindUnique.mockResolvedValue({ plan: "free" });
      choreCount.mockResolvedValue(5); // at the limit of 5
      const res = await assertWithinLimit("hh1", "chores");
      expect(res).not.toBeNull();
      expect(res!.status).toBe(402);
      const body = await bodyOf(res);
      expect(body).toMatchObject({ upgrade: true, planId: "free" });
    });

    it("never blocks on Household HQ (unlimited chores/loans/goals)", async () => {
      householdFindUnique.mockResolvedValue({ plan: "household_hq" });
      choreCount.mockResolvedValue(999);
      loanCount.mockResolvedValue(999);
      goalCount.mockResolvedValue(999);
      expect(await assertWithinLimit("hh1", "chores")).toBeNull();
      expect(await assertWithinLimit("hh1", "loans")).toBeNull();
      expect(await assertWithinLimit("hh1", "goals")).toBeNull();
    });

    it("Rhythm allows up to 3 active goals but not a 4th", async () => {
      householdFindUnique.mockResolvedValue({ plan: "rhythm" });
      goalCount.mockResolvedValue(3);
      const res = await assertWithinLimit("hh1", "goals");
      expect(res!.status).toBe(402);
    });

    it("treats a household with no plan set (legacy row) as Free", async () => {
      householdFindUnique.mockResolvedValue(null);
      choreCount.mockResolvedValue(5);
      const res = await assertWithinLimit("hh1", "chores");
      expect(res!.status).toBe(402);
      const body = await bodyOf(res);
      expect(body.planId).toBe("free");
    });
  });

  describe("assertMemberLimit", () => {
    it("counts pending invites toward the limit, not just accepted members", async () => {
      householdFindUnique.mockResolvedValue({ plan: "free" }); // limit 4
      memberCount.mockResolvedValueOnce(3); // accepted
      memberCount.mockResolvedValueOnce(1); // pending
      const res = await assertMemberLimit("hh1");
      expect(res!.status).toBe(402);
    });

    it("allows an invite that keeps the household under its seat limit", async () => {
      householdFindUnique.mockResolvedValue({ plan: "rhythm" }); // limit 12
      memberCount.mockResolvedValueOnce(2);
      memberCount.mockResolvedValueOnce(0);
      const res = await assertMemberLimit("hh1");
      expect(res).toBeNull();
    });
  });

  describe("assertInterestAllowed", () => {
    it("blocks interest on Free and Rhythm", async () => {
      householdFindUnique.mockResolvedValue({ plan: "free" });
      expect((await assertInterestAllowed("hh1"))!.status).toBe(402);

      householdFindUnique.mockResolvedValue({ plan: "rhythm" });
      expect((await assertInterestAllowed("hh1"))!.status).toBe(402);
    });

    it("allows interest on Household HQ", async () => {
      householdFindUnique.mockResolvedValue({ plan: "household_hq" });
      expect(await assertInterestAllowed("hh1")).toBeNull();
    });
  });
});
