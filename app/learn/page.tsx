import type { Metadata } from "next";
import Link from "next/link";
import { BlueprintNav, BlueprintFooter } from "@/app/_blueprint/BlueprintShell";
import { BlueprintThemeBoundary } from "@/app/_blueprint/BlueprintShell";

export const metadata: Metadata = {
  title: "Tools & Guides — Debt Sucker",
  description: "Free calculators for couples building toward homeownership and car ownership. Home affordability, mortgage payoff, down payment plans, car affordability, debt payoff. Plus mental-model guides.",
  openGraph: {
    title: "Free Tools for Serious Couples — Debt Sucker",
    description: "Calculators and guides for partners planning the big purchases.",
  },
};

const HOMEOWNER = [
  { num: "T.01", href: "/tools/home-affordability", title: "Home Affordability", body: "What you can actually afford using 28/36, with property tax, insurance, HOA and PMI factored in." },
  { num: "T.02", href: "/tools/down-payment", title: "Down Payment Plan", body: "Target home price → required savings → months to ready, with HYSA interest." },
  { num: "T.03", href: "/tools/mortgage", title: "Mortgage Payoff", body: "Years cut and interest saved for every extra dollar of monthly principal." },
];

const CAR = [
  { num: "T.04", href: "/tools/car-affordability", title: "Car Affordability", body: "The 20/4/10 rule with real total cost of ownership — loan plus insurance, fuel, maintenance." },
  { num: "T.05", href: "/tools/debt-calculator", title: "Debt Payoff", body: "Compare avalanche vs snowball. See what an extra $100/mo really saves you." },
];

const FOUNDATION = [
  { num: "T.06", href: "/tools/50-30-20", title: "50/30/20 Budget", body: "Instant bucket split from income — the budget framework that takes 30 seconds to set up." },
  { num: "T.07", href: "/tools/emergency-fund", title: "Emergency Fund", body: "Risk-profile-based target with a month-by-month progress chart." },
  { num: "T.08", href: "/tools/compound-interest", title: "Compound Interest", body: "What $100/mo really becomes in 10, 20, 30 years at different rates." },
];

const GUIDES = [
  { tag: "G.01", title: "Avalanche vs Snowball, decided in 60 seconds", body: "Avalanche saves more money. Snowball gives you a win first. Pick avalanche if your highest-APR debt is also your biggest balance; pick snowball if you've tried and quit before — momentum beats math when willpower is the variable." },
  { tag: "G.02", title: "The 28/36 rule in plain English", body: "Lenders look at two ratios: housing should be ≤28% of gross monthly income (front-end), and total monthly debt ≤36% (back-end). Hit both and most lenders approve. Miss the back-end and you'll get a higher rate or denial — pay down a card first." },
  { tag: "G.03", title: "Why 20% down isn't just about PMI", body: "Less than 20% down means private mortgage insurance, which adds hundreds per month. But it also means starting underwater on a depreciating market shift, less equity to refinance, and a higher monthly payment forever. The math compounds against you." },
  { tag: "G.04", title: "The Vice Tax mental model", body: "You won't stop ordering DoorDash. Fine. Set a 15% Vice Tax on it. Every order automatically routes a slice into a savings goal. You don't notice $4 per order. Your down payment notices." },
  { tag: "G.05", title: "Why couples fight about money (and how to stop)", body: "Almost never about the math. Almost always about undisclosed values — what 'safe' means, what 'enough' means, whether spending guilt is real for you. Money Mind surfaces these without forcing the fight." },
  { tag: "G.06", title: "The 72-hour rule for big purchases", body: "Before any non-essential >$100 buy, wait three days. Write it down. You'll cancel ~60% of them and never miss what you didn't buy. The remaining 40% will feel obviously right." },
];

export default function LearnPage() {
  return (
    <div className="min-h-screen">
      <BlueprintThemeBoundary />
      <BlueprintNav active="tools" />

      <main className="max-w-[1240px] mx-auto px-6 pt-16 pb-20">
        <Link href="/" className="bp-callsign hover:text-[var(--bp-signal)]">← HOME</Link>

        <header className="mt-10 pb-12 border-b border-[var(--bp-rule)]">
          <div className="bp-callsign mb-6">INDEX / 00</div>
          <h1 className="bp-display">Tools. Guides.<br /><span className="bp-display-italic">No signup.</span></h1>
          <p className="bp-body mt-6 max-w-2xl">
            Calculators that run right here, right now. Use them for life. The same engines power
            the in-app tracking — they're not stripped-down demos. If they help, the dashboard helps more.
          </p>
        </header>

        <Section label="§A — HOMEOWNER" items={HOMEOWNER} />
        <Section label="§B — CAR OWNER" items={CAR} />
        <Section label="§C — FOUNDATION" items={FOUNDATION} />

        <section className="mt-20">
          <div className="bp-section-marker">§D — GUIDES & MENTAL MODELS</div>
          <div className="grid md:grid-cols-2 gap-px bg-[var(--bp-rule)] border border-[var(--bp-rule)] mt-6">
            {GUIDES.map((g) => (
              <article key={g.tag} className="bg-[var(--bp-paper)] p-7">
                <div className="bp-callsign">{g.tag}</div>
                <h3 className="bp-h3 mt-3">{g.title}</h3>
                <p className="bp-body-sm mt-3">{g.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-20 bp-panel">
          <div className="grid md:grid-cols-[1fr_auto] gap-8 items-end">
            <div>
              <div className="bp-callsign">END NOTE</div>
              <p className="bp-h3 mt-2">These tools give you the math. The app gives you the game.</p>
              <p className="bp-body-sm mt-3 max-w-xl">
                Boss fights for debt, Vice Tax to redirect leaks, weekly recaps so you can't fool yourself, Money Mind so you can't fool each other.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/signup" className="bp-btn-primary">Enlist</Link>
              <Link href="/mission" className="bp-btn-secondary">Mission</Link>
            </div>
          </div>
        </section>
      </main>

      <BlueprintFooter />
    </div>
  );
}

type Item = { num: string; href: string; title: string; body: string };

function Section({ label, items }: { label: string; items: Item[] }) {
  return (
    <section className="mt-20">
      <div className="bp-section-marker">{label}</div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-[var(--bp-rule)] border border-[var(--bp-rule)] mt-6">
        {items.map((t) => (
          <Link key={t.href} href={t.href} className="bg-[var(--bp-paper)] p-7 hover:bg-white transition group flex flex-col">
            <div className="bp-callsign">{t.num}</div>
            <div className="bp-h3 mt-4 group-hover:text-[var(--bp-signal)] transition">{t.title}</div>
            <p className="bp-body-sm mt-3 flex-1">{t.body}</p>
            <div className="bp-callsign mt-5" style={{ color: "var(--bp-signal)" }}>OPEN →</div>
          </Link>
        ))}
      </div>
    </section>
  );
}
