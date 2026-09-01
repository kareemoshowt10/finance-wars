"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CheckCheck, Landmark, HeartHandshake } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/dashboard/household", label: "Today", icon: Home },
  { href: "/dashboard/household/chores", label: "Chores", icon: CheckCheck },
  { href: "/dashboard/household/bank", label: "Bank", icon: Landmark },
  { href: "/dashboard/household/goals", label: "Goals", icon: HeartHandshake },
];

/**
 * The primary way to get around on a phone: the four screens worth opening
 * the app for every day, always one thumb-tap away. Everything else still
 * lives behind the hamburger menu in the top bar.
 */
export default function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 pb-safe border-t border-black/5 dark:border-white/5 bg-white/85 dark:bg-black/85 backdrop-blur-xl"
      aria-label="Primary"
    >
      <div className="grid grid-cols-4 h-14">
        {TABS.map((tab) => {
          // Exact match for Today (its href is also the prefix of the other
          // three), startsWith for the rest.
          const active = tab.href === "/dashboard/household" ? pathname === tab.href : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 text-[11px] tap-target transition",
                active ? "text-indigo-500 dark:text-indigo-400" : "text-black/45 dark:text-white/45"
              )}
            >
              <tab.icon className="w-5 h-5" strokeWidth={active ? 2.4 : 2} />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
