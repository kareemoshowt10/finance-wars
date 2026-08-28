"use client";
import Link from "next/link";
import { useEffect } from "react";

// Applies the Blueprint theme to <body> while mounted; restores dashboard
// theme on unmount.
export function BlueprintThemeBoundary() {
  useEffect(() => {
    document.body.classList.add("blueprint-theme");
    document.documentElement.classList.remove("dark");
    return () => {
      document.body.classList.remove("blueprint-theme");
      try {
        const t = localStorage.getItem("fw-theme");
        if (t !== "light") document.documentElement.classList.add("dark");
      } catch { document.documentElement.classList.add("dark"); }
    };
  }, []);
  return null;
}

export function BlueprintNav({ active }: { active?: "mission" | "rules" | "tools" | null }) {
  const linkCls = (k: typeof active) =>
    `bp-callsign hover:text-[var(--bp-ink)] transition ${active === k ? "text-[var(--bp-ink)]" : ""}`;
  return (
    <nav className="bp-nav">
      <div className="max-w-[1240px] mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <span className="w-6 h-6 border border-[var(--bp-ink)] rotate-45" />
          <span className="bp-fig text-[13px]">DEBT SUCKER / 01</span>
        </Link>
        <div className="hidden sm:flex items-center gap-7">
          <Link href="/mission" className={linkCls("mission")}>Mission</Link>
          <Link href="/rules" className={linkCls("rules")}>Rules</Link>
          <Link href="/learn" className={linkCls("tools")}>Tools</Link>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/login" className="bp-callsign hover:text-[var(--bp-ink)]">Log in</Link>
          <Link href="/signup" className="bp-btn-primary">Enlist</Link>
        </div>
      </div>
    </nav>
  );
}

export function BlueprintFooter() {
  return (
    <footer className="mt-32 border-t border-[var(--bp-rule)]">
      <div className="max-w-[1240px] mx-auto px-6 py-12 grid grid-cols-2 sm:grid-cols-4 gap-8">
        <div>
          <div className="bp-callsign mb-3">§A — STORY</div>
          <ul className="space-y-2 text-[14px]">
            <li><Link href="/mission" className="hover:text-[var(--bp-signal)]">Mission</Link></li>
            <li><Link href="/rules" className="hover:text-[var(--bp-signal)]">Rules</Link></li>
          </ul>
        </div>
        <div>
          <div className="bp-callsign mb-3">§B — HOMEOWNER</div>
          <ul className="space-y-2 text-[14px]">
            <li><Link href="/tools/home-affordability" className="hover:text-[var(--bp-signal)]">Home Affordability</Link></li>
            <li><Link href="/tools/mortgage" className="hover:text-[var(--bp-signal)]">Mortgage Payoff</Link></li>
            <li><Link href="/tools/down-payment" className="hover:text-[var(--bp-signal)]">Down Payment Plan</Link></li>
          </ul>
        </div>
        <div>
          <div className="bp-callsign mb-3">§C — CAR OWNER</div>
          <ul className="space-y-2 text-[14px]">
            <li><Link href="/tools/car-affordability" className="hover:text-[var(--bp-signal)]">Car Affordability</Link></li>
            <li><Link href="/tools/debt-calculator" className="hover:text-[var(--bp-signal)]">Debt Payoff</Link></li>
          </ul>
        </div>
        <div>
          <div className="bp-callsign mb-3">§D — ACCOUNT</div>
          <ul className="space-y-2 text-[14px]">
            <li><Link href="/signup" className="hover:text-[var(--bp-signal)]">Enlist</Link></li>
            <li><Link href="/login" className="hover:text-[var(--bp-signal)]">Log in</Link></li>
          </ul>
        </div>
      </div>
      <div className="max-w-[1240px] mx-auto px-6 pb-8 flex items-center justify-between">
        <span className="bp-callsign">FINANCE WARS · MMXXVI</span>
        <span className="bp-callsign">FOR TWO</span>
      </div>
    </footer>
  );
}
