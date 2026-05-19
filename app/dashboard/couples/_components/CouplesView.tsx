"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Users, Heart, Eye, EyeOff, EyeIcon, Calendar, ShieldCheck, Sparkles, DollarSign, CheckCircle, XCircle, Plus, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "overview" | "pact" | "sharing" | "dates" | "purchases" | "allowance";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "pact", label: "The Pact" },
  { id: "sharing", label: "Sharing" },
  { id: "dates", label: "Money Dates" },
  { id: "purchases", label: "Big Purchases" },
  { id: "allowance", label: "Allowance" },
];

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

export default function CouplesView({ activeId, households }: { activeId: string; households: { id: string; name: string }[] }) {
  const [hid, setHid] = useState(activeId);
  const [tab, setTab] = useState<Tab>("overview");

  async function switchHousehold(newId: string) {
    setHid(newId);
    await fetch("/api/households/active", { method: "POST", body: JSON.stringify({ householdId: newId }) });
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center gap-4 justify-between">
        <div>
          <h1 className="text-4xl font-semibold tracking-[-0.03em] flex items-center gap-3">
            <Users className="w-8 h-8" /> Couples
          </h1>
          <p className="mt-2 text-sm text-black/60 dark:text-white/60">Your household, transparently.</p>
        </div>
        <div className="flex items-center gap-3">
          {households.length > 1 && (
            <select
              value={hid}
              onChange={(e) => switchHousehold(e.target.value)}
              className="rounded-full px-4 py-2 text-sm bg-black/5 dark:bg-white/10 border border-black/10 dark:border-white/10"
            >
              {households.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          )}
          <Link href="/dashboard/couples/setup" className="text-sm px-4 py-2 rounded-full border border-black/15 dark:border-white/15">
            <Plus className="w-3.5 h-3.5 inline mr-1" /> New
          </Link>
        </div>
      </header>

      <nav className="flex gap-1 overflow-x-auto pb-2 -mx-1 px-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "px-4 py-2 rounded-full text-sm whitespace-nowrap transition",
              tab === t.id ? "bg-black text-white dark:bg-white dark:text-black" : "text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5"
            )}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
        >
          {tab === "overview" && <OverviewTab hid={hid} />}
          {tab === "pact" && <PactTab hid={hid} />}
          {tab === "sharing" && <SharingTab hid={hid} />}
          {tab === "dates" && <DatesTab hid={hid} />}
          {tab === "purchases" && <PurchasesTab hid={hid} />}
          {tab === "allowance" && <AllowanceTab hid={hid} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ---------------- OVERVIEW ----------------
function OverviewTab({ hid }: { hid: string }) {
  const [view, setView] = useState<any>(null);
  const [pact, setPact] = useState<any>(null);
  const [dates, setDates] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [allowance, setAllowance] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/households/${hid}/shared-view`).then((r) => r.json()).then(setView).catch(() => {});
    fetch(`/api/households/${hid}/pact`).then((r) => r.json()).then(setPact).catch(() => {});
    fetch(`/api/households/${hid}/money-dates`).then((r) => r.json()).then(setDates).catch(() => {});
    fetch(`/api/households/${hid}/purchase-reviews?status=pending`).then((r) => r.json()).then(setReviews).catch(() => {});
    fetch(`/api/households/${hid}/allowance`).then((r) => r.json()).then(setAllowance).catch(() => {});
  }, [hid]);

  if (!view) return <div className="text-sm text-black/40 dark:text-white/40">Loading…</div>;
  const upcoming = dates?.upcoming?.[0];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 rounded-3xl border border-black/10 dark:border-white/10 p-6 bg-gradient-to-br from-rose-500/5 to-indigo-500/5">
        <div className="text-xs uppercase tracking-wider text-black/50 dark:text-white/50">Joint net worth</div>
        <div className="mt-2 text-4xl font-semibold tracking-tight">{fmt(view.netWorth)}</div>
        <div className="mt-6 grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-xs text-black/50 dark:text-white/50">Income (mo)</div>
            <div className="font-medium">{fmt(view.monthIncome)}</div>
          </div>
          <div>
            <div className="text-xs text-black/50 dark:text-white/50">Spend (mo)</div>
            <div className="font-medium">{fmt(view.monthSpend)}</div>
          </div>
          <div>
            <div className="text-xs text-black/50 dark:text-white/50">Savings rate</div>
            <div className="font-medium">{view.savingsRate}%</div>
          </div>
        </div>
      </div>
      <div className="rounded-3xl border border-black/10 dark:border-white/10 p-6">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-black/50 dark:text-white/50"><Heart className="w-3 h-3" /> Pact</div>
        {pact ? (
          <>
            <div className="mt-2 text-sm">
              Big purchases ≥ <span className="font-semibold">{fmt(pact.bigPurchaseThreshold)}</span> require review.
            </div>
            <div className="mt-1 text-xs text-black/55 dark:text-white/55">
              Savings target: {pact.savingsRateMin}% · v{pact.version} · {pact.bothSigned ? "signed by both" : "awaiting signatures"}
            </div>
          </>
        ) : <div className="text-sm text-black/40 dark:text-white/40">No pact.</div>}
      </div>
      <div className="rounded-3xl border border-black/10 dark:border-white/10 p-6">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-black/50 dark:text-white/50"><Calendar className="w-3 h-3" /> Next money date</div>
        {upcoming ? (
          <>
            <div className="mt-2 text-sm font-medium">{new Date(upcoming.scheduledAt).toLocaleString()}</div>
            <div className="mt-1 text-xs text-black/55 dark:text-white/55">{upcoming.durationMin} min · {upcoming.cadence}</div>
            <Link href={`/dashboard/couples/money-dates/${upcoming.id}`} className="mt-3 inline-flex text-xs underline">Open agenda</Link>
          </>
        ) : <div className="text-sm text-black/40 dark:text-white/40">Schedule one in the Money Dates tab.</div>}
      </div>
      <div className="rounded-3xl border border-black/10 dark:border-white/10 p-6">
        <div className="text-xs uppercase tracking-wider text-black/50 dark:text-white/50">Pending reviews</div>
        <div className="mt-2 text-3xl font-semibold">{reviews?.length || 0}</div>
        {reviews?.[0] && (
          <Link href={`/dashboard/couples/purchase-reviews/${reviews[0].id}`} className="mt-2 text-xs underline">Review first item</Link>
        )}
      </div>
      <div className="lg:col-span-2 rounded-3xl border border-black/10 dark:border-white/10 p-6">
        <div className="text-xs uppercase tracking-wider text-black/50 dark:text-white/50">Allowance this month</div>
        <div className="mt-3 grid grid-cols-2 gap-4">
          {allowance?.ledgers?.map((l: any) => {
            const pct = l.allocated > 0 ? Math.min(100, (l.spent / l.allocated) * 100) : 0;
            return (
              <div key={l.id}>
                <div className="flex justify-between text-sm"><span>{l.user?.name}</span><span>{fmt(l.spent)} / {fmt(l.allocated)}</span></div>
                <div className="mt-2 h-2 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
                  <div className={cn("h-full", pct > 90 ? "bg-rose-500" : "bg-indigo-500")} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ---------------- PACT ----------------
function PactTab({ hid }: { hid: string }) {
  const [pact, setPact] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    const [p, h] = await Promise.all([
      fetch(`/api/households/${hid}/pact`).then((r) => r.json()),
      fetch(`/api/households/${hid}`).then((r) => r.json()),
    ]);
    setPact(p);
    setMembers(h.members || []);
    setForm({
      bigPurchaseThreshold: p.bigPurchaseThreshold,
      emergencyFundFloor: p.emergencyFundFloor,
      savingsRateMin: p.savingsRateMin,
      personalAllowanceA: p.personalAllowanceA,
      personalAllowanceB: p.personalAllowanceB,
      requireDualSignOff: p.requireDualSignOff,
    });
  }
  useEffect(() => { load(); }, [hid]);

  async function save() {
    setSaving(true);
    await fetch(`/api/households/${hid}/pact`, { method: "PATCH", body: JSON.stringify(form) });
    await load();
    setSaving(false);
  }
  async function sign() {
    await fetch(`/api/households/${hid}/pact/sign`, { method: "POST" });
    await load();
  }

  if (!pact || !form) return <div className="text-sm text-black/40 dark:text-white/40">Loading…</div>;
  const signedUserIds = new Set(pact.signatures?.filter((s: any) => s.version === pact.version).map((s: any) => s.userId) || []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 rounded-3xl border border-black/10 dark:border-white/10 p-6 space-y-5">
        <div className="text-sm font-semibold">Terms</div>
        {[
          ["bigPurchaseThreshold", "Big purchase threshold ($)", "Any expense at or above this triggers a partner check."],
          ["emergencyFundFloor", "Emergency fund floor ($)", "Combined savings should not dip below this."],
          ["savingsRateMin", "Savings rate min (%)", "Target percentage of joint income."],
          ["personalAllowanceA", "Allowance A ($/mo)", "Monthly no-questions-asked allowance for member 1."],
          ["personalAllowanceB", "Allowance B ($/mo)", "Same, for member 2."],
        ].map(([k, label, hint]) => (
          <label key={k} className="block">
            <div className="text-xs text-black/55 dark:text-white/55">{label}</div>
            <input
              type="number"
              value={form[k]}
              onChange={(e) => setForm({ ...form, [k]: Number(e.target.value) })}
              className="mt-1 w-full rounded-xl border border-black/10 dark:border-white/15 bg-transparent px-3 py-2 text-sm"
            />
            <div className="mt-1 text-[11px] text-black/40 dark:text-white/40">{hint}</div>
          </label>
        ))}
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.requireDualSignOff} onChange={(e) => setForm({ ...form, requireDualSignOff: e.target.checked })} />
          Require dual sign-off (expired reviews stay denied unless both approve)
        </label>
        <button onClick={save} disabled={saving} className="px-5 py-2 rounded-full bg-black text-white dark:bg-white dark:text-black text-sm font-medium disabled:opacity-50">
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
      <div className="rounded-3xl border border-black/10 dark:border-white/10 p-6 space-y-4">
        <div className="text-sm font-semibold flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Signatures · v{pact.version}</div>
        <ul className="space-y-2">
          {members.filter((m: any) => m.accepted && m.userId).map((m: any) => {
            const sig = pact.signatures?.find((s: any) => s.userId === m.userId && s.version === pact.version);
            return (
              <li key={m.id} className="flex items-center justify-between text-sm">
                <span>{m.user?.name || m.user?.email}</span>
                {sig ? (
                  <span className="text-xs text-emerald-500">Signed {new Date(sig.signedAt).toLocaleDateString()}</span>
                ) : (
                  <span className="text-xs text-amber-500">Pending</span>
                )}
              </li>
            );
          })}
        </ul>
        <button onClick={sign} className="w-full px-4 py-2 rounded-full border border-black/15 dark:border-white/15 text-sm">
          Sign current version
        </button>
        {pact.bothSigned && <div className="text-xs text-emerald-500 text-center">Both partners signed.</div>}
      </div>
    </div>
  );
}

// ---------------- SHARING ----------------
function SharingTab({ hid }: { hid: string }) {
  const [data, setData] = useState<any>(null);
  async function load() {
    const d = await fetch(`/api/households/${hid}`).then((r) => r.json());
    setData(d);
  }
  useEffect(() => { load(); }, [hid]);
  async function setLevel(aid: string, level: string) {
    await fetch(`/api/households/${hid}/accounts/${aid}/share`, { method: "POST", body: JSON.stringify({ level }) });
    await load();
  }
  if (!data) return <div className="text-sm text-black/40 dark:text-white/40">Loading…</div>;
  const byAcct = new Map((data.myShares || []).map((s: any) => [s.accountId, s.level]));
  const icons: Record<string, JSX.Element> = {
    HIDDEN: <EyeOff className="w-3 h-3" />,
    BALANCE: <Eye className="w-3 h-3" />,
    FULL: <EyeIcon className="w-3 h-3" />,
  };
  return (
    <div className="space-y-4">
      <p className="text-sm text-black/55 dark:text-white/55">Decide how much of each of <em>your</em> accounts your partner sees. You can change this anytime.</p>
      {data.myAccounts.map((a: any) => {
        const lvl = (byAcct.get(a.id) as string) || "HIDDEN";
        return (
          <div key={a.id} className="rounded-2xl border border-black/10 dark:border-white/10 p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium">{a.name}</div>
              <div className="text-xs text-black/50 dark:text-white/50">{a.type} · {fmt(a.balance)}</div>
            </div>
            <div className="flex gap-1 p-1 rounded-full bg-black/5 dark:bg-white/5">
              {(["HIDDEN", "BALANCE", "FULL"] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLevel(a.id, l)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs flex items-center gap-1.5 transition",
                    lvl === l ? "bg-white dark:bg-black shadow-sm" : "text-black/55 dark:text-white/55"
                  )}
                >
                  {icons[l]} {l[0] + l.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------- MONEY DATES ----------------
function DatesTab({ hid }: { hid: string }) {
  const [data, setData] = useState<any>(null);
  const [scheduledAt, setScheduledAt] = useState<string>("");
  const [cadence, setCadence] = useState<string>("WEEKLY");
  const [durationMin, setDurationMin] = useState<number>(30);

  async function load() {
    const d = await fetch(`/api/households/${hid}/money-dates`).then((r) => r.json());
    setData(d);
  }
  useEffect(() => { load(); }, [hid]);

  async function schedule() {
    if (!scheduledAt) return;
    await fetch(`/api/households/${hid}/money-dates`, {
      method: "POST",
      body: JSON.stringify({ scheduledAt: new Date(scheduledAt).toISOString(), cadence, durationMin }),
    });
    setScheduledAt("");
    await load();
  }
  if (!data) return <div className="text-sm text-black/40 dark:text-white/40">Loading…</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <div className="text-sm font-semibold">Upcoming</div>
        {data.upcoming.length === 0 && <div className="text-sm text-black/40 dark:text-white/40">No upcoming dates.</div>}
        {data.upcoming.map((md: any) => (
          <Link key={md.id} href={`/dashboard/couples/money-dates/${md.id}`} className="block rounded-2xl border border-black/10 dark:border-white/10 p-4 hover:border-black/20 dark:hover:border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">{new Date(md.scheduledAt).toLocaleString()}</div>
                <div className="text-xs text-black/50 dark:text-white/50">{md.durationMin} min · {md.cadence} · {md.status}</div>
              </div>
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>
        ))}

        <div className="pt-4 text-sm font-semibold">History</div>
        {data.history.map((md: any) => (
          <div key={md.id} className="rounded-2xl border border-black/10 dark:border-white/10 p-4 flex items-center justify-between">
            <div>
              <div className="text-sm">{new Date(md.scheduledAt).toLocaleString()}</div>
              <div className="text-xs text-black/50 dark:text-white/50">{md.status}</div>
            </div>
            <Link href={`/dashboard/couples/money-dates/${md.id}`} className="text-xs underline">Open</Link>
          </div>
        ))}
      </div>
      <div className="rounded-3xl border border-black/10 dark:border-white/10 p-5 space-y-3">
        <div className="text-sm font-semibold">Schedule</div>
        <label className="block">
          <div className="text-xs text-black/55 dark:text-white/55">When</div>
          <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="mt-1 w-full rounded-xl border border-black/10 dark:border-white/15 bg-transparent px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <div className="text-xs text-black/55 dark:text-white/55">Cadence</div>
          <select value={cadence} onChange={(e) => setCadence(e.target.value)} className="mt-1 w-full rounded-xl border border-black/10 dark:border-white/15 bg-transparent px-3 py-2 text-sm">
            <option>WEEKLY</option><option>BIWEEKLY</option><option>MONTHLY</option><option>ONEOFF</option>
          </select>
        </label>
        <label className="block">
          <div className="text-xs text-black/55 dark:text-white/55">Duration (min)</div>
          <input type="number" value={durationMin} onChange={(e) => setDurationMin(Number(e.target.value))} className="mt-1 w-full rounded-xl border border-black/10 dark:border-white/15 bg-transparent px-3 py-2 text-sm" />
        </label>
        <button onClick={schedule} className="w-full px-4 py-2 rounded-full bg-black text-white dark:bg-white dark:text-black text-sm font-medium">Schedule</button>
      </div>
    </div>
  );
}

// ---------------- PURCHASES ----------------
function PurchasesTab({ hid }: { hid: string }) {
  const [reviews, setReviews] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");
  const [me, setMe] = useState<string>("");

  async function load() {
    const [list, who] = await Promise.all([
      fetch(`/api/households/${hid}/purchase-reviews?status=${filter === "pending" ? "pending" : "all"}`).then((r) => r.json()),
      fetch("/api/auth/me").then((r) => r.json()).catch(() => ({})),
    ]);
    setReviews(list);
    setMe(who?.id || "");
  }
  useEffect(() => { load(); }, [hid, filter]);

  async function decide(id: string, status: string) {
    await fetch(`/api/purchase-reviews/${id}/decide`, { method: "POST", body: JSON.stringify({ status }) });
    await load();
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {["all", "pending"].map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={cn("px-3 py-1.5 rounded-full text-xs", filter === f ? "bg-black text-white dark:bg-white dark:text-black" : "border border-black/10 dark:border-white/15")}>
            {f}
          </button>
        ))}
      </div>
      {reviews.length === 0 && <div className="text-sm text-black/40 dark:text-white/40">Nothing to review.</div>}
      {reviews.map((r) => {
        const isApprover = r.approverUserId === me;
        const pending = r.status === "PENDING";
        return (
          <div key={r.id} className="rounded-2xl border border-black/10 dark:border-white/10 p-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium">{r.transaction?.description || "Purchase"} · {fmt(r.amount)}</div>
              <div className="text-xs text-black/55 dark:text-white/55">
                {r.transaction?.account?.name} · from {r.requester?.name} · {new Date(r.createdAt).toLocaleString()}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {pending && isApprover && (
                <>
                  <button onClick={() => decide(r.id, "APPROVED")} className="px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Approve</button>
                  <button onClick={() => decide(r.id, "DENIED")} className="px-3 py-1.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-1"><XCircle className="w-3 h-3" /> Deny</button>
                </>
              )}
              {pending && !isApprover && <span className="text-xs text-amber-500">Awaiting partner</span>}
              {!pending && <span className={cn("text-xs px-2 py-1 rounded-full", r.status === "APPROVED" ? "bg-emerald-500/10 text-emerald-600" : "bg-black/5 dark:bg-white/10 text-black/60 dark:text-white/60")}>{r.status}</span>}
              <Link href={`/dashboard/couples/purchase-reviews/${r.id}`} className="text-xs underline">Details</Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------- ALLOWANCE ----------------
function AllowanceTab({ hid }: { hid: string }) {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    fetch(`/api/households/${hid}/allowance`).then((r) => r.json()).then(setData);
  }, [hid]);
  if (!data) return <div className="text-sm text-black/40 dark:text-white/40">Loading…</div>;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.ledgers.map((l: any) => {
          const pct = l.allocated > 0 ? Math.min(100, (l.spent / l.allocated) * 100) : 0;
          const remaining = Math.max(0, l.allocated - l.spent);
          const r = 64;
          const c = 2 * Math.PI * r;
          const offset = c * (1 - pct / 100);
          return (
            <div key={l.id} className="rounded-3xl border border-black/10 dark:border-white/10 p-6 flex items-center gap-5">
              <svg width="160" height="160" viewBox="0 0 160 160">
                <circle cx="80" cy="80" r={r} fill="none" stroke="currentColor" strokeOpacity="0.1" strokeWidth="12" />
                <circle cx="80" cy="80" r={r} fill="none" stroke="url(#g)" strokeWidth="12" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset} transform="rotate(-90 80 80)" />
                <defs>
                  <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#6366f1" />
                    <stop offset="1" stopColor="#ec4899" />
                  </linearGradient>
                </defs>
                <text x="80" y="76" textAnchor="middle" className="fill-current text-xs">remaining</text>
                <text x="80" y="98" textAnchor="middle" className="fill-current font-semibold" style={{ fontSize: 18 }}>{fmt(remaining)}</text>
              </svg>
              <div>
                <div className="text-sm font-semibold">{l.user?.name}</div>
                <div className="text-xs text-black/55 dark:text-white/55">Spent {fmt(l.spent)} of {fmt(l.allocated)}</div>
                <div className="mt-1 text-[11px] text-black/40 dark:text-white/40">{Math.round(pct)}% used · {data.month}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div>
        <div className="text-sm font-semibold mb-2">Allowance transactions this month</div>
        <ul className="space-y-2">
          {data.transactions.length === 0 && <li className="text-sm text-black/40 dark:text-white/40">No allowance spend yet.</li>}
          {data.transactions.map((t: any) => (
            <li key={t.id} className="rounded-xl border border-black/10 dark:border-white/10 p-3 flex justify-between text-sm">
              <span>{t.description}</span>
              <span>{fmt(t.amount)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
