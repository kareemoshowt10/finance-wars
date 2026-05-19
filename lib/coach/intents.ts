export type IntentName =
  | "spend-by-category"
  | "goal-on-track"
  | "top-expenses"
  | "subscriptions"
  | "save-suggestion"
  | "status"
  | "unknown";

export type Intent = {
  name: IntentName;
  match: number; // 0-1 confidence
  slots: Record<string, string | undefined>;
};

const MONTH_NAMES = ["january","february","march","april","may","june","july","august","september","october","november","december"];

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "Food & Dining": ["food", "dining", "restaurant", "eat", "eating"],
  "Groceries": ["grocery", "groceries", "supermarket"],
  "Transport": ["transport", "uber", "lyft", "gas", "fuel", "transit"],
  "Shopping": ["shopping", "amazon", "clothes", "clothing"],
  "Entertainment": ["entertainment", "netflix", "movies", "games", "spotify"],
  "Bills & Utilities": ["bills", "utilities", "electric", "internet", "water"],
  "Housing": ["rent", "housing", "mortgage"],
  "Health": ["health", "doctor", "pharmacy", "medical"],
  "Travel": ["travel", "flight", "hotel", "vacation", "trip"],
  "Subscriptions": ["subscription", "subscriptions", "subs"],
  "Coffee": ["coffee", "starbucks", "espresso", "latte"],
};

export function matchIntent(raw: string): Intent {
  const text = (raw || "").toLowerCase().trim();
  if (!text) return { name: "unknown", match: 0, slots: {} };

  // status
  if (/\b(how am i|how'?s? it going|status|doing|overview|summary)\b/.test(text)) {
    return { name: "status", match: 0.9, slots: {} };
  }

  // subscriptions
  if (/\b(subscription|subscriptions|subs|recurring)\b/.test(text) && !/spend/.test(text)) {
    return { name: "subscriptions", match: 0.85, slots: {} };
  }

  // top expenses
  if (/\btop\b.*\b(expense|expenses|spending|spend|categor)/.test(text) || /\bbiggest\b.*\b(expense|spend)/.test(text)) {
    return { name: "top-expenses", match: 0.85, slots: {} };
  }

  // goal on track
  if (/\b(on track|going to (hit|reach)|will i (hit|reach)|track for)\b/.test(text) || /\bgoal\b/.test(text)) {
    const goalMatch = text.match(/(?:for|toward|reach|hit)\s+([a-z0-9 ]{2,40})$/);
    return { name: "goal-on-track", match: 0.8, slots: { goal: goalMatch?.[1]?.trim() } };
  }

  // spend by category (e.g., "what did I spend on food last month")
  if (/\bspend|spent|spending|cost\b/.test(text)) {
    // detect category
    let cat: string | undefined;
    for (const [name, kws] of Object.entries(CATEGORY_KEYWORDS)) {
      if (kws.some((k) => text.includes(k))) { cat = name; break; }
    }
    // detect timeframe
    let month: string | undefined;
    if (/last month/.test(text)) month = "last";
    else if (/this month/.test(text)) month = "this";
    else {
      for (const m of MONTH_NAMES) if (text.includes(m)) { month = m; break; }
    }
    if (cat || month || /spend|spent|spending/.test(text)) {
      return { name: "spend-by-category", match: 0.75, slots: { category: cat, month } };
    }
  }

  // save suggestion
  if (/\b(save|saving|how can i|advice|suggest|tip|tips)\b/.test(text)) {
    return { name: "save-suggestion", match: 0.7, slots: {} };
  }

  return { name: "unknown", match: 0, slots: {} };
}

export const DEFAULT_FOLLOW_UPS = [
  "How am I doing this month?",
  "What did I spend on food last month?",
  "What are my top expenses?",
  "Show me my subscriptions",
  "How can I save more?",
];
