"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight, BarChart3, Target, Wallet, ShieldCheck, TrendingUp, PieChart,
  Swords, User, Trophy, Sparkles, Bot,
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 80, damping: 18 } },
};

const tags = [
  "Net Worth", "Groceries", "Salary", "Investments", "Rent", "Travel",
  "Subscriptions", "Coffee", "Bonus", "Savings Goal", "Emergency Fund", "Dining",
  "Transport", "Health", "Side Hustle", "Duels", "Sprints",
];

export default function LandingPageClient() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <nav className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl bg-white/60 dark:bg-black/60 border-b border-black/5 dark:border-white/5">
        <div className="mx-auto max-w-7xl px-6 h-12 flex items-center justify-between text-[13px]">
          <Link href="/" className="font-semibold tracking-tight">Finance Wars</Link>
          <div className="flex items-center gap-1">
            <Link href="/login" className="btn-ghost">Sign in</Link>
            <Link href="/signup" className="ml-1 px-3 py-1.5 rounded-full bg-black text-white dark:bg-white dark:text-black text-[13px] font-medium hover:scale-[1.03] transition-transform">Get started</Link>
          </div>
        </div>
      </nav>

      <section className="relative pt-44 pb-24 px-6">
        <div className="absolute inset-0 hero-grid pointer-events-none" />
        <motion.div
          className="absolute top-10 left-1/2 -translate-x-1/2 w-[900px] h-[900px] glow-radial pointer-events-none"
          animate={{ y: [0, 30, 0], opacity: [0.55, 0.85, 0.55] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="relative mx-auto max-w-5xl text-center">
          <motion.p initial="hidden" animate="show" variants={fadeUp} className="text-xs uppercase tracking-[0.3em] opacity-50 mb-6">Personal finance, reimagined</motion.p>
          <motion.h1 initial="hidden" animate="show" variants={fadeUp} transition={{ delay: 0.05 }} className="text-6xl md:text-8xl font-semibold tracking-[-0.04em] leading-[0.95]">
            Take command<br />of your money.
          </motion.h1>
          <motion.p initial="hidden" animate="show" variants={fadeUp} transition={{ delay: 0.15 }} className="mt-8 max-w-2xl mx-auto text-lg md:text-xl opacity-60 leading-relaxed">
            Track. Save. Compete with your partner. Net worth, budgets, goals — plus head-to-head Duels in one calm dashboard.
          </motion.p>
          <motion.div initial="hidden" animate="show" variants={fadeUp} transition={{ delay: 0.25 }} className="mt-10 flex items-center justify-center gap-3">
            <Link href="/signup" className="btn-primary">Get started <ArrowRight className="w-4 h-4" /></Link>
            <Link href="/login" className="btn-secondary">Sign in</Link>
          </motion.div>
        </div>

        <div className="relative mt-16 overflow-hidden">
          <div className="flex gap-3 animate-[marquee_30s_linear_infinite]" style={{ width: "max-content" }}>
            {[...tags, ...tags].map((t, i) => (
              <span key={i} className="px-3 py-1.5 rounded-full text-xs border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] whitespace-nowrap">
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="relative py-32 px-6">
        <div className="mx-auto max-w-6xl">
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ type: "spring", stiffness: 80, damping: 18 }} className="text-4xl md:text-6xl font-semibold tracking-[-0.04em] max-w-3xl">
            Everything you need.<br /><span className="opacity-40">Nothing you don&apos;t.</span>
          </motion.h2>
          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Wallet, title: "Accounts", body: "Track every checking, savings, credit, and investment account in one ledger." },
              { icon: BarChart3, title: "Insights", body: "See where money goes with auto-categorized spending and gorgeous charts." },
              { icon: Target, title: "Budgets", body: "Set monthly limits per category. Stay on track with live progress bars." },
              { icon: TrendingUp, title: "Goals", body: "Save for what matters. Visual progress rings keep you motivated." },
            ].map((f, i) => (
              <motion.div key={f.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ type: "spring", stiffness: 80, damping: 18, delay: i * 0.05 }} className="card p-6">
                <f.icon className="w-6 h-6 opacity-80" />
                <div className="mt-6 font-semibold">{f.title}</div>
                <div className="mt-2 text-sm opacity-55 leading-relaxed">{f.body}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Duel section */}
      <section className="relative py-32 px-6">
        <div className="mx-auto max-w-6xl">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="max-w-3xl">
            <div className="text-xs uppercase tracking-[0.3em] opacity-50 mb-4 flex items-center gap-2"><Swords className="w-3 h-3" />The Duel</div>
            <h2 className="text-4xl md:text-6xl font-semibold tracking-[-0.04em]">Beat the slump together.</h2>
            <p className="mt-5 opacity-60 text-lg leading-relaxed">Sprint head-to-head. Save more. Roast each other.</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ type: "spring", stiffness: 60, damping: 20 }} className="mt-10">
            <div className="card p-8 md:p-12 relative overflow-hidden bg-gradient-to-br from-indigo-500/10 via-transparent to-fuchsia-500/10">
              <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full bg-fuchsia-500/20 blur-3xl" />
              <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full bg-indigo-500/20 blur-3xl" />

              <div className="relative grid md:grid-cols-3 items-center gap-8">
                <div className="text-center md:text-left">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center mx-auto md:mx-0 ring-4 ring-indigo-500/30">
                    <User className="w-10 h-10 text-white" />
                  </div>
                  <div className="mt-3 font-semibold">You</div>
                  <div className="text-3xl font-semibold tabular-nums mt-1">427</div>
                  <div className="text-xs opacity-50">points</div>
                </div>

                <div className="text-center">
                  <Swords className="w-8 h-8 mx-auto opacity-50" />
                  <div className="mt-3 text-xs uppercase tracking-[0.3em] opacity-60">Hawaii Sprint</div>
                  <div className="mt-2 h-3 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden max-w-xs mx-auto">
                    <div className="h-full bg-gradient-to-r from-indigo-500 to-fuchsia-500" style={{ width: "62%" }} />
                  </div>
                  <div className="mt-2 text-xs opacity-50">3 days remaining</div>
                </div>

                <div className="text-center md:text-right">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-fuchsia-500 to-rose-500 flex items-center justify-center mx-auto md:ml-auto md:mr-0 ring-4 ring-fuchsia-500/30">
                    <User className="w-10 h-10 text-white" />
                  </div>
                  <div className="mt-3 font-semibold">Partner</div>
                  <div className="text-3xl font-semibold tabular-nums mt-1">385</div>
                  <div className="text-xs opacity-50">points</div>
                </div>
              </div>

              <div className="relative mt-10 grid md:grid-cols-3 gap-4">
                {[
                  { icon: Trophy, title: "Pick a stake", body: "Loser plans the next trip — or auto-transfers a wager." },
                  { icon: Sparkles, title: "Daily contributions", body: "Each save earns points. Streaks and themes multiply rewards." },
                  { icon: Bot, title: "Or spar solo", body: "Practice mode against a smart bot, no partner required." },
                ].map((f) => (
                  <div key={f.title} className="card p-5 bg-white/40 dark:bg-black/40">
                    <f.icon className="w-5 h-5" />
                    <div className="mt-3 font-medium text-sm">{f.title}</div>
                    <div className="text-xs opacity-60 mt-1">{f.body}</div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Built for couples */}
      <section className="relative py-20 px-6">
        <div className="mx-auto max-w-6xl">
          <div className="text-xs uppercase tracking-[0.3em] opacity-50 mb-3 text-center">Built for couples</div>
          <h3 className="text-center text-3xl md:text-5xl font-semibold tracking-[-0.03em] max-w-3xl mx-auto">A transparency layer for two.</h3>
          <p className="text-center mt-4 opacity-60 max-w-xl mx-auto">
            40% of partners hide spending. Finance Wars makes that impossible — gently.
          </p>
          <div className="mt-10 grid grid-cols-1 md:grid-cols-4 gap-3">
            {[
              { title: "Pact", body: "Co-author thresholds and allowances. Both sign." },
              { title: "Money Date", body: "Weekly 30-min review with an auto-built agenda." },
              { title: "Pre-flight", body: "Big purchases pause for a quick partner check." },
              { title: "Allowance", body: "Personal spending lanes. No questions asked." },
            ].map((m) => (
              <div key={m.title} className="card p-5">
                <div className="font-semibold text-sm">{m.title}</div>
                <div className="mt-1 text-xs opacity-55">{m.body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative py-32 px-6">
        <div className="mx-auto max-w-6xl grid md:grid-cols-2 gap-12 items-center">
          <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ type: "spring", stiffness: 60, damping: 20 }}>
            <PieChart className="w-7 h-7 opacity-70 mb-4" />
            <h3 className="text-4xl md:text-5xl font-semibold tracking-[-0.03em]">Designed for clarity.</h3>
            <p className="mt-5 opacity-60 text-lg leading-relaxed">A calm canvas. Big numbers. Quiet typography. Finance Wars puts the signal first, so you spend less time managing money and more time using it.</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ type: "spring", stiffness: 60, damping: 20 }} className="card p-8">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs opacity-50">Emergency Fund</div>
                <div className="mt-2 text-4xl font-semibold tracking-tight">$9,200</div>
                <div className="text-xs opacity-40">of $15,000 target</div>
              </div>
              <div className="relative w-24 h-24">
                <svg viewBox="0 0 40 40" className="w-full h-full -rotate-90">
                  <circle cx="20" cy="20" r="16" stroke="currentColor" strokeOpacity="0.1" strokeWidth="3" fill="none" />
                  <circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray={`${(9200/15000)*100} 100`} strokeLinecap="round" pathLength={100} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-sm">{Math.round(9200/15000*100)}%</div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="relative py-40 px-6">
        <div className="absolute inset-0 glow-radial pointer-events-none opacity-60" />
        <div className="relative mx-auto max-w-4xl text-center">
          <ShieldCheck className="w-8 h-8 mx-auto opacity-60" />
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ type: "spring", stiffness: 80, damping: 18 }} className="mt-6 text-5xl md:text-7xl font-semibold tracking-[-0.04em]">
            Your money.<br />Beautifully in view.
          </motion.h2>
          <p className="mt-6 opacity-60 text-lg">Free to try. Set up your dashboard in under a minute.</p>
          <div className="mt-10 flex justify-center gap-3">
            <Link href="/signup" className="btn-primary">Create your account <ArrowRight className="w-4 h-4" /></Link>
            <Link href="/login" className="btn-secondary">Sign in</Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-black/5 dark:border-white/5 py-10 text-center text-xs opacity-40">
        Finance Wars © {new Date().getFullYear()}
      </footer>
    </div>
  );
}
