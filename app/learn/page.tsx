import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpen, Calculator } from "lucide-react";
import { FamilyNav, FamilyFooter } from "@/app/_family/FamilyShell";
import FamilyThemeBoundary from "@/app/_family/FamilyThemeBoundary";
import {
  BlobOrange, BlobGreen, BlobBlue, BlobYellow,
  CoinStack, Star, ShieldVault, SwordIcon, Heart, Sparkle,
} from "@/app/_family/Characters";

export const metadata: Metadata = {
  title: "Learn & Free Tools — Finance Wars",
  description: "Free financial calculators, guides, and resources. Debt payoff calculator, 50/30/20 budgeter, compound interest simulator, and more. No signup required.",
  openGraph: {
    title: "Free Finance Tools & Resources — Finance Wars",
    description: "Calculators, guides, and mental models. No signup. No catch.",
  },
};

const TOOLS = [
  { href: "/tools/debt-calculator", icon: <SwordIcon size={56} />, title: "Debt Payoff Calculator", desc: "Compare avalanche vs snowball. See how much extra payments save you." },
  { href: "/tools/50-30-20", icon: <CoinStack size={56} />, title: "50/30/20 Budget Builder", desc: "Enter your income. Get your needs, wants, and savings targets instantly." },
  { href: "/tools/compound-interest", icon: <Star size={56} color="#0090ff" />, title: "Compound Interest Simulator", desc: "See what $100/mo becomes in 10, 20, 30 years at different rates." },
  { href: "/tools/emergency-fund", icon: <ShieldVault size={56} />, title: "Emergency Fund Calculator", desc: "How many months do you need? Based on your actual expenses and risk profile." },
];

const GUIDES = [
  { color: "#ff3e00", title: "Avalanche vs Snowball: Which Is Right for You?", body: "Avalanche saves you the most money. Snowball gives you the fastest psychological win. Use avalanche if your largest-APR debt is also your most expensive. Use snowball if you've tried and failed before — momentum matters more than math if you quit." },
  { color: "#ffbb26", title: "The Vice Tax Mental Model", body: "You don't fix a leak by staring at it. You fix it by redirecting it. Pick the category you overspend on most, set a 10-20% tax, and route it to a savings goal. You won't notice $3 per DoorDash order. Your goal will." },
  { color: "#00ca48", title: "The One-Number Budget", body: "Forget 47 categories. After fixed costs and savings are auto-transferred, you have one number left. That's your weekly spend. If you can stay under it 4 weeks in a row, you win the month. If not, reduce it by 10% and try again." },
  { color: "#0090ff", title: "The 72-Hour Rule", body: "Before any non-essential purchase over $100, wait 72 hours. Write it down. If you still want it after 3 days, buy it guilt-free. You'll cancel 60% of them and never miss what you didn't buy." },
  { color: "#9f4fff", title: "Emergency Fund Tiers", body: "Tier 1: $1,000 starter fund (before attacking debt). Tier 2: 1 month of expenses (after highest-APR debt is gone). Tier 3: 3-6 months (after all consumer debt). Don't skip Tier 1 even if your debt feels urgent — one flat tire without it resets everything." },
  { color: "#ff58ae", title: "The Real Cost of Minimum Payments", body: "A $5,000 credit card at 24% APR with $100 minimum payments takes 9+ years and costs $6,000+ in interest. Doubling the payment to $200 cuts it to 2.5 years and saves $4,000. The calculator above will prove it to you." },
];

export default function LearnPage() {
  return (
    <div className="min-h-screen">
      <FamilyThemeBoundary />
      <FamilyNav active="learn" />

      <main className="max-w-[1200px] mx-auto px-6 pt-16 pb-16">
        <Link href="/" className="family-link text-[13px]"><ArrowLeft className="w-3 h-3" />Back home</Link>

        <header className="relative pt-4 pb-12 max-w-3xl">
          <div className="absolute -top-6 right-0 hidden md:flex gap-6 items-center">
            <BlobOrange size={72} className="family-character" style={{ ["--rot" as string]: "-6deg" } as React.CSSProperties} />
            <BlobBlue size={68} className="family-character" style={{ ["--rot" as string]: "8deg", ["--delay" as string]: "0.6s" } as React.CSSProperties} />
            <BlobYellow size={64} className="family-character" style={{ ["--rot" as string]: "-10deg", ["--delay" as string]: "1.2s" } as React.CSSProperties} />
          </div>
          <h1 className="family-display family-pop">Learn. Use.<br />No signup.</h1>
          <p className="family-body mt-6 max-w-xl">
            Free calculators and guides that work right here, right now. No account needed. No email gate.
            Use them, bookmark them, share them. If they help, the app will help more.
          </p>
        </header>

        {/* Tools grid */}
        <section className="mt-10">
          <div className="flex items-center gap-2 mb-2">
            <Calculator className="w-5 h-5 text-[#ff3e00]" />
            <h2 className="family-heading text-[#121212]">Free Tools</h2>
          </div>
          <p className="family-body-sm text-[#848281] mb-6">Interactive calculators. Run them as many times as you want.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {TOOLS.map((t) => (
              <Link key={t.href} href={t.href} className="family-card family-card-hover flex gap-5 group">
                <div className="shrink-0">{t.icon}</div>
                <div>
                  <h3 className="family-heading-sm text-[#121212] group-hover:text-[#ff3e00] transition">{t.title}</h3>
                  <p className="family-body-sm mt-2">{t.desc}</p>
                  <span className="family-link mt-3 text-[13px]">Open tool <ArrowRight className="w-3 h-3" /></span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Guides */}
        <section className="mt-20">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="w-5 h-5 text-[#0090ff]" />
            <h2 className="family-heading text-[#121212]">Guides & Mental Models</h2>
          </div>
          <p className="family-body-sm text-[#848281] mb-6">Short reads. No fluff. One idea each.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {GUIDES.map((g) => (
              <div key={g.title} className="family-card relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full" style={{ background: g.color }} />
                <h3 className="family-heading-sm text-[#121212]">{g.title}</h3>
                <p className="family-body-sm mt-2">{g.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Final CTA card */}
        <section className="mt-20 family-card relative overflow-hidden" style={{ background: "linear-gradient(135deg, #fff8f5 0%, #fffaee 100%)" }}>
          <div className="absolute -bottom-4 -right-4 hidden md:block opacity-90"><Heart size={60} /></div>
          <Sparkle size={22} className="absolute top-6 right-12" color="#ff3e00" />
          <p className="family-body max-w-xl">
            These tools give you the math. <strong style={{ color: "#121212" }}>Finance Wars gives you the game.</strong> Boss fights, Vice Tax, weekly recaps, and achievements that make the math feel like progress.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/signup" className="family-btn-dark">Start playing <ArrowRight className="w-4 h-4" /></Link>
            <Link href="/mission" className="family-btn-light">Read the mission</Link>
          </div>
        </section>
      </main>

      <FamilyFooter />
    </div>
  );
}
