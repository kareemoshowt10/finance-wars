import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Swords, Flame, Target, Eye, Trophy, Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "Mission — Finance Wars",
  description:
    "Finance Wars exists to turn personal finance into a game you actually want to play. Confront debt. Tax your vices. Defeat boredom.",
  openGraph: {
    title: "Finance Wars — Our Mission",
    description: "Confront debt. Tax your vices. Make money feel like a game you want to play.",
  },
};

const PILLARS = [
  {
    icon: Eye,
    title: "Make the invisible visible",
    body:
      "Most people lose to debt and lifestyle creep because they can't see them clearly. We surface every dollar of interest, every guilty pleasure, every silent month — so you can act before they cost you a year.",
  },
  {
    icon: Swords,
    title: "Turn debt into a boss fight",
    body:
      "A balance sheet doesn't motivate anyone. A boss with HP, APR, and an ETA does. Every payment is an attack. Every month you stall, the boss heals. The metaphor isn't cute — it's the actual mechanic.",
  },
  {
    icon: Flame,
    title: "Use guilt productively",
    body:
      "We don't tell you to stop ordering takeout. We let you tax it. Every Vice Tax you set redirects a slice of your favorite weakness straight into a goal. The pleasure stays. The leak gets plugged.",
  },
  {
    icon: Trophy,
    title: "Reward the boring work",
    body:
      "Compounding is boring. So we built achievements, streaks, currencies, and weekly recaps that make the boring part feel like progress. Discipline shouldn't have to be its own reward.",
  },
  {
    icon: Target,
    title: "Honesty over optimism",
    body:
      "We'd rather tell you that you neglected a boss for 30 days than show you a smiling avatar. The dashboard exists to confront you, not flatter you. Self-delusion is the enemy of net worth.",
  },
  {
    icon: Sparkles,
    title: "Build for two, not one",
    body:
      "Money is the #1 thing couples fight about. We design for the household: shared goals, allowance, pre-flight approvals on big purchases, and Duels for when competition beats nagging.",
  },
];

export default function MissionPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
      <nav className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl bg-white/60 dark:bg-black/60 border-b border-black/5 dark:border-white/5">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="font-semibold tracking-tight">Finance Wars</Link>
          <div className="flex items-center gap-2 text-sm">
            <Link href="/rules" className="opacity-60 hover:opacity-100">Rules</Link>
            <Link href="/login" className="ml-2 px-3 py-1.5 rounded-full bg-black text-white dark:bg-white dark:text-black text-[13px] font-medium">Sign in</Link>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 pt-32 pb-20">
        <Link href="/" className="text-xs opacity-50 hover:opacity-100 inline-flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" />Back home
        </Link>

        <h1 className="mt-6 text-5xl sm:text-6xl font-semibold tracking-[-0.04em] leading-[1.05]">
          Money should feel like<br />a game you want to play.
        </h1>

        <p className="mt-8 text-lg text-black/60 dark:text-white/60 leading-relaxed">
          Finance Wars exists because the standard personal finance experience is a spreadsheet that
          guilts you into doing nothing. We took the same data — accounts, transactions, debts,
          goals — and rebuilt the surface as a game. <strong className="text-black dark:text-white">The math is identical. The motivation is not.</strong>
        </p>

        <div className="mt-6 text-lg text-black/60 dark:text-white/60 leading-relaxed">
          We believe most people don't have a finance problem. They have a feedback-loop problem.
          So we shortened the loop. Pay a credit card → see the boss bleed. Order DoorDash →
          watch a slice land in your savings. Skip a month → watch the boss heal. You feel the
          consequence the moment you cause it.
        </div>

        <h2 className="mt-16 text-2xl font-semibold tracking-tight">What we believe</h2>

        <div className="mt-6 space-y-5">
          {PILLARS.map((p) => {
            const Icon = p.icon;
            return (
              <div key={p.title} className="card p-5 flex gap-4">
                <div className="shrink-0 w-10 h-10 rounded-lg bg-violet-500/10 text-violet-400 flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold">{p.title}</h3>
                  <p className="text-sm text-black/60 dark:text-white/60 mt-1 leading-relaxed">{p.body}</p>
                </div>
              </div>
            );
          })}
        </div>

        <h2 className="mt-16 text-2xl font-semibold tracking-tight">Who this is for</h2>
        <ul className="mt-4 space-y-2 text-black/70 dark:text-white/70">
          <li>• People who know what they should do and don't do it.</li>
          <li>• Couples who fight about money and want a referee, not a lecture.</li>
          <li>• Anyone carrying debt they keep meaning to "really focus on next month."</li>
          <li>• Spreadsheet people who want their spreadsheet to fight back.</li>
        </ul>

        <h2 className="mt-16 text-2xl font-semibold tracking-tight">Who this isn't for</h2>
        <ul className="mt-4 space-y-2 text-black/70 dark:text-white/70">
          <li>• People who want a tracker that congratulates them for opening it.</li>
          <li>• Anyone looking for tax advice, investment picks, or a CFP.</li>
          <li>• People who don't want their behavior surfaced and named.</li>
        </ul>

        <div className="mt-16 card p-6 bg-violet-500/5 border-violet-500/20">
          <div className="text-sm uppercase tracking-wider opacity-60">The pact</div>
          <p className="mt-3 text-lg leading-relaxed">
            We won't sell your data. We won't hide fees. We won't dark-pattern you into upgrades.
            In exchange, you show up — even when the boss is winning. Especially then.
          </p>
        </div>

        <div className="mt-12 flex flex-wrap gap-3">
          <Link href="/signup" className="btn-primary">Start playing <ArrowRight className="w-4 h-4" /></Link>
          <Link href="/rules" className="btn-secondary">Read the rules</Link>
        </div>
      </main>

      <footer className="border-t border-black/5 dark:border-white/5 py-10 text-center text-xs opacity-40">
        Finance Wars © {new Date().getFullYear()}
      </footer>
    </div>
  );
}
