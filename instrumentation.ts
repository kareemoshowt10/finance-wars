/**
 * Runs once per server process at boot. Its only job is to print the
 * production configuration report from lib/launchChecks.ts, so a deploy that
 * is missing something important says so in the logs instead of quietly
 * behaving like a development build.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { checkLaunchReadiness, formatFindings } = await import("./lib/launchChecks");
  const findings = checkLaunchReadiness();
  if (findings.length === 0) return;
  const report = formatFindings(findings);
  if (findings.some((f) => f.severity === "critical")) console.error(report);
  else console.warn(report);
}
