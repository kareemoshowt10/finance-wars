import { describe, it, expect } from "vitest";
import {
  parseQuickEntry, guessFromDictionary, normalizeToken, normalizeDescription,
} from "@/lib/capture";

describe("parseQuickEntry", () => {
  it("parses 'amount description'", () => {
    const r = parseQuickEntry("5.50 coffee");
    expect(r).toEqual({ amountCents: 550, amount: 5.5, description: "coffee" });
  });

  it("parses 'description amount'", () => {
    const r = parseQuickEntry("coffee 5.50");
    if ("error" in r) throw new Error(r.error);
    expect(r.amountCents).toBe(550);
    expect(r.description).toBe("coffee");
  });

  it("handles dollar signs and thousands separators", () => {
    const r = parseQuickEntry("$1,200 rent");
    if ("error" in r) throw new Error(r.error);
    expect(r.amountCents).toBe(120000);
    expect(r.description).toBe("rent");
  });

  it("pads single decimal digits (5.5 → 550 cents)", () => {
    const r = parseQuickEntry("5.5 coffee");
    if ("error" in r) throw new Error(r.error);
    expect(r.amountCents).toBe(550);
  });

  it("stores integer cents so float drift can't accumulate", () => {
    const r = parseQuickEntry("19.99 subscription");
    if ("error" in r) throw new Error(r.error);
    expect(r.amountCents).toBe(1999);
    expect(Number.isInteger(r.amountCents)).toBe(true);
  });

  it("blocks empty and zero amounts", () => {
    expect("error" in parseQuickEntry("")).toBe(true);
    expect("error" in parseQuickEntry("coffee")).toBe(true);
    expect("error" in parseQuickEntry("0 coffee")).toBe(true);
  });

  it("works with amount only (description optional)", () => {
    const r = parseQuickEntry("140");
    if ("error" in r) throw new Error(r.error);
    expect(r.amountCents).toBe(14000);
    expect(r.description).toBe("");
  });
});

describe("guessFromDictionary", () => {
  it("maps merchant names with high confidence", () => {
    const g = guessFromDictionary("starbucks run", "expense");
    expect(g.category).toBe("Food & Dining");
    expect(g.confidence).toBeGreaterThanOrEqual(0.9);
    expect(g.via).toBe("dictionary");
  });

  it("maps generic keywords", () => {
    expect(guessFromDictionary("gas fill up", "expense").category).toBe("Transport");
    expect(guessFromDictionary("rent", "expense").category).toBe("Housing");
    expect(guessFromDictionary("weekly groceries", "expense").category).toBe("Groceries");
  });

  it("matches bigram merchants (whole foods)", () => {
    expect(guessFromDictionary("whole foods haul", "expense").category).toBe("Groceries");
  });

  it("categorizes income by keyword", () => {
    expect(guessFromDictionary("drywall job", "income").category).toBe("Freelance");
    expect(guessFromDictionary("october paycheck", "income").category).toBe("Salary");
    expect(guessFromDictionary("dividend payout", "income").category).toBe("Investment");
  });

  it("picks the strongest match when multiple keywords hit", () => {
    // "uber" (0.85 Transport) vs "ubereats" not present here; "lunch" 0.85 vs "chipotle" 0.92
    const g = guessFromDictionary("chipotle lunch", "expense");
    expect(g.category).toBe("Food & Dining");
    expect(g.confidence).toBe(0.92);
  });

  it("falls back to Other with low confidence, never blocking", () => {
    const g = guessFromDictionary("xyzzy plugh", "expense");
    expect(g.category).toBe("Other");
    expect(g.confidence).toBeLessThanOrEqual(0.3);
    expect(g.via).toBe("fallback");
  });
});

describe("normalizers", () => {
  it("normalizeToken strips punctuation and case", () => {
    expect(normalizeToken("Starbucks!")).toBe("starbucks");
    expect(normalizeToken("Trader-Joe's")).toBe("traderjoes");
  });
  it("normalizeDescription collapses to comparable form", () => {
    expect(normalizeDescription("  Weekly   GROCERY run! ")).toBe("weekly grocery run");
    expect(normalizeDescription("Grocery Run")).toBe(normalizeDescription("grocery run"));
  });
});
