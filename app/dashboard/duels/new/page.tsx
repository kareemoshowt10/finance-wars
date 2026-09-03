"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Swords, Mail, Bot } from "lucide-react";

type Account = { id: string; name: string; type: string; balance: number };
type Goal = { id: string; name: string; targetAmount: number };

export default function NewDuelPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // step 1
  const [duelMode, setDuelMode] = useState<"DUEL" | "COOP">("DUEL");
  const [goalId, setGoalId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [targetAmount, setTargetAmount] = useState(2000);

  // step 2
  const [sprintLengthDays, setSprintLengthDays] = useState<3 | 7 | 14>(7);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 56);
    return d.toISOString().slice(0, 10);
  });

  // step 3
  const [stakeText, setStakeText] = useState("");
  const [autoPenaltyEnabled, setAutoPenaltyEnabled] = useState(false);
  const [stakeAmount, setStakeAmount] = useState(50);
  const [stakePercentCap, setStakePercentCap] = useState(10);
  const [stakeAccountId, setStakeAccountId] = useState("");

  // step 4
  const [mode, setMode] = useState<"invite" | "practice">("invite");
  const [inviteEmail, setInviteEmail] = useState("");
  const [practiceAvg, setPracticeAvg] = useState(50);

  useEffect(() => {
    fetch("/api/accounts").then((r) => r.json()).then(setAccounts).catch(() => {});
    fetch("/api/goals").then((r) => r.json()).then(setGoals).catch(() => {});
    fetch("/api/auth/me").then((r) => r.json()).then((me) => {
      if (me?.defaultStakeAccountId) setStakeAccountId(me.defaultStakeAccountId);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (goalId) {
      const g = goals.find((x) => x.id === goalId);
      if (g) {
        setTitle(g.name);
        setTargetAmount(g.targetAmount);
      }
    }
  }, [goalId, goals]);

  const sprintsFit = Math.max(
    0,
    Math.floor((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000 / sprintLengthDays)
  );

  async function submit() {
    setErr(null);
    setBusy(true);
    try {
      const body: Record<string, unknown> = {
        title,
        mode: duelMode,
        goalId: goalId || undefined,
        targetAmount,
        sprintLengthDays,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        stakeText: duelMode === "COOP" ? (stakeText || "Build it together") : stakeText,
        autoPenaltyEnabled: duelMode === "COOP" ? false : autoPenaltyEnabled,
        stakeAccountId: stakeAccountId || undefined,
      };
      if (autoPenaltyEnabled) {
        body.stakeAmount = stakeAmount;
        body.stakePercentCap = stakePercentCap;
      }
      if (mode === "invite") body.inviteEmail = inviteEmail;
      else body.practiceOpponentDailyAvg = practiceAvg;
      const res = await fetch("/api/duels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data?.error || "Failed");
        setBusy(false);
        return;
      }
      router.push(`/dashboard/duels/${data.id}`);
    } catch (e) {
      setErr(String(e));
      setBusy(false);
    }
  }

  const canNext = [
    title.length > 0 && targetAmount > 0,
    sprintsFit >= 1,
    duelMode === "COOP" ? true : (stakeText.length > 0 && (!autoPenaltyEnabled || (stakeAmount > 0 && !!stakeAccountId))),
    mode === "invite" ? /.+@.+\..+/.test(inviteEmail) : practiceAvg > 0,
  ][step];

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <Swords className="w-7 h-7" />
        <h1 className="text-3xl font-semibold tracking-[-0.03em]">New duel</h1>
      </div>
      <div className="flex items-center gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={"h-1 flex-1 rounded-full " + (i <= step ? "bg-gradient-to-r from-indigo-500 to-fuchsia-500" : "bg-black/10 dark:bg-white/10")} />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.18 }}
          className="card p-6 space-y-5"
        >
          {step === 0 && (
            <>
              <h2 className="text-lg font-medium">Mode</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setDuelMode("DUEL")}
                  className={"text-left rounded-2xl border p-4 transition " + (duelMode === "DUEL" ? "border-fuchsia-500 bg-fuchsia-500/5" : "border-black/10 dark:border-white/10")}
                >
                  <div className="text-sm font-medium">Duel · Head-to-head</div>
                  <div className="mt-1 text-xs text-black/55 dark:text-white/55">Compete for sprint wins. Loser pays the stake. Best when you want pressure.</div>
                </button>
                <button
                  type="button"
                  onClick={() => setDuelMode("COOP")}
                  className={"text-left rounded-2xl border p-4 transition " + (duelMode === "COOP" ? "border-emerald-500 bg-emerald-500/5" : "border-black/10 dark:border-white/10")}
                >
                  <div className="text-sm font-medium">Co-op Quest · Boss fight</div>
                  <div className="mt-1 text-xs text-black/55 dark:text-white/55">Both contributions stack toward one goal. Sprint wins when combined target is hit. No stakes.</div>
                </button>
              </div>
              <h2 className="text-lg font-medium">Goal & target</h2>
              <div className="space-y-2">
                <label htmlFor="new-link-an-existing-goal" className="text-xs uppercase tracking-[0.15em] text-black/50 dark:text-white/50">Link an existing goal</label>
                <select id="new-link-an-existing-goal" value={goalId} onChange={(e) => setGoalId(e.target.value)} className="input">
                  <option value="">— none —</option>
                  {goals.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label htmlFor="new-title" className="text-xs uppercase tracking-[0.15em] text-black/50 dark:text-white/50">Title</label>
                <input id="new-title" value={title} onChange={(e) => setTitle(e.target.value)} className="input" placeholder="Hawaii Sprint" />
              </div>
              <div className="space-y-2">
                <label htmlFor="new-target" className="text-xs uppercase tracking-[0.15em] text-black/50 dark:text-white/50">Target ($)</label>
                <input id="new-target" type="number" value={targetAmount} onChange={(e) => setTargetAmount(Number(e.target.value))} className="input" />
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <h2 className="text-lg font-medium">Schedule</h2>
              <div className="flex gap-2">
                {[3, 7, 14].map((n) => (
                  <button
                    key={n}
                    onClick={() => setSprintLengthDays(n as 3 | 7 | 14)}
                    className={"flex-1 px-4 py-3 rounded-xl border transition " + (sprintLengthDays === n ? "border-indigo-500 bg-indigo-500/10" : "border-black/10 dark:border-white/10")}
                  >
                    <div className="text-lg font-semibold">{n}-day</div>
                    <div className="text-xs text-black/50 dark:text-white/50">sprints</div>
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label htmlFor="new-start" className="text-xs uppercase tracking-[0.15em] text-black/50 dark:text-white/50">Start</label>
                  <input id="new-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input" />
                </div>
                <div className="space-y-2">
                  <label htmlFor="new-end" className="text-xs uppercase tracking-[0.15em] text-black/50 dark:text-white/50">End</label>
                  <input id="new-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input" />
                </div>
              </div>
              <div className="text-sm text-black/60 dark:text-white/60">{sprintsFit} sprint{sprintsFit === 1 ? "" : "s"} will fit.</div>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="text-lg font-medium">Stake</h2>
              <div className="space-y-2">
                <label htmlFor="new-loser-must" className="text-xs uppercase tracking-[0.15em] text-black/50 dark:text-white/50">Loser must…</label>
                <input id="new-loser-must" value={stakeText} onChange={(e) => setStakeText(e.target.value)} className="input" placeholder="Plan the next vacation" />
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={autoPenaltyEnabled} onChange={(e) => setAutoPenaltyEnabled(e.target.checked)} />
                Enable automatic stake transfer
              </label>
              {autoPenaltyEnabled && (
                <div className="space-y-3 pl-6 border-l-2 border-indigo-500/40">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label htmlFor="new-stake" className="text-xs uppercase tracking-[0.15em] text-black/50 dark:text-white/50">Stake $</label>
                      <input id="new-stake" type="number" value={stakeAmount} onChange={(e) => setStakeAmount(Number(e.target.value))} className="input" />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="new-cap-of-balance" className="text-xs uppercase tracking-[0.15em] text-black/50 dark:text-white/50">% cap of balance</label>
                      <input id="new-cap-of-balance" type="number" value={stakePercentCap} onChange={(e) => setStakePercentCap(Number(e.target.value))} className="input" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="new-your-stake-account" className="text-xs uppercase tracking-[0.15em] text-black/50 dark:text-white/50">Your stake account</label>
                    <select id="new-your-stake-account" value={stakeAccountId} onChange={(e) => setStakeAccountId(e.target.value)} className="input">
                      <option value="">— select —</option>
                      {accounts.map((a) => <option key={a.id} value={a.id}>{a.name} (${a.balance.toFixed(0)})</option>)}
                    </select>
                  </div>
                </div>
              )}
            </>
          )}

          {step === 3 && (
            <>
              <h2 className="text-lg font-medium">Opponent</h2>
              <div className="flex gap-2">
                <button onClick={() => setMode("invite")} className={"flex-1 px-4 py-3 rounded-xl border flex items-center justify-center gap-2 " + (mode === "invite" ? "border-indigo-500 bg-indigo-500/10" : "border-black/10 dark:border-white/10")}>
                  <Mail className="w-4 h-4" />Invite partner
                </button>
                <button onClick={() => setMode("practice")} className={"flex-1 px-4 py-3 rounded-xl border flex items-center justify-center gap-2 " + (mode === "practice" ? "border-indigo-500 bg-indigo-500/10" : "border-black/10 dark:border-white/10")}>
                  <Bot className="w-4 h-4" />Practice mode
                </button>
              </div>
              {mode === "invite" ? (
                <div className="space-y-2">
                  <label htmlFor="new-email" className="text-xs uppercase tracking-[0.15em] text-black/50 dark:text-white/50">Email</label>
                  <input id="new-email" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} className="input" placeholder="partner@email.com" />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-xs uppercase tracking-[0.15em] text-black/50 dark:text-white/50">Practice opponent daily average</div>
                  <input type="range" min={20} max={200} step={5} value={practiceAvg} onChange={(e) => setPracticeAvg(Number(e.target.value))} className="w-full" />
                  <div className="text-3xl font-semibold tracking-[-0.03em]">${practiceAvg}<span className="text-sm text-black/50 dark:text-white/50">/day</span></div>
                </div>
              )}
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {err && <div className="text-rose-500 text-sm">{err}</div>}

      <div className="flex justify-between">
        <button disabled={step === 0 || busy} onClick={() => setStep(step - 1)} className="btn-secondary disabled:opacity-30"><ArrowLeft className="w-4 h-4" />Back</button>
        {step < 3 ? (
          <button disabled={!canNext} onClick={() => setStep(step + 1)} className="btn-primary disabled:opacity-30">Next<ArrowRight className="w-4 h-4" /></button>
        ) : (
          <button disabled={!canNext || busy} onClick={submit} className="btn-primary disabled:opacity-30">{busy ? "Creating…" : "Start duel"}</button>
        )}
      </div>
    </div>
  );
}
