// Production readiness: the environment variables that change how the app
// *behaves* rather than whether it boots.
//
// Missing ones don't crash anything — they silently downgrade the app into a
// development posture (payments become free, crons become open endpoints,
// OAuth buttons stop working). That's exactly right locally and exactly wrong
// in production, so instrumentation.ts prints this at server boot.

export type Severity = "critical" | "warning";
export type Finding = { key: string; severity: Severity; message: string };

/** A blank string is as unset as an absent one — Vercel loves empty vars. */
function isSet(v: string | undefined): boolean {
  return typeof v === "string" && v.trim().length > 0;
}

/**
 * Pure so it can be unit tested: hand it an env bag, get back what's wrong.
 * Returns [] for a fully configured production environment, and always [] off
 * production — a developer doesn't need to be told their laptop has no Stripe
 * account.
 */
export function checkLaunchReadiness(env: NodeJS.ProcessEnv = process.env): Finding[] {
  if (env.NODE_ENV !== "production") return [];
  const findings: Finding[] = [];

  if (!isSet(env.JWT_SECRET)) {
    findings.push({
      key: "JWT_SECRET",
      severity: "critical",
      message: "Sessions cannot be signed. Authentication will fail on every request.",
    });
  }

  if (!isSet(env.CRON_SECRET)) {
    findings.push({
      key: "CRON_SECRET",
      severity: "critical",
      message: "Scheduled jobs are refusing to run (/api/cron/* returns 500 without it).",
    });
  }

  if (!isSet(env.STRIPE_SECRET_KEY)) {
    findings.push({
      key: "STRIPE_SECRET_KEY",
      severity: "critical",
      message:
        "Billing is in dev mode: every paid plan upgrades for free and nobody is charged. " +
        "Set it (plus STRIPE_WEBHOOK_SECRET and the price ids) before taking money.",
    });
  } else {
    // Only worth mentioning once Stripe is actually live.
    if (!isSet(env.STRIPE_WEBHOOK_SECRET)) {
      findings.push({
        key: "STRIPE_WEBHOOK_SECRET",
        severity: "critical",
        message:
          "Stripe webhooks cannot be verified, so plans will not stay in sync with subscriptions " +
          "(cancellations and failed payments won't downgrade anyone).",
      });
    }
    for (const key of ["STRIPE_PRICE_RHYTHM", "STRIPE_PRICE_HOUSEHOLD_HQ"] as const) {
      if (!isSet(env[key])) {
        findings.push({ key, severity: "critical", message: "Checkout for this plan will throw when someone tries to upgrade." });
      }
    }
  }

  if (!isSet(env.NEXT_PUBLIC_APP_URL)) {
    findings.push({
      key: "NEXT_PUBLIC_APP_URL",
      severity: "warning",
      message: "Share links, OAuth redirects and Stripe return URLs will be built from a guessed origin.",
    });
  }

  if (isSet(env.GOOGLE_CLIENT_ID) !== isSet(env.GOOGLE_CLIENT_SECRET)) {
    findings.push({
      key: "GOOGLE_CLIENT_ID/SECRET",
      severity: "warning",
      message: "Only half of the Google OAuth pair is set — sign-in with Google will fail.",
    });
  }

  if (isSet(env.SEED_TOKEN)) {
    findings.push({
      key: "SEED_TOKEN",
      severity: "warning",
      message: "/api/admin/seed is reachable in production by anyone holding this token. Unset it unless you're actively seeding.",
    });
  }

  return findings;
}

/** Human-readable block for the server log. Empty string when all clear. */
export function formatFindings(findings: Finding[]): string {
  if (findings.length === 0) return "";
  const line = "─".repeat(72);
  const rows = findings.map((f) => {
    const tag = f.severity === "critical" ? "CRITICAL" : " WARNING";
    return `  [${tag}] ${f.key}\n             ${f.message}`;
  });
  return [
    line,
    "  Debt Sucker — production configuration is incomplete",
    line,
    ...rows,
    line,
  ].join("\n");
}
