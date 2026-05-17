"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import {
  ArrowRight, BarChart3, Target, Wallet, ShieldCheck, TrendingUp, PieChart,
} from "lucide-react";

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const els = root.querySelectorAll<HTMLElement>(".reveal");
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("visible");
            obs.unobserve(e.target);
          }
        }
      },
      { threshold: 0.12 }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);
  return ref;
}

export default function LandingPage() {
  const ref = useReveal();

  return (
    <div ref={ref} className="min-h-screen bg-black text-white overflow-x-hidden">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl bg-black/60 border-b border-white/5">
        <div className="mx-auto max-w-7xl px-6 h-12 flex items-center justify-between text-[13px]">
          <Link href="/" className="font-semibold tracking-tight">Finance Wars</Link>
          <div className="flex items-center gap-1">
            <Link href="/login" className="btn-ghost">Sign in</Link>
            <Link href="/signup" className="ml-1 px-3 py-1.5 rounded-full bg-white text-black text-[13px] font-medium hover:scale-[1.03] transition-transform">Get started</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-44 pb-32 px-6">
        <div className="absolute inset-0 hero-grid pointer-events-none" />
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[900px] h-[900px] glow-radial pointer-events-none animate-glow" />
        <div className="relative mx-auto max-w-5xl text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-white/50 mb-6 reveal">Personal finance, reimagined</p>
          <h1 className="text-6xl md:text-8xl font-semibold tracking-[-0.04em] leading-[0.95] reveal">
            Take command<br />of your money.
          </h1>
          <p className="mt-8 max-w-2xl mx-auto text-lg md:text-xl text-white/60 leading-relaxed reveal">
            Net worth, spending, budgets, and goals — all in one calm, premium dashboard.
            Built for the way you think about money.
          </p>
          <div className="mt-10 flex items-center justify-center gap-3 reveal">
            <Link href="/signup" className="btn-primary">
              Get started <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/login" className="btn-secondary">Sign in</Link>
          </div>
        </div>

        {/* Product mock */}
        <div className="relative mx-auto mt-24 max-w-6xl reveal">
          <div className="card p-6 md:p-8 bg-gradient-to-b from-white/[0.04] to-transparent">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { label: "Net Worth", value: "$64,341", delta: "+4.2%" },
                { label: "This Month Income", value: "$8,420", delta: "+12%" },
                { label: "This Month Spend", value: "$3,118", delta: "-6%" },
                { label: "Savings Rate", value: "63%", delta: "+8%" },
              ].map((s) => (
                <div key={s.label} className="card p-5">
                  <div className="text-xs text-white/50">{s.label}</div>
                  <div className="mt-2 text-3xl font-semibold tracking-tight">{s.value}</div>
                  <div className="mt-1 text-xs text-emerald-400">{s.delta}</div>
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
                <div className="text-xs text-white/50 mb-3">Top categories</div>
                <div className="space-y-3">
                  {[
                    ["Groceries", 64],
                    ["Dining", 48],
                    ["Transport", 32],
                    ["Shopping", 21],
                  ].map(([k, v]) => (
                    <div key={k as string}>
                      <div className="flex justify-between text-[11px] text-white/60 mb-1">
                        <span>{k}</span><span>{v}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full bg-white" style={{ width: `${v}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative py-32 px-6">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-4xl md:text-6xl font-semibold tracking-[-0.04em] max-w-3xl reveal">
            Everything you need.<br /><span className="text-white/40">Nothing you don&apos;t.</span>
          </h2>
          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Wallet, title: "Accounts", body: "Track every checking, savings, credit, and investment account in one ledger." },
              { icon: BarChart3, title: "Insights", body: "See where money goes with auto-categorized spending and gorgeous charts." },
              { icon: Target, title: "Budgets", body: "Set monthly limits per category. Stay on track with live progress bars." },
              { icon: TrendingUp, title: "Goals", body: "Save for what matters. Visual progress rings keep you motivated." },
            ].map((f) => (
              <div key={f.title} className="card p-6 reveal">
                <f.icon className="w-6 h-6 text-white/80" />
                <div className="mt-6 font-semibold">{f.title}</div>
                <div className="mt-2 text-sm text-white/55 leading-relaxed">{f.body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Secondary */}
      <section className="relative py-32 px-6">
        <div className="mx-auto max-w-6xl grid md:grid-cols-2 gap-12 items-center">
          <div className="reveal">
            <PieChart className="w-7 h-7 text-white/70 mb-4" />
            <h3 className="text-4xl md:text-5xl font-semibold tracking-[-0.03em]">Designed for clarity.</h3>
            <p className="mt-5 text-white/60 text-lg leading-relaxed">
              A black canvas. Big numbers. Quiet typography. Finance Wars puts the signal first, so
              you spend less time managing money and more time using it.
            </p>
          </div>
          <div className="card p-8 reveal">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-white/50">Emergency Fund</div>
                <div className="mt-2 text-4xl font-semibold tracking-tight">$9,200</div>
                <div className="text-xs text-white/40">of $15,000 target</div>
              </div>
              <div className="relative w-24 h-24">
                <svg viewBox="0 0 40 40" className="w-full h-full -rotate-90">
                  <circle cx="20" cy="20" r="16" stroke="rgba(255,255,255,0.1)" strokeWidth="3" fill="none" />
                  <circle cx="20" cy="20" r="16" stroke="white" strokeWidth="3" fill="none"
                    strokeDasharray={`${(9200/15000)*100} 100`} strokeLinecap="round"
                    pathLength={100} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-sm">{Math.round(9200/15000*100)}%</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-40 px-6">
        <div className="absolute inset-0 glow-radial pointer-events-none opacity-60" />
        <div className="relative mx-auto max-w-4xl text-center">
          <ShieldCheck className="w-8 h-8 mx-auto text-white/60 reveal" />
          <h2 className="mt-6 text-5xl md:text-7xl font-semibold tracking-[-0.04em] reveal">
            Your money.<br />Beautifully in view.
          </h2>
          <p className="mt-6 text-white/60 text-lg reveal">Free to try. Set up your dashboard in under a minute.</p>
          <div className="mt-10 flex justify-center gap-3 reveal">
            <Link href="/signup" className="btn-primary">Create your account <ArrowRight className="w-4 h-4" /></Link>
            <Link href="/login" className="btn-secondary">Sign in</Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/5 py-10 text-center text-xs text-white/40">
        Finance Wars  © {new Date().getFullYear()}
      </footer>
    </div>
  );
}
