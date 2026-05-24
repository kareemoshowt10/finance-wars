import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft, ArrowRight, Calculator, PiggyBank, TrendingUp, Shield, BookOpen,
  Swords, Flame, Target, Lightbulb,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Learn & Free Tools — Finance Wars",
  description:
    "Free financial calculators, guides, and resources. Debt payoff calculator, 50/30/20 budgeter, compound interest simulator, and more. No signup required.",
  openGraph: {
    title: "Free Finance Tools & Resources — Finance Wars",
    description: "Calculators, guides, and mental models. No signup. No catch.",
  },
};

const TOOLS = [
  {
    href: "/tools/debt-calculator",
    icon: Swords,
    title: "Debt Payoff Calculator",
    desc: "Compare avalanche vs snowball. See how much extra payments save you.",
    tag: "Calculator",
    color: "text-violet-400 bg-violet-500/10",
  },
  {
    href: "/tools/50-30-20",
    icon: PiggyBank,
    title: "50/30/20 Budget Builder",
    desc: "Enter your income. Get your needs, wants, and savings targets instantly.",
    tag: "Calculator",
    color: "text-emerald-400 bg-emerald-500/10",
  },
  {
    href: "/tools/compound-interest",
    icon: TrendingUp,
    title: "Compound Interest Simulator",
    desc: "See what $100/mo becomes in 10, 20, 30 years at different rates.",
    tag: "Calculator",
    color: "text-blue-400 bg-blue-500/10",
  },
  {
    href: "/tools/emergency-fund",
    icon: Shield,
    title: "Emergency Fund Calculator",
    desc: "How many months do you need? Based on your actual expenses and risk profile.",
    tag: "Calculator",
    color: "text-orange-400 bg-orange-500/10",
  },
];

const GUIDES = [
  {
    icon: Swords,
    title: "Avalanche vs Snowball: Which Is Right for You?",
    body: "Avalanche saves you the most money. Snowball gives you the fastest psychological win. Use avalanche if your largest-APR debt is also your most expensive. Use snowball if you've tried and failed before — momentum matters more than math if you quit.",
  },
  {
    icon: Flame,
    title: "The Vice Tax Mental Model",
    body: "You don't fix a leak by staring at it. You fix it by redirecting it. Pick the category you overspend on most, set a 10-20% tax, and route it to a savings goal. You won't notice $3 per DoorDash order. Your goal will.",
  },
  {
    icon: Target,
    title: "The One-Number Budget",
    body: "Forget 47 categories. After fixed costs and savings are auto-transferred, you have one number left. That's your weekly spend. If you can stay under it 4 weeks in a row, you win the month. If not, reduce it by 10% and try again.",
  },
  {
    icon: Lightbulb,
    title: "The 72-Hour Rule",
    body: "Before any non-essential purchase over $100, wait 72 hours. Write it down. If you still want it after 3 days, buy it guilt-free. You'll cancel 60% of them and never miss what you didn't buy.",
  },
  {
    icon: Shield,
    title: "Emergency Fund Tiers",
    body: "Tier 1: $1,000 starter fund (before attacking debt). Tier 2: 1 month of expenses (after highest-APR debt is gone). Tier 3: 3-6 months (after all consumer debt). Don't skip Tier 1 even if your debt feels urgent — one flat tire without it resets everything.",
  },
  {
    icon: Calculator,
    title: "The Real Cost of Minimum Payments",
    body: "A $5,000 credit card at 24% APR with $100 minimum payments takes 9+ years and costs $6,000+ in interest. Doubling the payment to $200 cuts it to 2.5 years and saves $4,000. The calculator above will prove it to you.",
  },
];

export default function LearnPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
      <nav className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl bg-white/60 dark:bg-black/60 border-b border-black/5 dark:border-white/5">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between text-[13px]">
          <Link href="/" className="font-semibold tracking-tight">Finance Wars</Link>
          <div className="hidden sm:flex items-center gap-4 opacity-70">
            <Link href="/mission" className="hover:opacity-100">Mission</Link>
            <Link href="/rules" className="hover:opacity-100">Rules</Link>
            <Link href="/learn" className="opacity-100 font-medium">Learn</Link>
          </div>
          <div className="flex items-center gap-1">
            <Link href="/login" className="btn-ghost">Sign in</Link>
            <Link href="/signup" className="ml-1 px-3 py-1.5 rounded-full bg-black text-white dark:bg-white dark:text-black font-medium hover:scale-[1.03] transition-transform">Get started</Link>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 pt-32 pb-20">
        <Link href="/" className="text-xs opacity-50 hover:opacity-100 inline-flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" />Back home
        </Link>

        <h1 className="mt-6 text-5xl sm:text-6xl font-semibold tracking-[-0.04em] leading-[1.05]">
          Learn. Use.<br />No signup required.
        </h1>
        <p className="mt-6 text-lg text-black/60 dark:text-white/60 leading-relaxed max-w-2xl">
          Free calculators and guides that work right here, right now. No account needed. No email gate.
          Use them, bookmark them, share them. If they help, the app will help more.
        </p>

        {/* --- Tools --- */}
        <section className="mt-16">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 opacity-60" />
            <h2 className="text-2xl font-semibold tracking-tight">Free Tools</h2>
          </div>
          <p className="mt-2 text-sm text-black/50 dark:text-white/50">Interactive calculators. Run them as many times as you want.</p>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {TOOLS.map((t) => {
              const Icon = t.icon;
              return (
                <Link key={t.href} href={t.href} className="card p-5 group hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition">
                  <div className="flex items-start gap-3">
                    <div className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${t.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold group-hover:text-violet-500 transition">{t.title}</h3>
                      </div>
                      <p className="text-sm text-black/55 dark:text-white/55 mt-1">{t.desc}</p>
                      <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-violet-500">
                        Open tool <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* --- Guides --- */}
        <section className="mt-20">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 opacity-60" />
            <h2 className="text-2xl font-semibold tracking-tight">Guides & Mental Models</h2>
          </div>
          <p className="mt-2 text-sm text-black/50 dark:text-white/50">Short reads. No fluff. One idea each.</p>

          <div className="mt-6 space-y-5">
            {GUIDES.map((g) => {
              const Icon = g.icon;
              return (
                <div key={g.title} className="card p-5 flex gap-4">
                  <div className="shrink-0 w-10 h-10 rounded-lg bg-black/5 dark:bg-white/5 flex items-center justify-center">
                    <Icon className="w-5 h-5 opacity-60" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{g.title}</h3>
                    <p className="text-sm text-black/60 dark:text-white/60 mt-1 leading-relaxed">{g.body}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <div className="mt-16 card p-6 bg-violet-500/5 border-violet-500/20">
          <p className="text-lg leading-relaxed">
            These tools give you the math. <strong>Finance Wars gives you the game.</strong> Boss fights, Vice Tax,
            weekly recaps, and achievements that make the math feel like progress.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/signup" className="btn-primary">Start playing <ArrowRight className="w-4 h-4" /></Link>
            <Link href="/mission" className="btn-secondary">Read the mission</Link>
          </div>
        </div>
      </main>

      <footer className="border-t border-black/5 dark:border-white/5 py-10 text-center text-xs opacity-50">
        <div className="flex items-center justify-center gap-5 mb-3">
          <Link href="/mission" className="hover:opacity-100 opacity-70">Mission</Link>
          <Link href="/rules" className="hover:opacity-100 opacity-70">Rules</Link>
          <Link href="/learn" className="hover:opacity-100 opacity-70">Learn</Link>
          <Link href="/login" className="hover:opacity-100 opacity-70">Sign in</Link>
        </div>
        <div className="opacity-60">Finance Wars © {new Date().getFullYear()}</div>
      </footer>
    </div>
  );
}
