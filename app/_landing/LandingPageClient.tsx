"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BlueprintNav, BlueprintFooter, BlueprintThemeBoundary } from "@/app/_blueprint/BlueprintShell";

export default function LandingPageClient() {
  return (
    <div className="min-h-screen">
      <BlueprintThemeBoundary />
      <BlueprintNav active={null} />
      <Hero />
      <SeriousAboutWhat />
      <HouseholdHQ />
      <ToolsForBigPurchases />
      <ForTwo />
      <Mechanics />
      <FinalCTA />
      <BlueprintFooter />
    </div>
  );
}

/* ---------- HERO ---------------------------------------------------------- */

function Hero() {
  const [now, setNow] = useState("--:--:--");
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setNow(`${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} UTC`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="px-6 pt-16 pb-24 border-b border-[var(--bp-rule)]">
      <div className="max-w-[1240px] mx-auto">
        <div className="flex items-center justify-between bp-callsign mb-12">
          <span>DOC 00 / OVERVIEW</span>
          <span className="bp-fig">{now}</span>
          <span>REV. 2026.06</span>
        </div>

        <div className="grid lg:grid-cols-[1fr_auto] gap-16 items-end">
          <div>
            <div className="bp-callsign mb-6">DEBT SUCKER — FOR HOUSEHOLDS RUNNING A REAL ECONOMY</div>
            <h1 className="bp-display">
              Become the bank.<br />
              Run the chores.<br />
              <span className="bp-display-italic" style={{ color: "var(--bp-signal)" }}>Win together.</span>
            </h1>
            <p className="bp-body mt-8 max-w-xl">
              Debt Sucker is the financial tool for serious, transparent households — couples, roommates,
              families with kids old enough to do the dishes. Track family loans like a real bank, turn
              chores into a game everyone wants to win, and pool money for what you're actually saving up
              for — before "we should talk about money" turns into a fight.
            </p>

            <div className="mt-10 flex flex-wrap gap-3">
              <Link href="/signup" className="bp-btn-primary">Enlist your household</Link>
              <Link href="/learn" className="bp-btn-secondary">Run the free tools</Link>
            </div>

            <div className="mt-6 bp-callsign">
              NO CREDIT CARD · NO BANK LOGIN · THE WHOLE HOUSEHOLD WELCOME
            </div>
          </div>

          {/* Right column: a small "blueprint" panel showing a path-to-keys schematic */}
          <PathToKeys />
        </div>
      </div>
    </section>
  );
}

function PathToKeys() {
  return (
    <div className="bp-panel w-[320px] hidden lg:block">
      <div className="bp-callsign mb-6">FIG.01 — PATH TO KEYS</div>
      <ol className="space-y-5">
        {[
          { n: "01", label: "Align with partner", note: "Money Mind" },
          { n: "02", label: "Pick a number", note: "Affordability calc" },
          { n: "03", label: "Save the down", note: "Down Payment Plan" },
          { n: "04", label: "Defeat any blocking debt", note: "Debt Bosses" },
          { n: "05", label: "Close", note: "Keys" },
        ].map((step, i, arr) => (
          <li key={step.n} className="flex gap-4 items-start">
            <div className="bp-fig text-[13px] text-[var(--bp-mute)] w-6 shrink-0">{step.n}</div>
            <div className="flex-1">
              <div className="text-[15px] font-medium">{step.label}</div>
              <div className="bp-callsign mt-0.5">{step.note}</div>
            </div>
            {i < arr.length - 1 && <div className="bp-callsign">↓</div>}
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ---------- SECTION 1 ----------------------------------------------------- */

function SeriousAboutWhat() {
  return (
    <section className="px-6 py-24 border-b border-[var(--bp-rule)]">
      <div className="max-w-[1240px] mx-auto">
        <div className="bp-section-marker">§01 — WHAT WE MEAN BY "SERIOUS"</div>
        <div className="grid md:grid-cols-3 gap-10 mt-8">
          {[
            { eyebrow: "TRANSPARENT", h: "No hidden accounts.", body: "Both partners see the same balances, the same goals, the same progress. Optional read-only sharing for the partner who doesn't want to manage — but does want to see." },
            { eyebrow: "ALIGNED", h: "Agree on the numbers first.", body: "Money Mind asks each of you the same 10 honest questions privately, then reveals the gaps. The fight you'd have in six months — surfaced now, low-stakes." },
            { eyebrow: "ACCOUNTABLE", h: "Big purchases get pre-flight checks.", body: "Set a household threshold. Anything above it pings your partner for approval before it lands on the card. Not surveillance — a pause." },
          ].map((c) => (
            <div key={c.eyebrow}>
              <div className="bp-callsign mb-3">{c.eyebrow}</div>
              <h3 className="bp-h3">{c.h}</h3>
              <p className="bp-body-sm mt-3">{c.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- SECTION 1.5 — HOUSEHOLD HQ ------------------------------------ */

function HouseholdHQ() {
  const cards = [
    {
      eyebrow: "THE BANK",
      h: "Become the bank.",
      body: "One person fronts the cash — a phone repair, a concert ticket, rent that's short this month. Track exactly who owes what, why, and whether it's quietly accruing interest.",
    },
    {
      eyebrow: "CHORES & CROWNS",
      h: "Who does the dishes, made visible.",
      body: "Every chore pays Crowns and XP. Streaks, a weekly leaderboard, and a running tally of who actually unloads the dishwasher — settled by the scoreboard, not by memory.",
    },
    {
      eyebrow: "HOUSEHOLD GOALS",
      h: "PS5 vs. the pool — let it play out.",
      body: "Elective goals compete for votes and dollars. Essential ones — like the bathroom remodel nobody wants to think about — get flagged the moment they've gone quiet.",
    },
  ];
  return (
    <section className="px-6 py-24 border-b border-[var(--bp-rule)]">
      <div className="max-w-[1240px] mx-auto">
        <div className="bp-section-marker">§01.5 — HOUSEHOLD HQ</div>
        <div className="grid md:grid-cols-[1fr_auto] gap-12 items-end mb-12">
          <h2 className="bp-h2">The chores, the loans, the "who's paying for what" — one shared scoreboard.</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-10">
          {cards.map((c) => (
            <div key={c.eyebrow}>
              <div className="bp-callsign mb-3">{c.eyebrow}</div>
              <h3 className="bp-h3">{c.h}</h3>
              <p className="bp-body-sm mt-3">{c.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- SECTION 2 — TOOLS -------------------------------------------- */

function ToolsForBigPurchases() {
  const tools = [
    { num: "T.01", href: "/tools/home-affordability", title: "Home Affordability", body: "What you can actually afford using 28/36, PMI, taxes, insurance, HOA." },
    { num: "T.02", href: "/tools/down-payment", title: "Down Payment Plan", body: "Target price → required save → months to ready, with HYSA interest factored in." },
    { num: "T.03", href: "/tools/mortgage", title: "Mortgage Payoff", body: "Years cut off and interest saved per extra dollar of principal." },
    { num: "T.04", href: "/tools/car-affordability", title: "Car Affordability", body: "The 20/4/10 rule with real total cost of ownership, not just the loan payment." },
  ];

  return (
    <section className="px-6 py-24 border-b border-[var(--bp-rule)]">
      <div className="max-w-[1240px] mx-auto">
        <div className="bp-section-marker">§02 — TOOLS FOR THE BIG PURCHASES</div>
        <div className="grid md:grid-cols-[1fr_auto] gap-12 items-end mb-12">
          <h2 className="bp-h2">Four calculators for the only two purchases that really matter.</h2>
          <Link href="/learn" className="bp-link whitespace-nowrap">All tools →</Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-[var(--bp-rule)] border border-[var(--bp-rule)]">
          {tools.map((t) => (
            <Link key={t.href} href={t.href} className="bg-[var(--bp-paper)] p-7 hover:bg-white transition group flex flex-col">
              <div className="bp-callsign">{t.num}</div>
              <div className="bp-h3 mt-4 group-hover:text-[var(--bp-signal)] transition">{t.title}</div>
              <p className="bp-body-sm mt-3 flex-1">{t.body}</p>
              <div className="bp-callsign mt-5" style={{ color: "var(--bp-signal)" }}>OPEN →</div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- SECTION 3 — FOR TWO ------------------------------------------ */

function ForTwo() {
  return (
    <section className="px-6 py-24 border-b border-[var(--bp-rule)]">
      <div className="max-w-[1240px] mx-auto">
        <div className="bp-section-marker">§03 — DESIGNED FOR TWO</div>

        <div className="grid lg:grid-cols-2 gap-16 items-start">
          <div>
            <h2 className="bp-h2">Money Mind: find out what you each really think — before it costs you.</h2>
            <p className="bp-body mt-5">
              Both partners answer the same 10 questions privately. Spending guilt, security runway,
              debt tolerance, hidden purchases, the ambition gap. Nothing is shared until you both reveal —
              together, in the same room if possible.
            </p>
            <p className="bp-body mt-4">
              You'll see your <span className="bp-fig" style={{ color: "var(--bp-signal)" }}>alignment score</span>, your biggest gaps,
              and a one-paragraph conversation starter for each. It's the marriage counselor's first
              session, condensed into 5 minutes, available on demand.
            </p>
            <Link href="/signup" className="bp-link mt-8 inline-flex">Try Money Mind →</Link>
          </div>

          <div className="bp-panel">
            <div className="bp-callsign mb-4">SAMPLE READOUT</div>
            <div className="bp-fig" style={{ fontSize: "72px", lineHeight: 0.9, color: "var(--bp-blueprint)" }}>76<span style={{ fontSize: 28 }}>%</span></div>
            <div className="bp-body-sm mt-1">alignment with Sam</div>

            <div className="mt-6 space-y-4">
              {[
                { q: "Spending guilt", you: 6, partner: 2, gap: "high" },
                { q: "Debt tolerance", you: 3, partner: 3, gap: "low" },
                { q: "Risk appetite", you: 2, partner: 6, gap: "high" },
              ].map((row) => (
                <div key={row.q}>
                  <div className="flex justify-between bp-callsign">
                    <span>{row.q}</span>
                    <span style={{ color: row.gap === "high" ? "var(--bp-signal)" : "var(--bp-strike)" }}>
                      {row.gap === "high" ? "TALK ABOUT THIS" : "ALIGNED"}
                    </span>
                  </div>
                  <div className="relative h-5 mt-2 border-b border-[var(--bp-rule-faint)]">
                    <Marker pos={row.you} color="var(--bp-ink)" label="YOU" />
                    <Marker pos={row.partner} color="var(--bp-signal)" label="SAM" top={false} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Marker({ pos, color, label, top = true }: { pos: number; color: string; label: string; top?: boolean }) {
  const pct = ((pos - 1) / 6) * 100;
  return (
    <div className="absolute -translate-x-1/2" style={{ left: `${pct}%`, top: top ? -3 : "auto", bottom: top ? "auto" : -3 }}>
      <div className="w-2 h-2" style={{ background: color }} />
      <div className="bp-callsign mt-0.5 -translate-x-1/2 ml-1 whitespace-nowrap" style={{ color }}>{label}</div>
    </div>
  );
}

/* ---------- SECTION 4 — MECHANICS ---------------------------------------- */

function Mechanics() {
  return (
    <section className="px-6 py-24 border-b border-[var(--bp-rule)]">
      <div className="max-w-[1240px] mx-auto">
        <div className="bp-section-marker">§04 — THE REST OF THE TOOLKIT</div>
        <div className="grid md:grid-cols-3 gap-12 mt-8">
          {[
            { tag: "M.01", h: "Debt Bosses", body: "Each debt is a boss with HP, APR-driven regen, and an ETA. Pay it down to defeat it. Neglect it and it heals." },
            { tag: "M.02", h: "Vice Tax", body: "Pick a category you can't quit. Set a small tax. Every matching expense quietly funds a goal. Guilt becomes gas." },
            { tag: "M.03", h: "Goal Raids", body: "Short timeframes, high targets. The down payment becomes a named boss with a clock. Win and the keys are yours." },
            { tag: "M.04", h: "Weekly Recap", body: "Every Monday: net flow, biggest hit, what crept up, what improved. The five-minute Monday meeting, automated." },
            { tag: "M.05", h: "Lifestyle Creep Watch", body: "Quarterly delta on every category. Where spending drifted up, with a one-click counter-action." },
            { tag: "M.06", h: "Big Purchase Approvals", body: "Set a threshold. Anything above pings your partner first. A built-in pause, not a permission slip." },
            { tag: "M.07", h: "Chores & Crowns", body: "Every completed chore pays Crowns and XP. Streaks and a weekly leaderboard turn dishes duty into something worth showing up for." },
            { tag: "M.08", h: "The Bank", body: "Family loans with a purpose, a balance, and — if you want — interest. No more \"I think you still owe me for that.\"" },
          ].map((c) => (
            <div key={c.tag} className="border-l border-[var(--bp-rule)] pl-5">
              <div className="bp-callsign">{c.tag}</div>
              <div className="bp-h3 mt-2">{c.h}</div>
              <p className="bp-body-sm mt-2">{c.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- FINAL CTA ----------------------------------------------------- */

function FinalCTA() {
  return (
    <section className="px-6 py-32">
      <div className="max-w-[1240px] mx-auto">
        <div className="bp-section-marker">§ END — START</div>
        <div className="grid md:grid-cols-[1fr_auto] gap-12 items-end">
          <h2 className="bp-display" style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)" }}>
            The house. The chores.<br />The bathroom you keep saying you'll fix.
          </h2>
          <div className="flex flex-wrap gap-3 shrink-0">
            <Link href="/signup" className="bp-btn-primary">Enlist your household</Link>
            <Link href="/mission" className="bp-btn-secondary">Read mission</Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function pad(n: number) { return n < 10 ? `0${n}` : `${n}`; }
