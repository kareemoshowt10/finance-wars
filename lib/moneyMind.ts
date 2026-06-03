import { prisma } from "./prisma";

// Money Mind is a couples alignment game grounded in the recurring research
// finding that most money conflict is not about math — it's about undisclosed
// values, fears, and assumptions. Partners answer the SAME prompts privately,
// then reveal together. The design deliberately lowers the social cost of
// admitting things (stress, ambition, resentment, fear) that the
// less-verbal partner often never says out loud.
//
// Each prompt is a 1-7 scale anchored by two honest extremes, plus an optional
// private note that only surfaces at reveal. Scoring measures alignment and,
// more importantly, flags the largest GAPS as conversation starters.

export type MoneyMindPrompt = {
  id: string;
  category: "spending" | "security" | "ambition" | "fairness" | "communication" | "future";
  prompt: string;
  lowLabel: string;
  highLabel: string;
  // What a large gap on this prompt usually means — shown at reveal.
  gapInsight: string;
};

export const MONEY_MIND_PROMPTS: MoneyMindPrompt[] = [
  {
    id: "spend-guilt",
    category: "spending",
    prompt: "When I spend on something just for me, I feel…",
    lowLabel: "Guilty, like I shouldn't have",
    highLabel: "Fine, I earned it",
    gapInsight: "One of you carries spending guilt the other doesn't. That gap quietly fuels resentment about 'who gets to enjoy money.'",
  },
  {
    id: "security-runway",
    category: "security",
    prompt: "How much cash on hand makes me feel safe?",
    lowLabel: "A small buffer is plenty",
    highLabel: "I need months of runway",
    gapInsight: "You have different definitions of 'safe.' The higher partner may feel constantly exposed while the lower partner feels held back.",
  },
  {
    id: "risk-appetite",
    category: "ambition",
    prompt: "When it comes to money risk, I am…",
    lowLabel: "Protect what we have",
    highLabel: "Bet big to grow it",
    gapInsight: "Mismatched risk appetite is a top driver of investment fights. Name it before the market does it for you.",
  },
  {
    id: "fairness-split",
    category: "fairness",
    prompt: "Our money should be…",
    lowLabel: "Fully separate, what's mine is mine",
    highLabel: "Fully shared, one pot",
    gapInsight: "If you're far apart here, every shared expense feels unfair to someone. This is worth an explicit agreement.",
  },
  {
    id: "comm-openness",
    category: "communication",
    prompt: "Talking about money with my partner feels…",
    lowLabel: "Stressful, I avoid it",
    highLabel: "Easy, I bring it up freely",
    gapInsight: "If one of you avoids these talks, the other is making decisions alone — and probably feels alone in it.",
  },
  {
    id: "debt-tolerance",
    category: "security",
    prompt: "Carrying debt makes me feel…",
    lowLabel: "Sick, pay it off now",
    highLabel: "Relaxed, it's a tool",
    gapInsight: "Debt tolerance gaps turn payoff strategy into a values fight. Decide whose nervous system you're optimizing for.",
  },
  {
    id: "future-focus",
    category: "future",
    prompt: "I think about money mostly in terms of…",
    lowLabel: "Right now, this month",
    highLabel: "10+ years out",
    gapInsight: "Different time horizons make the same budget feel reckless to one and joyless to the other.",
  },
  {
    id: "ambition-drive",
    category: "ambition",
    prompt: "How hard do I want to push to earn more?",
    lowLabel: "Enough is enough, protect my time",
    highLabel: "I want significantly more",
    gapInsight: "If one of you is quietly more ambitious, unspoken expectations build up. Say the real number.",
  },
  {
    id: "fairness-effort",
    category: "fairness",
    prompt: "I feel the financial load between us is…",
    lowLabel: "I carry more than my share",
    highLabel: "Perfectly balanced",
    gapInsight: "Perceived imbalance — real or not — is corrosive. A low score here is a flag to hear each other out, not to defend.",
  },
  {
    id: "comm-transparency",
    category: "communication",
    prompt: "There are money things I haven't told my partner.",
    lowLabel: "Yes, some things",
    highLabel: "No, they know everything",
    gapInsight: "Financial secrecy ('financial infidelity') predicts conflict more than income does. No judgment — just open the door.",
  },
];

export const CORE_PROMPT_IDS = MONEY_MIND_PROMPTS.map((p) => p.id);

export function getPrompts(): MoneyMindPrompt[] {
  return MONEY_MIND_PROMPTS;
}

type AnswerMap = Record<string, { value: number; note?: string }>;

export type RevealItem = {
  promptId: string;
  prompt: string;
  category: string;
  lowLabel: string;
  highLabel: string;
  a: { value: number; note?: string } | null;
  b: { value: number; note?: string } | null;
  gap: number;
  gapInsight: string | null;
};

export type RevealResult = {
  alignmentScore: number; // 0-100, higher = more aligned
  items: RevealItem[];
  biggestGaps: RevealItem[];
  strongestAlignments: RevealItem[];
};

// Compare two partners' answers into a reveal payload.
export function buildReveal(
  answersA: AnswerMap | null,
  answersB: AnswerMap | null
): RevealResult {
  const items: RevealItem[] = MONEY_MIND_PROMPTS.map((p) => {
    const a = answersA?.[p.id] ?? null;
    const b = answersB?.[p.id] ?? null;
    const gap = a && b ? Math.abs(a.value - b.value) : 0;
    return {
      promptId: p.id,
      prompt: p.prompt,
      category: p.category,
      lowLabel: p.lowLabel,
      highLabel: p.highLabel,
      a,
      b,
      gap,
      gapInsight: gap >= 3 ? p.gapInsight : null,
    };
  });

  const answered = items.filter((i) => i.a && i.b);
  // Max gap per prompt on a 1-7 scale is 6. Alignment = 1 - avg(gap)/6.
  const avgGap = answered.length
    ? answered.reduce((s, i) => s + i.gap, 0) / answered.length
    : 0;
  const alignmentScore = Math.round((1 - avgGap / 6) * 100);

  const biggestGaps = [...answered]
    .filter((i) => i.gap >= 2)
    .sort((x, y) => y.gap - x.gap)
    .slice(0, 3);

  const strongestAlignments = [...answered]
    .filter((i) => i.gap <= 1)
    .sort((x, y) => x.gap - y.gap)
    .slice(0, 3);

  return { alignmentScore, items, biggestGaps, strongestAlignments };
}

export async function getOrCreateResponse(roundId: string, userId: string) {
  return prisma.moneyMindResponse.upsert({
    where: { roundId_userId: { roundId, userId } },
    update: {},
    create: { roundId, userId, answers: {} },
  });
}
