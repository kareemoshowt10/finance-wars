"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard, ArrowLeftRight, Wallet, Target, Trophy, Settings, LogOut, Menu, X,
  Sparkles, Repeat, Tag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ThemeToggle from "./ThemeToggle";

const links = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/dashboard/accounts", label: "Accounts", icon: Wallet },
  { href: "/dashboard/budgets", label: "Budgets", icon: Target },
  { href: "/dashboard/goals", label: "Goals", icon: Trophy },
  { href: "/dashboard/insights", label: "Insights", icon: Sparkles },
  { href: "/dashboard/recurring", label: "Recurring", icon: Repeat },
  { href: "/dashboard/categories", label: "Categories", icon: Tag },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export default function DashNav({ userName }: { userName: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <div className="md:hidden sticky top-0 z-40 flex items-center justify-between px-4 h-12 border-b border-black/5 dark:border-white/5 bg-white/70 dark:bg-black/70 backdrop-blur-xl">
        <Link href="/dashboard" className="text-sm font-semibold tracking-tight">Finance Wars</Link>
        <div className="flex items-center gap-1">
          <ThemeToggle compact />
          <button onClick={() => setOpen((o) => !o)} className="p-2 -mr-2">
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <aside
        className={cn(
          "fixed md:fixed inset-y-0 left-0 z-30 w-60 border-r border-black/5 dark:border-white/5 bg-white/80 dark:bg-black/80 backdrop-blur-xl flex-col",
          "transition-transform md:translate-x-0",
          open ? "translate-x-0 flex" : "-translate-x-full hidden md:flex"
        )}
      >
        <div className="hidden md:flex items-center justify-between px-5 pt-6 pb-4">
          <Link href="/" className="text-sm font-semibold tracking-tight">Finance Wars</Link>
          <ThemeToggle compact />
        </div>
        <div className="px-5 pt-4 md:pt-2 pb-3">
          <div className="text-[11px] uppercase tracking-[0.2em] text-black/40 dark:text-white/40">Signed in</div>
          <div className="text-sm mt-1 truncate">{userName}</div>
        </div>
        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
          {links.map((l) => {
            const active = pathname === l.href || (l.href !== "/dashboard" && pathname.startsWith(l.href));
            return (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition",
                  active
                    ? "bg-black/10 dark:bg-white/10 text-black dark:text-white"
                    : "text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5"
                )}
              >
                <l.icon className="w-4 h-4" />
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-black/5 dark:border-white/5">
          <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5">
            <LogOut className="w-4 h-4" />
            Log out
          </button>
        </div>
      </aside>
    </>
  );
}
