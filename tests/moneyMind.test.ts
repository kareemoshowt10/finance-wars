import { describe, it, expect } from "vitest";
import { buildReveal, MONEY_MIND_PROMPTS, CORE_PROMPT_IDS } from "@/lib/moneyMind";

function fullAnswers(value: number) {
  const out: Record<string, { value: number }> = {};
  for (const id of CORE_PROMPT_IDS) out[id] = { value };
  return out;
}

describe("moneyMind", () => {
  it("has a stable set of core prompts", () => {
    expect(MONEY_MIND_PROMPTS.length).toBe(10);
    expect(CORE_PROMPT_IDS.length).toBe(10);
    // unique ids
    expect(new Set(CORE_PROMPT_IDS).size).toBe(10);
  });

  it("scores identical answers as 100% aligned", () => {
    const r = buildReveal(fullAnswers(4), fullAnswers(4));
    expect(r.alignmentScore).toBe(100);
    expect(r.biggestGaps).toHaveLength(0);
    expect(r.strongestAlignments.length).toBeGreaterThan(0);
  });

  it("scores maximal disagreement as 0% aligned", () => {
    const r = buildReveal(fullAnswers(1), fullAnswers(7));
    expect(r.alignmentScore).toBe(0);
    // big gaps surface insights
    expect(r.biggestGaps.length).toBeGreaterThan(0);
    expect(r.items.every((i) => i.gapInsight !== null)).toBe(true);
  });

  it("flags gaps >= 3 with an insight and ranks biggest gaps", () => {
    const a = fullAnswers(4);
    const b = fullAnswers(4);
    b[CORE_PROMPT_IDS[0]] = { value: 7 }; // gap 3
    const r = buildReveal(a, b);
    const flagged = r.items.find((i) => i.promptId === CORE_PROMPT_IDS[0]);
    expect(flagged?.gap).toBe(3);
    expect(flagged?.gapInsight).toBeTruthy();
    expect(r.biggestGaps[0].promptId).toBe(CORE_PROMPT_IDS[0]);
  });

  it("handles a partner who hasn't answered yet", () => {
    const r = buildReveal(fullAnswers(4), null);
    // no comparable pairs => no gaps surfaced
    expect(r.biggestGaps).toHaveLength(0);
    expect(r.items.every((i) => i.b === null)).toBe(true);
    expect(r.items.every((i) => i.a !== null)).toBe(true);
  });
});
