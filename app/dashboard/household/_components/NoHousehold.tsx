import Link from "next/link";
import { ArrowRight, Home } from "lucide-react";

/** Shared empty state for every Household HQ page when the user hasn't created/joined a household yet. */
export default function NoHousehold({ title }: { title: string }) {
  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-4xl font-semibold tracking-[-0.03em] flex items-center gap-3">
          <Home className="w-8 h-8" /> {title}
        </h1>
        <p className="mt-2 text-sm text-black/60 dark:text-white/60">
          Household HQ runs on top of a household — chores, the family bank, and shared goals all live there.
        </p>
      </header>
      <section className="rounded-3xl border border-black/10 dark:border-white/10 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-emerald-500/10 p-10">
        <div className="max-w-2xl">
          <div className="text-xs uppercase tracking-wider text-indigo-500 font-medium">Debt Sucker</div>
          <h2 className="mt-2 text-3xl md:text-4xl font-semibold tracking-tight">Turn "who does the dishes" into a game everyone wants to win.</h2>
          <p className="mt-4 text-sm text-black/60 dark:text-white/60">
            Create a household to unlock Chores &amp; Crowns, The Bank for family loans, and Household Goals
            for the things you're saving up for together — from the PS5 to the bathroom that never gets remodeled.
          </p>
          <div className="mt-8 flex gap-3 flex-wrap">
            <Link href="/dashboard/couples/setup" className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-black text-white dark:bg-white dark:text-black text-sm font-medium hover:opacity-90">
              Create a household <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/dashboard/notifications" className="inline-flex items-center gap-2 px-5 py-3 rounded-full border border-black/15 dark:border-white/20 text-sm">
              Accept an invite
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
