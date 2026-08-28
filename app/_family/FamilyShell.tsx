import Link from "next/link";

// Sticky nav with logo-left, links-center, actions-right.
// Use on every public Family-themed page.
export function FamilyNav({ active }: { active?: "mission" | "rules" | "learn" | null }) {
  const linkCls = (k: typeof active) =>
    `text-[14px] tracking-[-0.013em] transition ${
      active === k ? "text-[#121212] font-medium" : "text-[#474645] hover:text-[#121212]"
    }`;

  return (
    <nav className="family-nav">
      <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-[#343433] font-semibold text-[15px] tracking-[-0.013em]">
          <span className="w-7 h-7 rounded-full bg-[#ff3e00] inline-flex items-center justify-center text-white text-[13px] font-semibold">F</span>
          Debt Sucker
        </Link>
        <div className="hidden sm:flex items-center gap-7">
          <Link href="/mission" className={linkCls("mission")}>Mission</Link>
          <Link href="/rules" className={linkCls("rules")}>Rules</Link>
          <Link href="/learn" className={linkCls("learn")}>Learn</Link>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/login" className="family-btn-light hidden sm:inline-flex">Log in</Link>
          <Link href="/signup" className="family-btn-dark">Get started</Link>
        </div>
      </div>
    </nav>
  );
}

export function FamilyFooter() {
  return (
    <footer className="mt-32 border-t border-[#f2f0ed]">
      <div className="max-w-[1200px] mx-auto px-6 py-12 grid grid-cols-2 sm:grid-cols-4 gap-8 text-[13px] text-[#848281]">
        <div>
          <div className="text-[#343433] font-medium text-[14px] mb-3">Debt Sucker</div>
          <p className="leading-relaxed">A money game you actually want to play.</p>
        </div>
        <div>
          <div className="text-[#343433] font-medium text-[14px] mb-3">Story</div>
          <ul className="space-y-2">
            <li><Link href="/mission" className="hover:text-[#121212]">Mission</Link></li>
            <li><Link href="/rules" className="hover:text-[#121212]">Rules</Link></li>
          </ul>
        </div>
        <div>
          <div className="text-[#343433] font-medium text-[14px] mb-3">Free</div>
          <ul className="space-y-2">
            <li><Link href="/learn" className="hover:text-[#121212]">Learn hub</Link></li>
            <li><Link href="/tools/debt-calculator" className="hover:text-[#121212]">Debt calculator</Link></li>
            <li><Link href="/tools/50-30-20" className="hover:text-[#121212]">Budget builder</Link></li>
            <li><Link href="/tools/compound-interest" className="hover:text-[#121212]">Compound interest</Link></li>
            <li><Link href="/tools/emergency-fund" className="hover:text-[#121212]">Emergency fund</Link></li>
          </ul>
        </div>
        <div>
          <div className="text-[#343433] font-medium text-[14px] mb-3">Account</div>
          <ul className="space-y-2">
            <li><Link href="/signup" className="hover:text-[#121212]">Sign up</Link></li>
            <li><Link href="/login" className="hover:text-[#121212]">Log in</Link></li>
          </ul>
        </div>
      </div>
      <div className="max-w-[1200px] mx-auto px-6 pb-10 text-[12px] text-[#c6c6c6]">
        © {new Date().getFullYear()} Debt Sucker
      </div>
    </footer>
  );
}
