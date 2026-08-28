"use client";
import { useEffect, useState } from "react";
import { HeartHandshake, Plus, ThumbsUp, AlertTriangle, PartyPopper } from "lucide-react";
import Modal from "../../_components/Modal";
import UpgradeNotice, { isUpgradeError } from "../_components/UpgradeNotice";
import { formatCurrency, formatDate } from "@/lib/utils";

type Goal = {
  id: string;
  name: string;
  emoji: string;
  description: string | null;
  targetAmount: number;
  currentAmount: number;
  category: "ESSENTIAL" | "ELECTIVE";
  status: "ACTIVE" | "FUNDED" | "ARCHIVED";
  deadline: string | null;
  voteCount: number;
  myVote: boolean;
  neglected: boolean;
  priorityRank: number | null;
};

export default function HouseholdGoalsView({ hid, meId, currency }: { hid: string; meId: string; currency: string }) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [contributing, setContributing] = useState<Goal | null>(null);
  const [goalLimit, setGoalLimit] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    const data = await fetch(`/api/households/${hid}/goals`).then((r) => r.json());
    setGoals(data.goals || []);
    setLoading(false);
  }
  async function loadPlan() {
    const d = await fetch(`/api/households/${hid}/plan`).then((r) => r.json()).catch(() => null);
    if (d) setGoalLimit(d.limits?.goals ?? null);
  }
  useEffect(() => { load(); loadPlan(); }, [hid]);

  async function vote(goalId: string) {
    setGoals((gs) => gs.map((g) => (g.id === goalId ? { ...g, myVote: !g.myVote, voteCount: g.voteCount + (g.myVote ? -1 : 1) } : g)));
    await fetch(`/api/households/${hid}/goals/${goalId}/vote`, { method: "POST" }).catch(() => {});
    load();
  }

  const elective = goals.filter((g) => g.category === "ELECTIVE" && g.status === "ACTIVE").sort((a, b) => (a.priorityRank ?? 99) - (b.priorityRank ?? 99));
  const essential = goals.filter((g) => g.category === "ESSENTIAL" && g.status === "ACTIVE");
  const funded = goals.filter((g) => g.status === "FUNDED");

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-semibold tracking-[-0.03em] flex items-center gap-3">
            <HeartHandshake className="w-8 h-8" /> Household Goals
          </h1>
          <p className="mt-2 text-sm text-black/60 dark:text-white/60">Pool money for what you want, and never let the boring stuff get forgotten.</p>
        </div>
        <div className="flex items-center gap-3">
          {goalLimit !== null && (
            <span className="text-xs text-black/40 dark:text-white/40">
              {elective.length + essential.length}/{goalLimit} active goals
            </span>
          )}
          <button onClick={() => setShowNew(true)} className="btn-primary"><Plus className="w-4 h-4" /> New goal</button>
        </div>
      </header>

      {loading ? (
        <div className="text-black/40 dark:text-white/40 text-sm">Loading…</div>
      ) : (
        <>
          <section>
            <h2 className="text-sm font-medium uppercase tracking-wider text-black/40 dark:text-white/40 mb-3">
              Competing for the household's attention
            </h2>
            {elective.length === 0 ? (
              <div className="card p-8 text-center text-sm text-black/50 dark:text-white/50">
                No elective goals yet — the PS5 and the pool are both still just ideas.
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-3">
                {elective.map((g, i) => (
                  <GoalCard key={g.id} g={g} currency={currency} meId={meId} onVote={() => vote(g.id)} onContribute={() => setContributing(g)} topPick={i === 0 && elective.length > 1} />
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-sm font-medium uppercase tracking-wider text-black/40 dark:text-white/40 mb-3">Essential — keep the house running</h2>
            {essential.length === 0 ? (
              <div className="card p-8 text-center text-sm text-black/50 dark:text-white/50">No essential goals tracked yet.</div>
            ) : (
              <div className="grid md:grid-cols-2 gap-3">
                {essential.map((g) => (
                  <GoalCard key={g.id} g={g} currency={currency} meId={meId} onVote={() => vote(g.id)} onContribute={() => setContributing(g)} />
                ))}
              </div>
            )}
          </section>

          {funded.length > 0 && (
            <section>
              <h2 className="text-sm font-medium uppercase tracking-wider text-black/40 dark:text-white/40 mb-3">Fully funded 🎉</h2>
              <div className="flex flex-wrap gap-2">
                {funded.map((g) => (
                  <span key={g.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm">
                    <PartyPopper className="w-3.5 h-3.5" /> {g.emoji} {g.name}
                  </span>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {showNew && <NewGoalModal hid={hid} onClose={() => setShowNew(false)} onSaved={async () => { setShowNew(false); await load(); }} />}
      {contributing && (
        <ContributeModal hid={hid} goal={contributing} currency={currency} onClose={() => setContributing(null)} onSaved={async () => { setContributing(null); await load(); }} />
      )}
    </div>
  );
}

function GoalCard({ g, currency, meId, onVote, onContribute, topPick }: { g: Goal; currency: string; meId: string; onVote: () => void; onContribute: () => void; topPick?: boolean }) {
  const pct = g.targetAmount > 0 ? Math.min(100, (g.currentAmount / g.targetAmount) * 100) : 100;
  return (
    <div className={`card p-5 ${g.neglected ? "border-amber-500/40" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-lg">{g.emoji}</span>
            <span className="font-medium">{g.name}</span>
            {topPick && <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-500 uppercase tracking-wide">Household pick</span>}
            {g.neglected && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 uppercase tracking-wide flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Neglected</span>}
          </div>
          {g.description && <p className="mt-1 text-xs text-black/50 dark:text-white/50">{g.description}</p>}
          {g.deadline && <p className="mt-1 text-[11px] text-black/40 dark:text-white/40">Target date {formatDate(g.deadline)}</p>}
        </div>
        {g.category === "ELECTIVE" && (
          <button onClick={onVote} className={`shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs ${g.myVote ? "bg-indigo-500 text-white" : "bg-black/5 dark:bg-white/10"}`}>
            <ThumbsUp className="w-3.5 h-3.5" /> {g.voteCount}
          </button>
        )}
      </div>
      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="font-semibold">{formatCurrency(g.currentAmount, currency)}</span>
        <span className="text-black/40 dark:text-white/40">of {formatCurrency(g.targetAmount, currency)}</span>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
        <div className={`h-full rounded-full ${g.neglected ? "bg-amber-500" : "bg-gradient-to-r from-indigo-500 to-purple-500"}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-3 flex justify-end">
        <button onClick={onContribute} className="btn-ghost text-sm">Contribute</button>
      </div>
    </div>
  );
}

function NewGoalModal({ hid, onClose, onSaved }: { hid: string; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🎯");
  const [description, setDescription] = useState("");
  const [targetAmount, setTarget] = useState("");
  const [category, setCategory] = useState<"ESSENTIAL" | "ELECTIVE">("ELECTIVE");
  const [deadline, setDeadline] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [upgrade, setUpgrade] = useState(false);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setUpgrade(false);
    if (!name.trim()) return setError("Name is required");
    if (!targetAmount || Number(targetAmount) <= 0) return setError("Enter a target amount");
    setSaving(true);
    try {
      const res = await fetch(`/api/households/${hid}/goals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, emoji, description: description || undefined, targetAmount: Number(targetAmount), category, deadline: deadline || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (isUpgradeError(data)) { setUpgrade(true); setError(data.error); return; }
        throw new Error(data.error || "Save failed");
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally { setSaving(false); }
  }

  return (
    <Modal onClose={onClose} title="New household goal">
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-[64px_1fr] gap-3">
          <div>
            <label className="text-xs text-black/50 dark:text-white/50">Emoji</label>
            <input className="input mt-1 text-center" maxLength={4} value={emoji} onChange={(e) => setEmoji(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-black/50 dark:text-white/50">Name</label>
            <input className="input mt-1" required placeholder="PS5" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="text-xs text-black/50 dark:text-white/50">Description (optional)</label>
          <input className="input mt-1" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-black/50 dark:text-white/50">Target amount</label>
            <input className="input mt-1" type="number" step="0.01" required value={targetAmount} onChange={(e) => setTarget(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-black/50 dark:text-white/50">Category</label>
            <select className="input mt-1" value={category} onChange={(e) => setCategory(e.target.value as typeof category)}>
              <option value="ELECTIVE">Elective (fun, competes for votes)</option>
              <option value="ESSENTIAL">Essential (gets flagged if neglected)</option>
            </select>
          </div>
        </div>
        <div>
          <label className="text-xs text-black/50 dark:text-white/50">Target date (optional)</label>
          <input className="input mt-1" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </div>
        {error && (upgrade ? <UpgradeNotice message={error} /> : <div className="text-sm text-red-400">{error}</div>)}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <button disabled={saving} className="btn-primary">{saving ? "Saving…" : "Save"}</button>
        </div>
      </form>
    </Modal>
  );
}

function ContributeModal({ hid, goal, currency, onClose, onSaved }: { hid: string; goal: Goal; currency: string; onClose: () => void; onSaved: () => void }) {
  const [source, setSource] = useState<"CASH" | "CROWNS">("CASH");
  const [amount, setAmount] = useState("");
  const [crowns, setCrowns] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (source === "CASH" && (!amount || Number(amount) <= 0)) return setError("Enter an amount");
    if (source === "CROWNS" && (!crowns || Number(crowns) <= 0)) return setError("Enter how many Crowns");
    setSaving(true);
    try {
      const body = source === "CASH" ? { source, amount: Number(amount) } : { source, crowns: Number(crowns) };
      const res = await fetch(`/api/households/${hid}/goals/${goal.id}/contribute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Contribution failed");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Contribution failed");
    } finally { setSaving(false); }
  }

  return (
    <Modal onClose={onClose} title={`Contribute to ${goal.emoji} ${goal.name}`}>
      <form onSubmit={submit} className="space-y-3">
        <div className="text-sm text-black/60 dark:text-white/60">
          {formatCurrency(goal.currentAmount, currency)} of {formatCurrency(goal.targetAmount, currency)} so far.
        </div>
        <div className="flex gap-1 rounded-full bg-black/5 dark:bg-white/5 p-1 w-fit">
          {(["CASH", "CROWNS"] as const).map((s) => (
            <button type="button" key={s} onClick={() => setSource(s)} className={`px-3 py-1 rounded-full text-xs transition ${source === s ? "bg-white dark:bg-black shadow-sm font-medium" : "text-black/50 dark:text-white/50"}`}>
              {s === "CASH" ? "Cash" : "Crowns"}
            </button>
          ))}
        </div>
        {source === "CASH" ? (
          <div>
            <label className="text-xs text-black/50 dark:text-white/50">Amount</label>
            <input className="input mt-1" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
        ) : (
          <div>
            <label className="text-xs text-black/50 dark:text-white/50">Crowns to spend (10 Crowns = $1)</label>
            <input className="input mt-1" type="number" min={1} value={crowns} onChange={(e) => setCrowns(e.target.value)} />
          </div>
        )}
        {error && <div className="text-sm text-red-400">{error}</div>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <button disabled={saving} className="btn-primary">{saving ? "Saving…" : "Contribute"}</button>
        </div>
      </form>
    </Modal>
  );
}
