import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Rules — Finance Wars",
  description:
    "The seven rules that govern Finance Wars. Simple. Non-negotiable. Read them before you play.",
};

const RULES: { n: string; title: string; body: string }[] = [
  {
    n: "01",
    title: "Every dollar gets a job.",
    body:
      "If a dollar isn't assigned to a goal, a boss, or a category, it's just drift. Drift is how lifestyle creep wins. Categorize every transaction. Set a goal for what's left over.",
  },
  {
    n: "02",
    title: "Debts are bosses. Treat them like fights.",
    body:
      "Set the APR. Pick a strategy. Land an attack every month or the boss heals via interest accrual. Neglect is a tactical loss — we will tell you when it happens.",
  },
  {
    n: "03",
    title: "Tax the things you can't quit.",
    body:
      "You're not going to stop ordering coffee. Fine. Add a Vice Tax: every matching expense routes a slice into a goal. Guilt becomes gas.",
  },
  {
    n: "04",
    title: "Show up weekly. Always read the recap.",
    body:
      "Every Monday a Weekly Recap lands. It's the single most important document you'll receive. Read it. Even when the numbers are ugly. Especially then.",
  },
  {
    n: "05",
    title: "If you share money, you share the dashboard.",
    body:
      "Couples accounts are first-class. Big purchases trigger pre-flight approvals. Allowances are tracked. Money fights happen in the dark — keep the lights on.",
  },
  {
    n: "06",
    title: "Streaks beat heroics.",
    body:
      "A 12-month streak of $50 attacks beats one heroic $500 month followed by silence. The compound math doesn't care how you feel about it. Show up.",
  },
  {
    n: "07",
    title: "Honesty is the entry fee.",
    body:
      "Don't log the meal as 'groceries.' Don't hide the credit card. Don't fake the streak. The dashboard only works if you do. Lie to it, lose to it.",
  },
];

export default function RulesPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
      <nav className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl bg-white/60 dark:bg-black/60 border-b border-black/5 dark:border-white/5">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="font-semibold tracking-tight">Finance Wars</Link>
          <div className="flex items-center gap-2 text-sm">
            <Link href="/mission" className="opacity-60 hover:opacity-100">Mission</Link>
            <Link href="/login" className="ml-2 px-3 py-1.5 rounded-full bg-black text-white dark:bg-white dark:text-black text-[13px] font-medium">Sign in</Link>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 pt-32 pb-20">
        <Link href="/" className="text-xs opacity-50 hover:opacity-100 inline-flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" />Back home
        </Link>

        <h1 className="mt-6 text-5xl sm:text-6xl font-semibold tracking-[-0.04em] leading-[1.05]">
          The Rules.
        </h1>
        <p className="mt-6 text-lg text-black/60 dark:text-white/60 leading-relaxed">
          Seven rules. Non-negotiable. If you can't agree to these, the app won't help you. If you can,
          you'll be debt-free faster than you think.
        </p>

        <div className="mt-12 space-y-8">
          {RULES.map((r) => (
            <div key={r.n} className="flex gap-5">
              <div className="shrink-0 w-12 text-3xl font-semibold tabular-nums text-violet-400 leading-none pt-1">
                {r.n}
              </div>
              <div className="border-l border-black/10 dark:border-white/10 pl-5">
                <h2 className="text-xl font-semibold tracking-tight">{r.title}</h2>
                <p className="mt-2 text-black/65 dark:text-white/65 leading-relaxed">{r.body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 card p-6 bg-black text-white dark:bg-white dark:text-black">
          <div className="text-sm uppercase tracking-wider opacity-60">The deal</div>
          <p className="mt-3 text-lg leading-relaxed">
            We're not your bank. We're not your accountant. We're the rules of the game. Follow them
            and the game gets easier. Break them and the game gets harder. That's it.
          </p>
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/signup" className="btn-primary">Agree and start <ArrowRight className="w-4 h-4" /></Link>
          <Link href="/mission" className="btn-secondary">Read the mission</Link>
        </div>
      </main>

      <footer className="border-t border-black/5 dark:border-white/5 py-10 text-center text-xs opacity-40">
        Finance Wars © {new Date().getFullYear()}
      </footer>
    </div>
  );
}
