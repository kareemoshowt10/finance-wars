"use client";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import {
  BlobOrange, BlobGreen, BlobBlue, BlobYellow,
  CoinStack, Star, Heart, ShieldVault, SwordIcon, Sparkle,
} from "@/app/_family/Characters";
import { FamilyNav, FamilyFooter } from "@/app/_family/FamilyShell";
import { useEffect } from "react";

export default function LandingPageClient() {
  // Apply Family theme to body for this route.
  useEffect(() => {
    document.body.classList.add("family-theme");
    document.documentElement.classList.remove("dark");
    return () => {
      document.body.classList.remove("family-theme");
      // Restore dashboard preference on unmount.
      const t = typeof window !== "undefined" ? localStorage.getItem("fw-theme") : "dark";
      if (t !== "light") document.documentElement.classList.add("dark");
    };
  }, []);

  return (
    <div className="min-h-screen">
      <FamilyNav active={null} />

      {/* HERO ----------------------------------------------------------------- */}
      <section className="relative px-6 pt-20 pb-28 overflow-hidden">
        <div className="max-w-[1200px] mx-auto relative">
          {/* Scattered characters — desktop only, asymmetric */}
          <div className="absolute inset-0 pointer-events-none hidden md:block">
            <BlobOrange size={110} className="family-character absolute" style={{ top: 30, left: 40, ["--rot" as string]: "-6deg", ["--delay" as string]: "0s" }} />
            <BlobBlue size={120} className="family-character absolute" style={{ top: 8, right: 80, ["--rot" as string]: "8deg", ["--delay" as string]: "0.5s" }} />
            <BlobYellow size={100} className="family-character absolute" style={{ top: 320, left: 0, ["--rot" as string]: "-12deg", ["--delay" as string]: "1.1s" }} />
            <BlobGreen size={115} className="family-character absolute" style={{ top: 280, right: 20, ["--rot" as string]: "10deg", ["--delay" as string]: "0.3s" }} />
            <CoinStack size={70} className="family-character absolute" style={{ top: 200, left: 140, ["--rot" as string]: "-4deg", ["--delay" as string]: "0.8s" }} />
            <Star size={48} className="family-character absolute" style={{ top: 110, right: 240, ["--delay" as string]: "1.4s" }} />
            <Heart size={42} className="family-character absolute" style={{ top: 260, right: 200, ["--delay" as string]: "0.6s" }} />
            <Sparkle size={24} className="absolute" style={{ top: 60, left: 320, color: "#ff3e00" }} color="#ff3e00" />
            <Sparkle size={20} className="absolute" style={{ top: 380, right: 320 }} color="#0090ff" />
          </div>

          <div className="relative text-center mx-auto max-w-3xl pt-20">
            <div className="text-[#ff3e00] text-[13px] font-medium tracking-[0.04em] uppercase mb-5">A money game you'll actually play</div>
            <h1 className="family-display family-pop">
              Money should feel like<br /> a game you want to play.
            </h1>
            <p className="family-body mt-7 max-w-xl mx-auto">
              Track every dollar, fight your debts as boss raids, tax your vices into savings, and stop pretending you and your partner agree about money.
            </p>
            <div className="mt-9 flex items-center justify-center gap-3 flex-wrap">
              <Link href="/signup" className="family-btn-dark">Get started <ArrowRight className="w-4 h-4" /></Link>
              <Link href="/learn" className="family-btn-light">Try free tools</Link>
            </div>
            <div className="mt-5 text-[12px] text-[#848281]">No credit card · Free forever tier · No bank login required</div>
          </div>
        </div>
      </section>

      {/* TRUST SIGNALS -------------------------------------------------------- */}
      <section className="px-6 pb-24">
        <div className="max-w-[1200px] mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { icon: <SwordIcon size={42} />, label: "Debt Bosses", body: "HP bars, APR, KO rewards" },
            { icon: <CoinStack size={42} />, label: "Vice Tax", body: "Guilty pleasures → savings" },
            { icon: <ShieldVault size={42} />, label: "Goal Raids", body: "Short clock, big target" },
            { icon: <Heart size={42} />, label: "Money Mind", body: "Couples alignment game" },
          ].map((it, i) => (
            <div key={i} className="family-card family-card-hover text-left">
              <div className="mb-3">{it.icon}</div>
              <div className="family-heading-sm text-[#121212]">{it.label}</div>
              <div className="family-body-sm mt-1">{it.body}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURE 1 — DEBT BOSSES --------------------------------------------- */}
      <section className="px-6 py-20">
        <div className="max-w-[1200px] mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="text-[#ff3e00] text-[13px] font-medium tracking-[0.04em] uppercase mb-4">Debt, redrawn</div>
            <h2 className="family-heading-lg">Every debt is a <span style={{ color: "#ff3e00" }}>boss fight</span>.</h2>
            <p className="family-body mt-5 max-w-md">
              Your credit card has HP equal to the balance. Its APR is regen damage. Every payment you make lands as an attack. Miss a month and the boss heals.
            </p>
            <ul className="mt-6 space-y-3 family-body-sm">
              {["Auto-calculated avalanche or snowball strategy", "6-month interest projection at your current pace", "Neglect badge if you go 30 days without an attack", "Karma reward when a boss is finally defeated"].map((line) => (
                <li key={line} className="flex items-start gap-2"><Check className="w-4 h-4 mt-0.5 text-[#00ca48] shrink-0" /><span>{line}</span></li>
              ))}
            </ul>
            <Link href="/learn" className="family-link mt-6">Read the strategy guide <ArrowRight className="w-4 h-4" /></Link>
          </div>
          <div className="family-card-cream relative h-[360px] flex items-center justify-center overflow-hidden">
            <div className="absolute -top-6 -right-6"><BlobOrange size={120} className="family-character" style={{ ["--rot" as string]: "8deg" } as React.CSSProperties} /></div>
            <div className="bg-white rounded-xl p-6 w-[300px]" style={{ boxShadow: "var(--shadow-subtle)" }}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-[#848281]">Boss</div>
                  <div className="text-[#121212] font-semibold">Vael'goth</div>
                </div>
                <SwordIcon size={36} />
              </div>
              <div className="mt-4 text-[12px] text-[#848281]">HP</div>
              <div className="mt-1 h-3 rounded-full bg-[#f2f0ed] overflow-hidden">
                <div className="h-full bg-[#ff3e00]" style={{ width: "62%" }} />
              </div>
              <div className="mt-2 flex justify-between text-[12px] text-[#474645]">
                <span>$3,120 / $5,000</span>
                <span>24% APR</span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="bg-[#f8f7f4] rounded-md py-2"><div className="text-[10px] text-[#848281]">DPS</div><div className="text-[13px] font-semibold">$320</div></div>
                <div className="bg-[#f8f7f4] rounded-md py-2"><div className="text-[10px] text-[#848281]">ETA</div><div className="text-[13px] font-semibold">10 mo</div></div>
                <div className="bg-[#f8f7f4] rounded-md py-2"><div className="text-[10px] text-[#848281]">Streak</div><div className="text-[13px] font-semibold">4 mo</div></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURE 2 — MONEY MIND ---------------------------------------------- */}
      <section className="px-6 py-20 bg-[#f8f7f4]">
        <div className="max-w-[1200px] mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div className="order-2 lg:order-1 family-card relative h-[360px] flex items-center justify-center overflow-hidden">
            <div className="absolute -top-4 -left-4"><BlobBlue size={90} className="family-character" /></div>
            <div className="absolute -bottom-4 -right-4"><BlobGreen size={90} className="family-character" style={{ ["--rot" as string]: "-8deg" } as React.CSSProperties} /></div>
            <div className="text-center max-w-[260px]">
              <div className="text-[11px] uppercase tracking-wider text-[#848281]">Alignment with Sam</div>
              <div className="family-display mt-1" style={{ fontSize: 84, color: "#00ca48" }}>76<span style={{ fontSize: 32 }}>%</span></div>
              <div className="text-[13px] text-[#474645] mt-2">Mostly aligned · 2 conversations worth having</div>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <div className="text-[#ff3e00] text-[13px] font-medium tracking-[0.04em] uppercase mb-4">For two</div>
            <h2 className="family-heading-lg">Find out what you each <span style={{ color: "#ff3e00" }}>really think</span>.</h2>
            <p className="family-body mt-5 max-w-md">
              Both partners privately answer 10 honest money questions. No one sees the other's answers until you reveal together. Surfaces the disagreements that quietly become fights.
            </p>
            <ul className="mt-6 space-y-3 family-body-sm">
              {["Spending guilt, security runway, debt tolerance, hidden secrets", "Research-grounded conversation starters for the biggest gaps", "Designed so the quieter partner can finally say the real thing", "+15 SC each — vulnerability is rewarded, not graded"].map((line) => (
                <li key={line} className="flex items-start gap-2"><Check className="w-4 h-4 mt-0.5 text-[#00ca48] shrink-0" /><span>{line}</span></li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* FREE TOOLS ----------------------------------------------------------- */}
      <section className="px-6 py-24">
        <div className="max-w-[1200px] mx-auto text-center">
          <div className="text-[#ff3e00] text-[13px] font-medium tracking-[0.04em] uppercase mb-4">Free, no signup</div>
          <h2 className="family-heading-lg max-w-3xl mx-auto">Run the numbers before you commit.</h2>
          <p className="family-body mt-5 max-w-xl mx-auto">Calculators that work right here. Bookmark them, share them, use them for life.</p>

          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
            {[
              { href: "/tools/debt-calculator", icon: <SwordIcon size={36} />, title: "Debt Calculator", desc: "Avalanche vs snowball, with savings" },
              { href: "/tools/50-30-20", icon: <CoinStack size={36} />, title: "50/30/20 Budget", desc: "Instant bucket split from income" },
              { href: "/tools/compound-interest", icon: <Star size={36} color="#0090ff" />, title: "Compound Interest", desc: "What $100/mo becomes in 30 years" },
              { href: "/tools/emergency-fund", icon: <ShieldVault size={36} />, title: "Emergency Fund", desc: "Risk-profile-based target" },
            ].map((t) => (
              <Link key={t.href} href={t.href} className="family-card family-card-hover block">
                <div className="mb-3">{t.icon}</div>
                <div className="family-heading-sm text-[#121212]">{t.title}</div>
                <div className="family-body-sm mt-1">{t.desc}</div>
                <span className="family-link mt-3 text-[13px]">Open <ArrowRight className="w-3 h-3" /></span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS / RULES TEASE ------------------------------------------ */}
      <section className="px-6 py-24 bg-[#f8f7f4] relative overflow-hidden">
        <div className="absolute top-10 left-10 opacity-80 hidden md:block"><BlobYellow size={80} className="family-character" /></div>
        <div className="absolute bottom-10 right-10 opacity-80 hidden md:block"><BlobOrange size={70} className="family-character" style={{ ["--rot" as string]: "-10deg" } as React.CSSProperties} /></div>
        <div className="max-w-[1200px] mx-auto text-center relative">
          <div className="text-[#ff3e00] text-[13px] font-medium tracking-[0.04em] uppercase mb-4">Seven rules</div>
          <h2 className="family-heading-lg max-w-3xl mx-auto">A game with rules. Non-negotiable. Short.</h2>
          <div className="mt-10 grid md:grid-cols-2 gap-4 max-w-3xl mx-auto text-left">
            {[
              ["01", "Every dollar gets a job."],
              ["02", "Debts are bosses. Treat them like fights."],
              ["03", "Tax the things you can't quit."],
              ["04", "Show up weekly. Always read the recap."],
            ].map(([n, t]) => (
              <div key={n} className="family-card flex gap-4">
                <div className="text-[#ff3e00] font-semibold text-[28px] leading-none">{n}</div>
                <div className="family-heading-sm text-[#121212] pt-1">{t}</div>
              </div>
            ))}
          </div>
          <Link href="/rules" className="family-link mt-8 inline-flex">Read all seven <ArrowRight className="w-4 h-4" /></Link>
        </div>
      </section>

      {/* FINAL CTA ------------------------------------------------------------ */}
      <section className="px-6 py-32 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none hidden md:block">
          <BlobBlue size={90} className="family-character absolute" style={{ top: 60, left: "10%", ["--delay" as string]: "0.4s" }} />
          <BlobOrange size={90} className="family-character absolute" style={{ top: 100, right: "10%", ["--delay" as string]: "0.9s" }} />
          <Star size={36} className="absolute" style={{ top: 220, left: "30%" }} />
          <Heart size={32} className="absolute" style={{ top: 240, right: "30%" }} />
        </div>
        <div className="max-w-2xl mx-auto text-center relative">
          <h2 className="family-display" style={{ fontSize: 56 }}>Ready to play?</h2>
          <p className="family-body mt-5">Free forever tier. No bank login. No upsell. Just the game.</p>
          <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
            <Link href="/signup" className="family-btn-dark">Get started <ArrowRight className="w-4 h-4" /></Link>
            <Link href="/mission" className="family-btn-light">Read the mission</Link>
          </div>
        </div>
      </section>

      <FamilyFooter />
    </div>
  );
}
