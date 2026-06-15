import type { Metadata } from "next";
import Link from "next/link";
import { BlueprintNav, BlueprintFooter, BlueprintThemeBoundary } from "@/app/_blueprint/BlueprintShell";

export const metadata: Metadata = {
  title: "Mission — Finance Wars",
  description: "Finance Wars is the financial tool for serious, transparent couples — built around homeownership, car ownership, and not pretending you both think the same thing about money.",
};

const PILLARS = [
  {
    tag: "§01",
    label: "TRANSPARENCY",
    h: "Both partners see the same picture.",
    body: "There is no version of healthy joint finances that runs on one partner keeping the spreadsheet and the other 'trusting them.' Trust requires visibility. Our default is shared; private accounts are opt-in.",
  },
  {
    tag: "§02",
    label: "ALIGNMENT BEFORE STRATEGY",
    h: "Numbers are downstream of values.",
    body: "A savings rate target is meaningless if one of you defines 'safe' as 3 months and the other defines it as 3 years. Money Mind surfaces those gaps in 5 minutes so the next 5 years aren't built on a hidden disagreement.",
  },
  {
    tag: "§03",
    label: "BIG PURCHASES ARE THE POINT",
    h: "Most financial decisions don't matter. A few do.",
    body: "Whether you skip a latte is noise. Whether you buy a house at the right price, with the right down payment, and a partner who's on the same page — that's the decision that compounds for thirty years. We focus the tools there.",
  },
  {
    tag: "§04",
    label: "HONESTY OVER OPTIMISM",
    h: "We'll tell you when you're losing.",
    body: "Neglect a debt boss for 30 days, you get a 'silent' badge. Spending creeps up vs. last quarter, you get the diff. The dashboard isn't here to congratulate you for opening it. It's here to show you what's actually happening.",
  },
  {
    tag: "§05",
    label: "GAMIFICATION WITH GRAVITY",
    h: "The game mechanics aren't decoration.",
    body: "Debts have HP because that frames them as something to defeat. Goals get raids because a deadline + a clock + a story performs better than a bar graph. The play layer makes the boring math feel like progress — without distorting the math.",
  },
  {
    tag: "§06",
    label: "BUILT FOR TWO",
    h: "Designed at the household level.",
    body: "Joint accounts, allowances, pre-flight purchase approvals, paired Goal Raids, shared recaps. If you share rent and a future, you should share the operating system that runs them.",
  },
];

export default function MissionPage() {
  return (
    <div className="min-h-screen">
      <BlueprintThemeBoundary />
      <BlueprintNav active="mission" />

      <main className="max-w-[1240px] mx-auto px-6 pt-16 pb-20">
        <Link href="/" className="bp-callsign hover:text-[var(--bp-signal)]">← HOME</Link>

        <header className="mt-10 pb-12 border-b border-[var(--bp-rule)]">
          <div className="bp-callsign mb-6">MISSION / 00</div>
          <h1 className="bp-display">
            A financial tool for serious, transparent <span className="bp-display-italic" style={{ color: "var(--bp-signal)" }}>couples.</span>
          </h1>
          <p className="bp-body mt-8 max-w-2xl">
            Finance Wars exists because the standard personal finance experience is a single-player spreadsheet,
            and most people who actually need help are in a relationship. We rebuilt the surface around the two
            decisions that matter most over a lifetime — buying a house, buying a car — and the partner you're
            making them with.
          </p>
          <p className="bp-body mt-4 max-w-2xl">
            The math is conventional. The pairing isn't.
          </p>
        </header>

        <section className="mt-16">
          <div className="bp-section-marker">§ WHAT WE BELIEVE</div>
          <div className="grid md:grid-cols-2 gap-px bg-[var(--bp-rule)] border border-[var(--bp-rule)] mt-6">
            {PILLARS.map((p) => (
              <article key={p.tag} className="bg-[var(--bp-paper)] p-8">
                <div className="flex justify-between bp-callsign">
                  <span>{p.tag}</span>
                  <span>{p.label}</span>
                </div>
                <h3 className="bp-h3 mt-4">{p.h}</h3>
                <p className="bp-body-sm mt-3">{p.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-20 grid md:grid-cols-2 gap-px bg-[var(--bp-rule)] border border-[var(--bp-rule)]">
          <div className="bg-[var(--bp-paper)] p-8">
            <div className="bp-callsign">FOR</div>
            <ul className="mt-4 space-y-2 bp-body-sm">
              <li>· Couples moving from renting to owning</li>
              <li>· Households making the second-biggest purchase of their life (after the first)</li>
              <li>· Partners who haven't agreed about money yet — and know it</li>
              <li>· People who tried the spreadsheet and quit</li>
              <li>· Spreadsheet people whose partner won't look at the spreadsheet</li>
            </ul>
          </div>
          <div className="bg-[var(--bp-paper)] p-8">
            <div className="bp-callsign" style={{ color: "var(--bp-signal)" }}>NOT FOR</div>
            <ul className="mt-4 space-y-2 bp-body-sm">
              <li>· People who want congratulations for opening the app</li>
              <li>· Anyone looking for tax advice, stock picks, or a CFP</li>
              <li>· Day-traders, options-as-income, get-rich-quick</li>
              <li>· People who specifically don't want their behavior surfaced</li>
            </ul>
          </div>
        </section>

        <section className="mt-20 bp-panel">
          <div className="bp-callsign">THE PACT</div>
          <p className="bp-h3 mt-3 max-w-3xl">
            We won't sell your data. We won't hide fees. We won't dark-pattern you into upgrades.
            In exchange, you show up — even when the numbers are ugly. Especially then.
          </p>
        </section>

        <div className="mt-16 flex flex-wrap gap-3">
          <Link href="/signup" className="bp-btn-primary">Enlist together</Link>
          <Link href="/rules" className="bp-btn-secondary">Read the rules</Link>
        </div>
      </main>

      <BlueprintFooter />
    </div>
  );
}
