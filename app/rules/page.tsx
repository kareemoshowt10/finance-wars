import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { FamilyNav, FamilyFooter } from "@/app/_family/FamilyShell";
import FamilyThemeBoundary from "@/app/_family/FamilyThemeBoundary";
import { BlobYellow, BlobGreen, Star } from "@/app/_family/Characters";

export const metadata: Metadata = {
  title: "Rules — Finance Wars",
  description: "The seven rules that govern Finance Wars. Simple. Non-negotiable. Read them before you play.",
};

const RULES = [
  { n: "01", title: "Every dollar gets a job.",
    body: "If a dollar isn't assigned to a goal, a boss, or a category, it's just drift. Drift is how lifestyle creep wins. Categorize every transaction. Set a goal for what's left over." },
  { n: "02", title: "Debts are bosses. Treat them like fights.",
    body: "Set the APR. Pick a strategy. Land an attack every month or the boss heals via interest accrual. Neglect is a tactical loss — we will tell you when it happens." },
  { n: "03", title: "Tax the things you can't quit.",
    body: "You're not going to stop ordering coffee. Fine. Add a Vice Tax: every matching expense routes a slice into a goal. Guilt becomes gas." },
  { n: "04", title: "Show up weekly. Always read the recap.",
    body: "Every Monday a Weekly Recap lands. It's the single most important document you'll receive. Read it. Even when the numbers are ugly. Especially then." },
  { n: "05", title: "If you share money, you share the dashboard.",
    body: "Couples accounts are first-class. Big purchases trigger pre-flight approvals. Allowances are tracked. Money fights happen in the dark — keep the lights on." },
  { n: "06", title: "Streaks beat heroics.",
    body: "A 12-month streak of $50 attacks beats one heroic $500 month followed by silence. The compound math doesn't care how you feel about it. Show up." },
  { n: "07", title: "Honesty is the entry fee.",
    body: "Don't log the meal as 'groceries.' Don't hide the credit card. Don't fake the streak. The dashboard only works if you do. Lie to it, lose to it." },
];

export default function RulesPage() {
  return (
    <div className="min-h-screen">
      <FamilyThemeBoundary />
      <FamilyNav active="rules" />

      <main className="max-w-[820px] mx-auto px-6 pt-16 pb-16 relative">
        <div className="absolute -top-2 -right-10 hidden md:block"><BlobYellow size={84} className="family-character" style={{ ["--rot" as string]: "12deg" } as React.CSSProperties} /></div>
        <div className="absolute top-40 -left-14 hidden md:block"><BlobGreen size={80} className="family-character" style={{ ["--rot" as string]: "-8deg", ["--delay" as string]: "0.6s" } as React.CSSProperties} /></div>
        <div className="absolute top-96 right-6 hidden md:block"><Star size={36} /></div>

        <Link href="/" className="family-link text-[13px]"><ArrowLeft className="w-3 h-3" />Back home</Link>

        <h1 className="family-display family-pop mt-6">The Rules.</h1>
        <p className="family-body mt-6">
          Seven rules. Non-negotiable. If you can't agree to these, the app won't help you. If you can,
          you'll be debt-free faster than you think.
        </p>

        <div className="mt-14 space-y-7">
          {RULES.map((r) => (
            <div key={r.n} className="flex gap-6">
              <div className="shrink-0 w-14 font-semibold tabular-nums text-[#ff3e00] leading-none pt-2" style={{ fontSize: 36 }}>
                {r.n}
              </div>
              <div className="border-l-2 border-[#f2f0ed] pl-6 pb-1">
                <h2 className="family-heading text-[#121212]">{r.title}</h2>
                <p className="family-body mt-3">{r.body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 family-card" style={{ background: "#121212", color: "#fff", boxShadow: "var(--shadow-lg)" }}>
          <div className="text-[#ff3e00] text-[13px] font-medium tracking-[0.04em] uppercase">The deal</div>
          <p className="mt-3 text-[17px] leading-[1.5] tracking-[-0.013em]">
            We're not your bank. We're not your accountant. We're the rules of the game. Follow them
            and the game gets easier. Break them and the game gets harder. That's it.
          </p>
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/signup" className="family-btn-dark">Agree and start <ArrowRight className="w-4 h-4" /></Link>
          <Link href="/mission" className="family-btn-light">Read the mission</Link>
        </div>
      </main>

      <FamilyFooter />
    </div>
  );
}
