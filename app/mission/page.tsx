import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Swords, Flame, Target, Eye, Trophy, Sparkles, Users } from "lucide-react";
import { FamilyNav, FamilyFooter } from "@/app/_family/FamilyShell";
import FamilyThemeBoundary from "@/app/_family/FamilyThemeBoundary";
import { BlobOrange, BlobGreen, BlobBlue, BlobYellow, Star, Heart } from "@/app/_family/Characters";

export const metadata: Metadata = {
  title: "Mission — Finance Wars",
  description: "Finance Wars exists to turn personal finance into a game you actually want to play. Confront debt. Tax your vices. Defeat boredom.",
  openGraph: {
    title: "Finance Wars — Our Mission",
    description: "Confront debt. Tax your vices. Make money feel like a game you want to play.",
  },
};

const PILLARS = [
  { icon: Eye, color: "#0090ff", title: "Make the invisible visible",
    body: "Most people lose to debt and lifestyle creep because they can't see them clearly. We surface every dollar of interest, every guilty pleasure, every silent month — so you can act before they cost you a year." },
  { icon: Swords, color: "#ff3e00", title: "Turn debt into a boss fight",
    body: "A balance sheet doesn't motivate anyone. A boss with HP, APR, and an ETA does. Every payment is an attack. Every month you stall, the boss heals. The metaphor isn't cute — it's the actual mechanic." },
  { icon: Flame, color: "#ffbb26", title: "Use guilt productively",
    body: "We don't tell you to stop ordering takeout. We let you tax it. Every Vice Tax you set redirects a slice of your favorite weakness straight into a goal. The pleasure stays. The leak gets plugged." },
  { icon: Trophy, color: "#00ca48", title: "Reward the boring work",
    body: "Compounding is boring. So we built achievements, streaks, currencies, and weekly recaps that make the boring part feel like progress. Discipline shouldn't have to be its own reward." },
  { icon: Target, color: "#ff3e00", title: "Honesty over optimism",
    body: "We'd rather tell you that you neglected a boss for 30 days than show you a smiling avatar. The dashboard exists to confront you, not flatter you. Self-delusion is the enemy of net worth." },
  { icon: Users, color: "#9f4fff", title: "Build for two, not one",
    body: "Money is the #1 thing couples fight about. We design for the household: shared goals, allowance, pre-flight approvals on big purchases, and Money Mind for when honesty beats avoidance." },
];

export default function MissionPage() {
  return (
    <div className="min-h-screen">
      <FamilyThemeBoundary />
      <FamilyNav active="mission" />

      <main className="max-w-[820px] mx-auto px-6 pt-16 pb-16 relative">
        <div className="absolute -top-2 -left-12 hidden md:block"><BlobOrange size={84} className="family-character" style={{ ["--rot" as string]: "-8deg" } as React.CSSProperties} /></div>
        <div className="absolute top-32 -right-16 hidden md:block"><BlobBlue size={92} className="family-character" style={{ ["--rot" as string]: "10deg", ["--delay" as string]: "0.6s" } as React.CSSProperties} /></div>

        <Link href="/" className="family-link text-[13px]"><ArrowLeft className="w-3 h-3" />Back home</Link>

        <h1 className="family-display family-pop mt-6">
          Money should feel like<br /> a game you want to play.
        </h1>

        <p className="family-body mt-7">
          Finance Wars exists because the standard personal finance experience is a spreadsheet that
          guilts you into doing nothing. We took the same data — accounts, transactions, debts,
          goals — and rebuilt the surface as a game. <strong style={{ color: "#121212" }}>The math is identical. The motivation is not.</strong>
        </p>

        <p className="family-body mt-5">
          We believe most people don't have a finance problem. They have a feedback-loop problem.
          So we shortened the loop. Pay a credit card → see the boss bleed. Order DoorDash →
          watch a slice land in your savings. Skip a month → watch the boss heal.
        </p>

        <h2 className="family-heading-lg mt-20">What we believe</h2>

        <div className="mt-8 space-y-4">
          {PILLARS.map((p) => {
            const Icon = p.icon;
            return (
              <div key={p.title} className="family-card flex gap-5">
                <div className="shrink-0 w-12 h-12 rounded-[10px] flex items-center justify-center" style={{ background: `${p.color}1a`, color: p.color }}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="family-heading-sm text-[#121212]">{p.title}</h3>
                  <p className="family-body-sm mt-2">{p.body}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-20 grid md:grid-cols-2 gap-5">
          <div className="family-card-cream">
            <h3 className="family-heading-sm text-[#121212]">Who this is for</h3>
            <ul className="mt-4 space-y-2 family-body-sm">
              <li>• People who know what they should do and don't do it.</li>
              <li>• Couples who fight about money and want a referee, not a lecture.</li>
              <li>• Anyone carrying debt they keep meaning to "really focus on next month."</li>
              <li>• Spreadsheet people who want their spreadsheet to fight back.</li>
            </ul>
          </div>
          <div className="family-card-cream">
            <h3 className="family-heading-sm text-[#121212]">Who this isn't for</h3>
            <ul className="mt-4 space-y-2 family-body-sm">
              <li>• People who want a tracker that congratulates them for opening it.</li>
              <li>• Anyone looking for tax advice, investment picks, or a CFP.</li>
              <li>• People who don't want their behavior surfaced and named.</li>
            </ul>
          </div>
        </div>

        <div className="mt-16 family-card relative overflow-hidden" style={{ background: "linear-gradient(135deg, #fff8f5 0%, #fffaee 100%)" }}>
          <div className="absolute -top-4 -right-4 opacity-90 hidden md:block"><Heart size={50} /></div>
          <div className="text-[#ff3e00] text-[13px] font-medium tracking-[0.04em] uppercase">The pact</div>
          <p className="family-body mt-3">
            We won't sell your data. We won't hide fees. We won't dark-pattern you into upgrades.
            In exchange, you show up — even when the boss is winning. Especially then.
          </p>
        </div>

        <div className="mt-12 flex flex-wrap gap-3 items-center">
          <Link href="/signup" className="family-btn-dark">Start playing <ArrowRight className="w-4 h-4" /></Link>
          <Link href="/rules" className="family-btn-light">Read the rules</Link>
        </div>
      </main>

      <FamilyFooter />
    </div>
  );
}
