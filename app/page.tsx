"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight, BarChart3, Target, Wallet, ShieldCheck, TrendingUp, PieChart,
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 80, damping: 18 } },
};

const tags = [
  "Net Worth", "Groceries", "Salary", "Investments", "Rent", "Travel",
  "Subscriptions", "Coffee", "Bonus", "Savings Goal", "Emergency Fund", "Dining",
  "Transport", "Health", "Side Hustle",
];

export default function LandingPage() {
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
            Net worth, spending, budgets, and goals — all in one calm, premium dashboard.
            Built for the way you think about money.
          </motion.p>
          <motion.div initial="hidden" animate="show" variants={fadeUp} transition={{ delay: 0.25 }} className="mt-10 flex items-center justify-center gap-3">
            <Link href="/signup" className="btn-primary">Get started <ArrowRight className="w-4 h-4" /></Link>
            <Link href="/login" className="btn-secondary">Sign in</Link>
          </motion.div>
        </div>

        {/* Marquee */}
        <div className="relative mt-16 overflow-hidden">
          <div className="flex gap-3 animate-[marquee_30s_linear_infinite]" style={{ width: "max-content" }}>
            {[...tags, ...tags].map((t, i) => (
              <span key={i} className="px-3 py-1.5 rounded-full text-xs border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] whitespace-nowrap">
                {t}
              </span>
            ))}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ type: "spring", stiffness: 60, damping: 20 }}
          className="relative mx-auto mt-20 max-w-6xl"
        >
          <div className="card p-6 md:p-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { label: "Net Worth", value: "$64,341", delta: "+4.2%" },
                { label: "This Month Income", value: "$8,420", delta: "+12%" },
                { label: "This Month Spend", value: "$3,118", delta: "-6%" },
                { label: "Savings Rate", value: "63%", delta: "+8%" },
              ].map((s) => (
                <div key={s.label} className="card p-5">
                  <div className="text-xs opacity-50">{s.label}</div>
                  <div className="mt-2 text-3xl font-semibold tracking-tight">{s.value}</div>
                  <div className="mt-1 text-xs text-emerald-500">{s.delta}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="card p-5 md:col-span-2 h-56 flex items-end gap-2">
                {[40, 55, 48, 70, 62, 80, 75, 92, 88, 96, 84, 100].map((h, i) => (
                  <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-indigo-500/30 to-purple-500/80" style={{ height: `${h}%` }} />
                ))}
              </div>
              <div className="card p-5 h-56">
                <div className="text-xs opacity-50 mb-3">Top categories</div>
                <div className="space-y-3">
                  {[["Groceries", 64], ["Dining", 48], ["Transport", 32], ["Shopping", 21]].map(([k, v]) => (
                    <div key={k as string}>
                      <div className="flex justify-between text-[11px] opacity-60 mb-1">
                        <span>{k}</span><span>{v}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                        <div className="h-full bg-black dark:bg-white" style={{ width: `${v}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
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
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ type: "spring", stiffness: 80, damping: 18, delay: i * 0.05 }}
                className="card p-6"
              >
                <f.icon className="w-6 h-6 opacity-80" />
                <div className="mt-6 font-semibold">{f.title}</div>
                <div className="mt-2 text-sm opacity-55 leading-relaxed">{f.body}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative py-32 px-6">
        <div className="mx-auto max-w-6xl grid md:grid-cols-2 gap-12 items-center">
          <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ type: "spring", stiffness: 60, damping: 20 }}>
            <PieChart className="w-7 h-7 opacity-70 mb-4" />
            <h3 className="text-4xl md:text-5xl font-semibold tracking-[-0.03em]">Designed for clarity.</h3>
            <p className="mt-5 opacity-60 text-lg leading-relaxed">
              A calm canvas. Big numbers. Quiet typography. Finance Wars puts the signal first, so
              you spend less time managing money and more time using it.
            </p>
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
