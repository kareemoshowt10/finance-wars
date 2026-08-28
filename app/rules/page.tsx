import type { Metadata } from "next";
import Link from "next/link";
import { BlueprintNav, BlueprintFooter, BlueprintThemeBoundary } from "@/app/_blueprint/BlueprintShell";

export const metadata: Metadata = {
  title: "Rules — Debt Sucker",
  description: "Seven non-negotiable rules for serious couples using Debt Sucker. Short. Opinionated. Read before you play.",
};

const RULES = [
  { n: "01", t: "Every dollar is named.",
    b: "If a dollar isn't assigned to a category, a goal, or a debt, it's drift. Drift is how lifestyle creep wins. Name everything." },
  { n: "02", t: "Both partners see the same screen.",
    b: "If you share rent and a future, you share the dashboard. Private accounts are opt-in by exception, not default. Hidden money is a hidden conversation." },
  { n: "03", t: "Big purchases get a pause.",
    b: "Set a household threshold. Anything above it triggers a pre-flight approval — not because either of you is in charge, but because the pause itself is the safeguard." },
  { n: "04", t: "Debts are bosses. Pay them like fights.",
    b: "Set the APR. Pick a strategy. Attack monthly or the boss heals. Neglect is a tactical loss and we will tell you about it." },
  { n: "05", t: "Talk to the recap every Monday.",
    b: "A five-minute look at the previous week, every week. The single highest-leverage habit in the app — skip it and the rest is decoration." },
  { n: "06", t: "Streaks beat heroics.",
    b: "A 12-month run of $200/mo into a goal beats one heroic $2,400 month and then silence. The compound math doesn't care how you feel about it." },
  { n: "07", t: "Honesty is the entry fee.",
    b: "Don't mis-categorize the meal. Don't hide the card. Don't fake the streak. The dashboard works if you do. Lie to it, lose to it." },
];

export default function RulesPage() {
  return (
    <div className="min-h-screen">
      <BlueprintThemeBoundary />
      <BlueprintNav active="rules" />

      <main className="max-w-[1240px] mx-auto px-6 pt-16 pb-20">
        <Link href="/" className="bp-callsign hover:text-[var(--bp-signal)]">← HOME</Link>

        <header className="mt-10 pb-12 border-b border-[var(--bp-rule)]">
          <div className="bp-callsign mb-6">RULES / 00</div>
          <h1 className="bp-display">
            Seven rules.<br /><span className="bp-display-italic">Non-negotiable.</span>
          </h1>
          <p className="bp-body mt-8 max-w-2xl">
            If you can't agree to these, the app won't help you. If you can, you'll buy a house faster than you thought, with a partner who isn't quietly resenting you about it. That's the trade.
          </p>
        </header>

        <section className="mt-12">
          <div className="grid grid-cols-[80px_1fr] gap-px bg-[var(--bp-rule)] border border-[var(--bp-rule)]">
            {RULES.map((r) => (
              <RuleRow key={r.n} n={r.n} t={r.t} b={r.b} />
            ))}
          </div>
        </section>

        <section className="mt-20 bp-panel" style={{ background: "var(--bp-ink)", color: "var(--bp-paper)", borderColor: "var(--bp-ink)" }}>
          <div className="bp-callsign" style={{ color: "var(--bp-signal)" }}>THE DEAL</div>
          <p className="bp-h3 mt-3 max-w-3xl" style={{ color: "var(--bp-paper)" }}>
            We're not your bank. We're not your accountant. We're the rules of the game. Follow them and the game gets easier. Break them and it gets harder. That's it.
          </p>
        </section>

        <div className="mt-16 flex flex-wrap gap-3">
          <Link href="/signup" className="bp-btn-primary">Agree and enlist</Link>
          <Link href="/mission" className="bp-btn-secondary">Read the mission</Link>
        </div>
      </main>

      <BlueprintFooter />
    </div>
  );
}

function RuleRow({ n, t, b }: { n: string; t: string; b: string }) {
  return (
    <>
      <div className="bg-[var(--bp-paper)] p-6 border-r border-[var(--bp-rule)] bp-fig" style={{ fontSize: 28, color: "var(--bp-signal)" }}>{n}</div>
      <div className="bg-[var(--bp-paper)] p-6">
        <h3 className="bp-h3">{t}</h3>
        <p className="bp-body-sm mt-2">{b}</p>
      </div>
    </>
  );
}
