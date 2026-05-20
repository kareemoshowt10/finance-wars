"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  LayoutDashboard, ArrowLeftRight, Wallet, Target, Trophy, Settings, LogOut, Menu, X,
  Sparkles, Repeat, Tag, Bell, PieChart, Activity, CheckCheck, Filter, TrendingUp, FileText, Swords,
  Calendar as CalIcon, LineChart, MessageCircle, Award, Flame, Users, Store,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ThemeToggle from "./ThemeToggle";

const linkGroups: { heading?: string; items: { href: string; label: string; icon: React.ComponentType<{ className?: string }> }[] }[] = [
  {
    items: [
      { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
      { href: "/dashboard/calendar", label: "Calendar", icon: CalIcon },
    ],
  },
  {
    heading: "Money",
    items: [
      { href: "/dashboard/transactions", label: "Transactions", icon: ArrowLeftRight },
      { href: "/dashboard/accounts", label: "Accounts", icon: Wallet },
      { href: "/dashboard/portfolio", label: "Portfolio", icon: PieChart },
      { href: "/dashboard/budgets", label: "Budgets", icon: Target },
      { href: "/dashboard/goals", label: "Goals", icon: Trophy },
    ],
  },
  {
    heading: "Play",
    items: [
      { href: "/dashboard/duels", label: "Duels", icon: Swords },
      { href: "/dashboard/couples", label: "Couples", icon: Users },
      { href: "/dashboard/games", label: "Mini-Games", icon: Sparkles },
      { href: "/dashboard/squads", label: "Squads", icon: Flame },
      { href: "/dashboard/achievements", label: "Achievements", icon: Award },
      { href: "/dashboard/marketplace", label: "Marketplace", icon: Store },
    ],
  },
  {
    heading: "Think",
    items: [
      { href: "/dashboard/insights", label: "Insights", icon: Sparkles },
      { href: "/dashboard/cashflow", label: "Cash Flow", icon: TrendingUp },
      { href: "/dashboard/scenarios", label: "Scenarios", icon: LineChart },
      { href: "/dashboard/coach", label: "Coach", icon: MessageCircle },
      { href: "/dashboard/predictions", label: "Predictions", icon: Target },
      { href: "/dashboard/reports", label: "Reports", icon: FileText },
    ],
  },
  {
    heading: "Automate",
    items: [
      { href: "/dashboard/rules", label: "Rules", icon: Filter },
      { href: "/dashboard/recurring", label: "Recurring", icon: Repeat },
      { href: "/dashboard/categories", label: "Categories", icon: Tag },
    ],
  },
  {
    items: [
      { href: "/dashboard/activity", label: "Activity", icon: Activity },
      { href: "/dashboard/settings", label: "Settings", icon: Settings },
    ],
  },
];
const links = linkGroups.flatMap((g) => g.items);

type Notif = {
  id: string; kind: string; title: string; body: string;
  link?: string | null; readAt?: string | null; createdAt: string;
};

type HH = { id: string; name: string };

export default function DashNav({ userName }: { userName: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const [gam, setGam] = useState<{ xp: number; level: number; streak: number } | null>(null);
  const [households, setHouseholds] = useState<HH[]>([]);
  const [activeHid, setActiveHid] = useState<string>("personal");
  const [hhOpen, setHhOpen] = useState(false);

  useEffect(() => {
    fetch("/api/households").then((r) => r.ok ? r.json() : []).then((d: HH[]) => {
      setHouseholds(d || []);
      const cookie = document.cookie.split("; ").find((c) => c.startsWith("fw_active_household="));
      const val = cookie ? decodeURIComponent(cookie.split("=")[1]) : "";
      if (val && (d || []).find((h) => h.id === val)) setActiveHid(val);
      else if ((d || []).length > 0) setActiveHid(d[0].id);
    }).catch(() => {});
  }, []);

  async function pickHousehold(id: string) {
    setActiveHid(id);
    setHhOpen(false);
    if (id === "personal") {
      document.cookie = "fw_active_household=; path=/; max-age=0";
    } else if (id === "__new__") {
      router.push("/dashboard/couples/setup");
      return;
    } else {
      await fetch("/api/households/active", { method: "POST", body: JSON.stringify({ householdId: id }) }).catch(() => {});
    }
    router.refresh();
  }

  const activeHh = households.find((h) => h.id === activeHid);
  const activeLabel = activeHh ? activeHh.name : "Personal";

  useEffect(() => {
    fetch("/api/achievements")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setGam({ xp: d.xp, level: d.level?.level || 0, streak: d.streak || 0 }); })
      .catch(() => {});
  }, [pathname]);

  async function loadNotifs() {
    try {
      const res = await fetch("/api/notifications?limit=10").then((r) => r.json());
      setNotifs(res.items || []);
      setUnread(res.unread || 0);
    } catch {}
  }

  useEffect(() => {
    loadNotifs();
    const t = setInterval(loadNotifs, 60_000);
    return () => clearInterval(t);
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  async function markAllRead() {
    await fetch("/api/notifications/read-all", { method: "POST" });
    loadNotifs();
  }

  async function clickNotif(n: Notif) {
    await fetch(`/api/notifications/${n.id}/read`, { method: "POST" });
    setBellOpen(false);
    if (n.link) router.push(n.link);
    loadNotifs();
  }

  const bellMenu = (
    <div className="relative">
      <button
        onClick={() => setBellOpen((o) => !o)}
        className="relative p-2 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-[10px] text-white flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      <AnimatePresence>
        {bellOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-80 max-w-[90vw] z-50 rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#0a0a0a] shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-2 border-b border-black/5 dark:border-white/5">
              <div className="text-xs font-medium">Notifications</div>
              <button onClick={markAllRead} className="text-[11px] flex items-center gap-1 text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white">
                <CheckCheck className="w-3 h-3" /> Mark all read
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {notifs.length === 0 ? (
                <div className="p-6 text-center text-xs text-black/40 dark:text-white/40">All caught up.</div>
              ) : (
                <ul className="divide-y divide-black/5 dark:divide-white/5">
                  {notifs.map((n) => {
                    const isDuel = n.kind?.startsWith("DUEL_");
                    return (
                      <li key={n.id}>
                        <button
                          onClick={() => clickNotif(n)}
                          className={cn(
                            "w-full text-left px-4 py-3 hover:bg-black/[0.03] dark:hover:bg-white/[0.03] flex gap-3",
                            !n.readAt && "bg-black/[0.02] dark:bg-white/[0.02]",
                            isDuel && "border-l-2 border-fuchsia-500"
                          )}
                        >
                          {!n.readAt && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2 shrink-0" />}
                          {isDuel && <Swords className="w-3.5 h-3.5 mt-0.5 shrink-0 text-fuchsia-500" />}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{n.title}</div>
                            <div className="text-xs text-black/50 dark:text-white/50 line-clamp-2">{n.body}</div>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <Link
              href="/dashboard/notifications"
              onClick={() => setBellOpen(false)}
              className="block text-center text-xs py-2 border-t border-black/5 dark:border-white/5 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white"
            >
              View all
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <>
      <div className="md:hidden sticky top-0 z-40 flex items-center justify-between px-4 h-12 border-b border-black/5 dark:border-white/5 bg-white/70 dark:bg-black/70 backdrop-blur-xl">
        <Link href="/dashboard" className="text-sm font-semibold tracking-tight">Finance Wars</Link>
        <div className="flex items-center gap-1">
          {bellMenu}
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
          <div className="flex items-center gap-0.5">
            {bellMenu}
            <ThemeToggle compact />
          </div>
        </div>
        <div className="px-5 pt-4 md:pt-2 pb-2">
          <div className="text-[11px] uppercase tracking-[0.2em] text-black/40 dark:text-white/40">Lens</div>
          <div className="relative mt-1">
            <button
              onClick={() => setHhOpen((o) => !o)}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10"
            >
              <span className="flex items-center gap-2 truncate">
                <Users className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{activeLabel}</span>
              </span>
              <span className="text-xs opacity-50">▾</span>
            </button>
            {hhOpen && (
              <div className="absolute z-50 left-0 right-0 mt-1 rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-[#0a0a0a] shadow-2xl py-1 max-h-72 overflow-y-auto">
                <button onClick={() => pickHousehold("personal")} className="w-full text-left px-3 py-1.5 text-sm hover:bg-black/5 dark:hover:bg-white/5">Personal</button>
                {households.map((h) => (
                  <button key={h.id} onClick={() => pickHousehold(h.id)} className="w-full text-left px-3 py-1.5 text-sm hover:bg-black/5 dark:hover:bg-white/5 truncate">{h.name}</button>
                ))}
                <div className="my-1 border-t border-black/5 dark:border-white/10" />
                <button onClick={() => pickHousehold("__new__")} className="w-full text-left px-3 py-1.5 text-sm text-indigo-500 hover:bg-black/5 dark:hover:bg-white/5">+ Create new</button>
              </div>
            )}
          </div>
        </div>
        <div className="px-5 pb-3">
          <div className="text-[11px] uppercase tracking-[0.2em] text-black/40 dark:text-white/40">Signed in</div>
          <div className="text-sm mt-1 truncate">{userName}</div>
          {gam && (
            <Link href="/dashboard/achievements" className="mt-2 flex items-center gap-2 text-[11px]">
              <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium">
                LVL {gam.level}
              </span>
              <span className="opacity-60 tabular-nums">{gam.xp} XP</span>
              {gam.streak > 0 && (
                <span className="ml-auto flex items-center gap-1 text-orange-500" title={`${gam.streak}-day streak`}>
                  <Flame className="w-3 h-3" /> {gam.streak}
                </span>
              )}
            </Link>
          )}
        </div>
        <nav className="flex-1 px-3 space-y-3 overflow-y-auto pb-4">
          {linkGroups.map((g, gi) => (
            <div key={gi} className="space-y-0.5">
              {g.heading && (
                <div className="px-3 pt-1 pb-1 text-[10px] uppercase tracking-[0.2em] text-black/35 dark:text-white/35">{g.heading}</div>
              )}
              {g.items.map((l) => {
                const active = pathname === l.href || (l.href !== "/dashboard" && pathname.startsWith(l.href));
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm transition",
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
            </div>
          ))}
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
