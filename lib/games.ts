export type GameKind = "SAME_PAGE" | "BUDGET_BID" | "WORST_CASE";

export const SAME_PAGE_QUESTIONS: { id: string; question: string; choices: string[] }[] = [
  { id: "priority", question: "Top priority right now?", choices: ["Pay off debt", "Build emergency fund", "Travel & experiences", "Invest aggressively"] },
  { id: "windfall", question: "$5,000 windfall — what's the move?", choices: ["100% savings", "Split 50/50 save/spend", "Pay down debt", "Treat ourselves"] },
  { id: "risk", question: "Comfortable losing 30% in a market dip?", choices: ["Yes — stay invested", "Some — sell a little", "No — move to cash", "Depends on horizon"] },
  { id: "lifestyle", question: "Five-year lifestyle?", choices: ["Same city, bigger savings", "New city / house", "Travel year, scaled-back", "Career sprint, then breathe"] },
  { id: "kids", question: "Big spend decisions should be...", choices: ["Both must approve", "Anyone under threshold", "Owner of paycheck decides", "Talk weekly, decide together"] },
];

export const BUDGET_BID_CATEGORIES = ["Savings", "Travel", "Dining out", "Home upgrade", "Donations"] as const;
export type BudgetBidAnswer = Record<(typeof BUDGET_BID_CATEGORIES)[number], number>;

export const WORST_CASE_SCENARIOS: { id: string; label: string; question: string; choices: string[] }[] = [
  { id: "job-loss", label: "Job loss", question: "One income disappears tomorrow. First move?", choices: ["Cut subscriptions, pause investing", "Tap emergency fund only", "Sell investments", "Move in with family"] },
  { id: "medical", label: "Medical emergency", question: "$8,000 hospital bill arrives. How do you handle it?", choices: ["Pay from emergency fund", "Negotiate + payment plan", "0% APR card", "Pull from retirement"] },
  { id: "car", label: "Major car repair", question: "$3,000 to keep the only car running. Now what?", choices: ["Repair, drain savings", "Sell + use transit", "Finance a used car", "Borrow from family"] },
];

export function scoreSamePage(a: Record<string, string>, b: Record<string, string>) {
  const ids = SAME_PAGE_QUESTIONS.map((q) => q.id);
  let matches = 0;
  const breakdown: { id: string; matched: boolean; a: string; b: string }[] = [];
  for (const id of ids) {
    const matched = !!a[id] && a[id] === b[id];
    if (matched) matches++;
    breakdown.push({ id, matched, a: a[id] || "", b: b[id] || "" });
  }
  return { alignment: ids.length === 0 ? 0 : Math.round((matches / ids.length) * 100), matches, total: ids.length, breakdown };
}

export function normalizeBudgetBid(answer: Partial<BudgetBidAnswer>): BudgetBidAnswer {
  const out = {} as BudgetBidAnswer;
  let sum = 0;
  for (const c of BUDGET_BID_CATEGORIES) {
    const v = Math.max(0, Number(answer[c] || 0));
    out[c] = v;
    sum += v;
  }
  if (sum > 0 && sum !== 500) {
    for (const c of BUDGET_BID_CATEGORIES) out[c] = Math.round((out[c] / sum) * 500);
  }
  return out;
}

export function scoreBudgetBid(a: BudgetBidAnswer, b: BudgetBidAnswer) {
  const total = 500;
  let overlap = 0;
  const breakdown: { category: string; a: number; b: number; overlap: number }[] = [];
  for (const c of BUDGET_BID_CATEGORIES) {
    const o = Math.min(a[c] || 0, b[c] || 0);
    overlap += o;
    breakdown.push({ category: c, a: a[c] || 0, b: b[c] || 0, overlap: o });
  }
  return { overlap, alignment: Math.round((overlap / total) * 100), breakdown };
}

export function scoreWorstCase(a: Record<string, string>, b: Record<string, string>) {
  const ids = WORST_CASE_SCENARIOS.map((s) => s.id);
  let matches = 0;
  const breakdown = ids.map((id) => {
    const matched = !!a[id] && a[id] === b[id];
    if (matched) matches++;
    return { id, matched, a: a[id] || "", b: b[id] || "" };
  });
  return { alignment: ids.length === 0 ? 0 : Math.round((matches / ids.length) * 100), matches, total: ids.length, breakdown };
}
