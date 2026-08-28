// Debt Sucker billing: the plan catalog.
//
// Tier names, prices, and member limits are carried over unchanged from the
// original Chore Wars plan model (Free / Rhythm $1mo / Household HQ $20mo).
// What each tier *unlocks* is re-mapped onto what actually shipped: chores,
// The Bank, and Household Goals, instead of Chore Wars' bounty board / cash
// box / provider operations.
//
// Kept framework/DB-free (pure data + pure functions) so it's trivial to
// unit test and to import from both server routes and client components.

export type PlanId = "free" | "rhythm" | "household_hq";

export type PlanFeature =
  | "unlimited_chores"
  | "full_history"
  | "unlimited_loans"
  | "loan_interest"
  | "extra_goals"
  | "unlimited_goals"
  | "multi_household";

export type Plan = {
  id: PlanId;
  name: string;
  tag: string;
  priceLabel: string;
  priceMonthly: number; // dollars/month, 0 for Free
  accent: string;
  description: string;
  features: string[]; // marketing copy, in order, for the pricing table
  included: PlanFeature[];
  memberLimit: number;
  /** null = unlimited */
  choreLimit: number | null;
  activeLoanLimit: number | null;
  activeGoalLimit: number | null;
};

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    tag: "Start small",
    priceLabel: "$0",
    priceMonthly: 0,
    accent: "#697386",
    description: "A simple shared board for building one household's rhythm.",
    features: [
      "Up to 4 household members",
      "Up to 5 active chores",
      "7-day chore leaderboard",
      "1 active family loan (no interest)",
      "1 active household goal",
    ],
    included: [],
    memberLimit: 4,
    choreLimit: 5,
    activeLoanLimit: 1,
    activeGoalLimit: 1,
  },
  {
    id: "rhythm",
    name: "Rhythm",
    tag: "Most practical",
    priceLabel: "$1 / month",
    priceMonthly: 1,
    accent: "#6C5CE7",
    description: "For households that want the full chore board and a real bank.",
    features: [
      "Everything in Free",
      "Unlimited chores",
      "Full chore history (month & all-time leaderboards)",
      "Unlimited active family loans",
      "Up to 3 active household goals",
      "Up to 12 household members",
    ],
    included: ["unlimited_chores", "full_history", "unlimited_loans", "extra_goals"],
    memberLimit: 12,
    choreLimit: null,
    activeLoanLimit: null,
    activeGoalLimit: 3,
  },
  {
    id: "household_hq",
    name: "Household HQ",
    tag: "For household leads",
    priceLabel: "$20 / month",
    priceMonthly: 20,
    accent: "#F6B84A",
    description: "For households running it like a real household — interest, every goal, every member.",
    features: [
      "Everything in Rhythm",
      "Unlimited household goals",
      "Loans can carry real interest (The Bank, for real)",
      "Run multiple households (in-laws, a rental, a second home)",
      "Up to 30 household members",
    ],
    included: ["unlimited_chores", "full_history", "unlimited_loans", "loan_interest", "extra_goals", "unlimited_goals", "multi_household"],
    memberLimit: 30,
    choreLimit: null,
    activeLoanLimit: null,
    activeGoalLimit: null,
  },
];

const PLANS_BY_ID: Record<PlanId, Plan> = {
  free: PLANS[0],
  rhythm: PLANS[1],
  household_hq: PLANS[2],
};

/** Unknown/legacy plan ids (e.g. a household created before billing existed) fall back to Free. */
export function planById(planId: string): Plan {
  return PLANS_BY_ID[planId as PlanId] ?? PLANS_BY_ID.free;
}

export function planIncludes(planId: string, feature: PlanFeature): boolean {
  return planById(planId).included.includes(feature);
}

export function planMemberLimit(planId: string): number {
  return planById(planId).memberLimit;
}

/** true if `count` more would fit under the plan's limit for that resource. null limit = unlimited. */
export function withinLimit(limit: number | null, currentCount: number): boolean {
  if (limit === null) return true;
  return currentCount < limit;
}

export function rank(planId: string): number {
  return PLANS.findIndex((p) => p.id === planById(planId).id);
}

/** Is `planId` at least as good as `minPlanId`? (household_hq > rhythm > free) */
export function meetsOrExceeds(planId: string, minPlanId: PlanId): boolean {
  return rank(planId) >= rank(minPlanId);
}

export const NEXT_PLAN: Record<PlanId, PlanId | null> = {
  free: "rhythm",
  rhythm: "household_hq",
  household_hq: null,
};
