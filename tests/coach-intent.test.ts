import { describe, it, expect } from "vitest";
import { matchIntent } from "@/lib/coach/intents";

describe("coach intent matcher", () => {
  it("detects status intent", () => {
    expect(matchIntent("How am I doing this month?").name).toBe("status");
    expect(matchIntent("give me a summary").name).toBe("status");
  });

  it("detects spend-by-category with category + month", () => {
    const r = matchIntent("what did I spend on food last month");
    expect(r.name).toBe("spend-by-category");
    expect(r.slots.category).toBe("Food & Dining");
    expect(r.slots.month).toBe("last");
  });

  it("detects top-expenses", () => {
    expect(matchIntent("what are my top expenses").name).toBe("top-expenses");
    expect(matchIntent("show me biggest spend categories").name).toBe("top-expenses");
  });

  it("detects subscriptions", () => {
    expect(matchIntent("show me my subscriptions").name).toBe("subscriptions");
    expect(matchIntent("any recurring charges?").name).toBe("subscriptions");
  });

  it("detects goal-on-track", () => {
    expect(matchIntent("am I on track for my emergency fund").name).toBe("goal-on-track");
    expect(matchIntent("will I hit my goal").name).toBe("goal-on-track");
  });

  it("detects save-suggestion", () => {
    expect(matchIntent("how can I save more").name).toBe("save-suggestion");
    expect(matchIntent("any tips to save?").name).toBe("save-suggestion");
  });

  it("falls back to unknown for gibberish", () => {
    expect(matchIntent("asdfjkl qwerty").name).toBe("unknown");
    expect(matchIntent("").name).toBe("unknown");
  });
});
