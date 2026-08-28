import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getMyHouseholds, getActiveHousehold } from "@/lib/household";
import { Users, ArrowRight } from "lucide-react";
import CouplesView from "./_components/CouplesView";

export const dynamic = "force-dynamic";

export default async function CouplesPage() {
  const user = await requireUser();
  if (!user) redirect("/login");
  const households = await getMyHouseholds(user.id);
  const active = await getActiveHousehold(user.id);

  if (households.length === 0) {
    return (
      <div className="space-y-10">
        <header>
          <h1 className="text-4xl font-semibold tracking-[-0.03em] flex items-center gap-3">
            <Users className="w-8 h-8" /> Couples
          </h1>
          <p className="mt-2 text-sm text-black/60 dark:text-white/60">A transparency layer for two — built on respect, not surveillance.</p>
        </header>
        <section className="rounded-3xl border border-black/10 dark:border-white/10 bg-gradient-to-br from-rose-500/10 via-fuchsia-500/5 to-indigo-500/10 p-10">
          <div className="max-w-2xl">
            <div className="text-xs uppercase tracking-wider text-rose-500 font-medium">Better together</div>
            <h2 className="mt-2 text-3xl md:text-4xl font-semibold tracking-tight">Money fights end when both partners see the same picture.</h2>
            <p className="mt-4 text-sm text-black/60 dark:text-white/60">
              40% of partners hide spending. Debt Sucker makes that impossible — gently. You keep your own accounts; the household is just an opt-in lens on top.
            </p>
            <div className="mt-8 flex gap-3 flex-wrap">
              <Link href="/dashboard/couples/setup" className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-black text-white dark:bg-white dark:text-black text-sm font-medium hover:opacity-90">
                Create a Household <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/dashboard/notifications" className="inline-flex items-center gap-2 px-5 py-3 rounded-full border border-black/15 dark:border-white/20 text-sm">
                Accept an invite
              </Link>
            </div>
          </div>
        </section>
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { t: "The Pact", b: "Co-author thresholds and allowances. Both sign. Both informed." },
            { t: "Money Date", b: "Weekly 30-min review. Auto-built agenda. Decisions actually save." },
            { t: "Big-Purchase Pre-flight", b: "Spends over your threshold pause for a quick partner check." },
          ].map((c) => (
            <div key={c.t} className="rounded-2xl border border-black/10 dark:border-white/10 p-6">
              <div className="text-sm font-semibold">{c.t}</div>
              <div className="mt-2 text-xs text-black/55 dark:text-white/55">{c.b}</div>
            </div>
          ))}
        </section>
      </div>
    );
  }

  return <CouplesView activeId={(active?.id) || households[0].id} households={households.map((h) => ({ id: h.id, name: h.name }))} />;
}
