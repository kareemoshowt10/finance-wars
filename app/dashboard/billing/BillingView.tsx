"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CreditCard, Check, PartyPopper, FlaskConical, Users, CheckCheck, Landmark, HeartHandshake } from "lucide-react";
import type { Plan, PlanId } from "@/lib/plans";
import { SkeletonCards } from "../_components/Skeleton";

type PlanData = {
  planId: PlanId;
  plan: Plan;
  plans: Plan[];
  nextPlan: PlanId | null;
  isOwner: boolean;
  billingConfigured: boolean;
  planRenewsAt: string | null;
  usage: { members: number; activeChores: number; activeLoans: number; activeGoals: number };
  limits: { members: number; chores: number | null; loans: number | null; goals: number | null };
};

export default function BillingView({ hid, householdName }: { hid: string; householdName: string }) {
  const [data, setData] = useState<PlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<PlanId | "portal" | "downgrade" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const searchParams = useSearchParams();

  async function load() {
    const d = await fetch(`/api/households/${hid}/plan`).then((r) => r.json());
    setData(d);
    setLoading(false);
  }
  useEffect(() => { load(); }, [hid]);
  useEffect(() => {
    if (searchParams.get("upgraded")) setNotice("You're upgraded — welcome to the bigger plan.");
  }, [searchParams]);

  async function upgrade(planId: "rhythm" | "household_hq") {
    setBusy(planId);
    try {
      const res = await fetch(`/api/households/${hid}/billing/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Could not start checkout");
      if (d.url) {
        window.location.href = d.url;
        return;
      }
      if (d.devMode) {
        setNotice(`Upgraded to ${planId === "rhythm" ? "Rhythm" : "Household HQ"} — dev mode (no Stripe account connected, so nothing was charged).`);
        await load();
      }
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Could not start checkout");
    } finally {
      setBusy(null);
    }
  }

  async function openPortal() {
    setBusy("portal");
    try {
      const res = await fetch(`/api/households/${hid}/billing/portal`, { method: "POST" });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Could not open billing portal");
      window.location.href = d.url;
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Could not open billing portal");
      setBusy(null);
    }
  }

  async function downgrade() {
    if (!confirm("Downgrade to Free? You'll keep your data, but anything over the Free plan's limits will stay locked until you're back under them.")) return;
    setBusy("downgrade");
    try {
      const res = await fetch(`/api/households/${hid}/billing/downgrade`, { method: "POST" });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Could not downgrade");
      setNotice("Downgraded to Free.");
      await load();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Could not downgrade");
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <SkeletonCards count={3} />;
  if (!data) return null;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-4xl font-semibold tracking-[-0.03em] flex items-center gap-3">
          <CreditCard className="w-8 h-8" /> Billing &amp; Plan
        </h1>
        <p className="mt-2 text-sm text-black/60 dark:text-white/60">{householdName} is on the <strong>{data.plan.name}</strong> plan.</p>
      </header>

      {!data.billingConfigured && (
        <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-4 flex items-start gap-3 text-sm">
          <FlaskConical className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-medium text-indigo-600 dark:text-indigo-400">Dev mode.</span>{" "}
            No Stripe account is connected yet, so "Upgrade" below switches the plan instantly with no real charge — enough to test every limit and feature gate. Connect Stripe (set <code className="text-xs">STRIPE_SECRET_KEY</code>) to start charging for real.
          </div>
        </div>
      )}

      {notice && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
          <PartyPopper className="w-4 h-4" /> {notice}
        </div>
      )}

      {!data.isOwner && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-600 dark:text-amber-400">
          Only the household owner can change the plan. You can still see where you stand below.
        </div>
      )}

      <section className="card p-6">
        <h2 className="text-sm font-medium mb-4">Usage on {data.plan.name}</h2>
        <div className="grid sm:grid-cols-4 gap-4">
          <UsageStat icon={Users} label="Members" used={data.usage.members} limit={data.limits.members} />
          <UsageStat icon={CheckCheck} label="Active chores" used={data.usage.activeChores} limit={data.limits.chores} />
          <UsageStat icon={Landmark} label="Active loans" used={data.usage.activeLoans} limit={data.limits.loans} />
          <UsageStat icon={HeartHandshake} label="Active goals" used={data.usage.activeGoals} limit={data.limits.goals} />
        </div>
      </section>

      <div className="grid md:grid-cols-3 gap-4">
        {data.plans.map((plan) => {
          const isCurrent = plan.id === data.planId;
          const isDowngradeTarget = plan.id === "free" && data.planId !== "free";
          return (
            <div key={plan.id} className={`card p-6 flex flex-col ${isCurrent ? "ring-2 ring-indigo-500" : ""}`}>
              <div className="flex items-center justify-between">
                <div className="text-xs uppercase tracking-wider font-medium" style={{ color: plan.accent }}>{plan.tag}</div>
                {isCurrent && <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500 text-white uppercase tracking-wide">Current</span>}
              </div>
              <div className="mt-2 text-2xl font-semibold tracking-tight">{plan.name}</div>
              <div className="mt-1 text-lg font-medium">{plan.priceLabel}</div>
              <p className="mt-2 text-sm text-black/60 dark:text-white/60">{plan.description}</p>
              <ul className="mt-4 space-y-2 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /> {f}
                  </li>
                ))}
              </ul>
              <div className="mt-5">
                {isCurrent ? (
                  <button disabled className="btn-ghost w-full justify-center opacity-50">Current plan</button>
                ) : isDowngradeTarget ? (
                  <button onClick={downgrade} disabled={!data.isOwner || busy !== null} className="btn-ghost w-full justify-center">
                    {busy === "downgrade" ? "…" : "Downgrade to Free"}
                  </button>
                ) : plan.id === "free" ? (
                  <div />
                ) : (
                  <button
                    onClick={() => upgrade(plan.id as "rhythm" | "household_hq")}
                    disabled={!data.isOwner || busy !== null}
                    className="btn-primary w-full justify-center"
                  >
                    {busy === plan.id ? "…" : `Upgrade to ${plan.name}`}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {data.billingConfigured && data.planId !== "free" && (
        <button onClick={openPortal} disabled={!data.isOwner || busy !== null} className="btn-ghost text-sm">
          {busy === "portal" ? "Opening…" : "Manage payment method & invoices"}
        </button>
      )}
    </div>
  );
}

function UsageStat({ icon: Icon, label, used, limit }: { icon: React.ComponentType<{ className?: string }>; label: string; used: number; limit: number | null }) {
  const pct = limit ? Math.min(100, (used / limit) * 100) : 0;
  const atLimit = limit !== null && used >= limit;
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs text-black/50 dark:text-white/50"><Icon className="w-3.5 h-3.5" /> {label}</div>
      <div className={`mt-1 text-lg font-semibold ${atLimit ? "text-amber-500" : ""}`}>{used}{limit !== null && <span className="text-black/40 dark:text-white/40 text-sm"> / {limit}</span>}{limit === null && <span className="text-black/40 dark:text-white/40 text-sm"> / ∞</span>}</div>
      {limit !== null && (
        <div className="mt-1.5 h-1 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
          <div className={`h-full rounded-full ${atLimit ? "bg-amber-500" : "bg-indigo-500"}`} style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}
