import { describe, it, expect } from "vitest";
import { checkLaunchReadiness, formatFindings } from "@/lib/launchChecks";

const fullyConfigured = {
  NODE_ENV: "production",
  JWT_SECRET: "s",
  CRON_SECRET: "s",
  STRIPE_SECRET_KEY: "sk_live_x",
  STRIPE_WEBHOOK_SECRET: "whsec_x",
  STRIPE_PRICE_RHYTHM: "price_a",
  STRIPE_PRICE_HOUSEHOLD_HQ: "price_b",
  NEXT_PUBLIC_APP_URL: "https://debtsucker.app",
} as unknown as NodeJS.ProcessEnv;

const keys = (env: NodeJS.ProcessEnv) => checkLaunchReadiness(env).map((f) => f.key);

describe("checkLaunchReadiness", () => {
  it("says nothing when production is fully configured", () => {
    expect(checkLaunchReadiness(fullyConfigured)).toEqual([]);
  });

  it("says nothing outside production, however bare the environment", () => {
    expect(checkLaunchReadiness({ NODE_ENV: "development" } as NodeJS.ProcessEnv)).toEqual([]);
    expect(checkLaunchReadiness({} as NodeJS.ProcessEnv)).toEqual([]);
  });

  it("flags the auth and cron secrets as critical", () => {
    const found = checkLaunchReadiness({ ...fullyConfigured, JWT_SECRET: undefined, CRON_SECRET: undefined });
    expect(found.map((f) => f.key)).toEqual(expect.arrayContaining(["JWT_SECRET", "CRON_SECRET"]));
    expect(found.every((f) => f.severity === "critical")).toBe(true);
  });

  it("treats an empty string the same as unset — Vercel hands those out", () => {
    expect(keys({ ...fullyConfigured, JWT_SECRET: "" })).toContain("JWT_SECRET");
    expect(keys({ ...fullyConfigured, JWT_SECRET: "   " })).toContain("JWT_SECRET");
  });

  it("calls out silently-free billing when Stripe is absent", () => {
    const found = checkLaunchReadiness({ ...fullyConfigured, STRIPE_SECRET_KEY: undefined });
    const stripe = found.find((f) => f.key === "STRIPE_SECRET_KEY");
    expect(stripe?.severity).toBe("critical");
    expect(stripe?.message).toMatch(/free/i);
  });

  it("does not nag about webhook or price ids until Stripe is actually live", () => {
    const bare = { ...fullyConfigured, STRIPE_SECRET_KEY: undefined, STRIPE_WEBHOOK_SECRET: undefined, STRIPE_PRICE_RHYTHM: undefined, STRIPE_PRICE_HOUSEHOLD_HQ: undefined };
    expect(keys(bare)).toEqual(["STRIPE_SECRET_KEY"]);
  });

  it("flags a half-configured Stripe, which is worse than none", () => {
    expect(keys({ ...fullyConfigured, STRIPE_WEBHOOK_SECRET: undefined })).toContain("STRIPE_WEBHOOK_SECRET");
    expect(keys({ ...fullyConfigured, STRIPE_PRICE_RHYTHM: undefined })).toContain("STRIPE_PRICE_RHYTHM");
  });

  it("flags a half-configured Google OAuth pair, but not a deliberately absent one", () => {
    expect(keys({ ...fullyConfigured, GOOGLE_CLIENT_ID: "id" })).toContain("GOOGLE_CLIENT_ID/SECRET");
    expect(keys({ ...fullyConfigured, GOOGLE_CLIENT_ID: "id", GOOGLE_CLIENT_SECRET: "secret" })).toEqual([]);
  });

  it("warns that a live SEED_TOKEN leaves the seed endpoint reachable", () => {
    const found = checkLaunchReadiness({ ...fullyConfigured, SEED_TOKEN: "t" });
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ key: "SEED_TOKEN", severity: "warning" });
  });

  it("warns, but does not block, on a missing app URL", () => {
    const found = checkLaunchReadiness({ ...fullyConfigured, NEXT_PUBLIC_APP_URL: undefined });
    expect(found).toHaveLength(1);
    expect(found[0].severity).toBe("warning");
  });
});

describe("formatFindings", () => {
  it("is empty when there's nothing to report", () => {
    expect(formatFindings([])).toBe("");
  });

  it("names every finding and its key", () => {
    const out = formatFindings(checkLaunchReadiness({ ...fullyConfigured, JWT_SECRET: undefined, SEED_TOKEN: "t" }));
    expect(out).toContain("JWT_SECRET");
    expect(out).toContain("SEED_TOKEN");
    expect(out).toContain("CRITICAL");
    expect(out).toContain("WARNING");
  });
});
