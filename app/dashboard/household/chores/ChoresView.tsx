"use client";
import { useEffect, useMemo, useState } from "react";
import { CheckCheck, Plus, Crown, Flame, Sparkles, Lock, AlertCircle } from "lucide-react";
import Modal from "../../_components/Modal";
import UpgradeNotice, { isUpgradeError } from "../_components/UpgradeNotice";
import { SkeletonCards } from "../../_components/Skeleton";
import { isChoreDue, computeStreak, applyCompletionToLeaderboard } from "@/lib/chores";
import { haptic, celebrationHaptic } from "@/lib/haptics";

type Chore = {
  id: string;
  name: string;
  emoji: string;
  description: string | null;
  frequency: "DAILY" | "WEEKLY" | "ONEOFF";
  category: "ESSENTIAL" | "ELECTIVE";
  crownValue: number;
  xpValue: number;
  active: boolean;
};
type Completion = { id: string; choreId: string; userId: string; completedAt: string; crownsAwarded: number; xpAwarded: number };
type Member = { userId: string; name: string };
type LeaderboardEntry = { userId: string; name: string; completions: number; crowns: number; xp: number; rank: number };
type PerChore = { choreId: string; name: string; emoji: string; doneBy: { userId: string; name: string; count: number }[] };

const RANGES = [
  { id: "week", label: "This week" },
  { id: "month", label: "This month" },
  { id: "all", label: "All time" },
];

export default function ChoresView({ hid, meId }: { hid: string; meId: string }) {
  const [chores, setChores] = useState<Chore[]>([]);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [perChore, setPerChore] = useState<PerChore[]>([]);
  const [range, setRange] = useState("week");
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [completing, setCompleting] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ text: string; tone: "good" | "bad" } | null>(null);
  const [timezone, setTimezone] = useState<string | undefined>(undefined);
  const [choreLimit, setChoreLimit] = useState<number | null>(null);
  const [fullHistory, setFullHistory] = useState(true);

  async function load() {
    const data = await fetch(`/api/households/${hid}/chores`).then((r) => r.json());
    setChores(data.chores || []);
    setCompletions(data.completions || []);
    setMembers(data.members || []);
    setTimezone(data.timezone);
    setLoading(false);
  }
  async function loadPlan() {
    const d = await fetch(`/api/households/${hid}/plan`).then((r) => r.json()).catch(() => null);
    if (!d) return;
    setChoreLimit(d.limits?.chores ?? null);
    setFullHistory(d.plan?.included?.includes("full_history") ?? false);
  }
  async function loadLeaderboard() {
    const data = await fetch(`/api/households/${hid}/chores/leaderboard?range=${range}`).then((r) => r.json());
    setLeaderboard(data.leaderboard || []);
    setPerChore(data.perChore || []);
  }
  useEffect(() => { setLoading(true); load(); }, [hid]);
  useEffect(() => { loadLeaderboard(); }, [hid, range]);
  useEffect(() => { loadPlan(); }, [hid]);

  const lastDoneAt = useMemo(() => {
    const map = new Map<string, Date>();
    for (const c of completions) {
      const cur = map.get(c.choreId);
      const at = new Date(c.completedAt);
      if (!cur || at > cur) map.set(c.choreId, at);
    }
    return map;
  }, [completions]);

  const myStreak = useMemo(
    () => computeStreak(completions.filter((c) => c.userId === meId).map((c) => new Date(c.completedAt)), "DAILY", new Date(), timezone),
    [completions, meId, timezone]
  );

  function say(text: string, tone: "good" | "bad" = "good", ms = 2500) {
    setFlash({ text, tone });
    setTimeout(() => setFlash(null), ms);
  }

  const nameOf = (userId: string) => members.find((m) => m.userId === userId)?.name || "Member";

  /**
   * Optimistic: the card flips to Done, the streak ticks and the leaderboard
   * re-ranks on the tap itself, then the server confirms in the background. A
   * chore takes half a second to log and the reward should feel that immediate;
   * if the POST fails we pull the provisional completion back out and say so.
   */
  async function complete(choreId: string) {
    const chore = chores.find((c) => c.id === choreId);
    if (!chore || completing === choreId) return;

    const provisionalId = `pending-${choreId}-${Date.now()}`;
    setCompletions((cs) => [
      { id: provisionalId, choreId, userId: meId, completedAt: new Date().toISOString(), crownsAwarded: chore.crownValue, xpAwarded: chore.xpValue },
      ...cs,
    ]);
    setLeaderboard((lb) => applyCompletionToLeaderboard(lb, meId, nameOf(meId), chore.crownValue, chore.xpValue));
    setCompleting(choreId);
    haptic();

    // Only the write itself is allowed to trigger a rollback — a hiccup in the
    // refetch below must not un-do a completion the server actually accepted.
    let failure: string | null = null;
    try {
      const res = await fetch(`/api/households/${hid}/chores/${choreId}/complete`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        const bonus = data.bonusAwarded ? " · 🎉 Daily objectives complete! +15 Crowns, +10 XP" : "";
        say(`+${chore.crownValue} Crowns${data.streak > 1 ? ` · ${data.streak}-day streak` : ""}${bonus}`, "good", bonus ? 4000 : 2500);
        if (data.bonusAwarded) celebrationHaptic();
      } else {
        failure = data.error || "Couldn't log that chore";
      }
    } catch {
      failure = "Couldn't log that chore — check your connection.";
    }

    if (failure) {
      setCompletions((cs) => cs.filter((c) => c.id !== provisionalId));
      say(failure, "bad", 3500);
    }
    // Reconcile either way: the server owns the real completion id, the real
    // streak, and everyone else's rows, which may have moved meanwhile.
    await Promise.all([load(), loadLeaderboard()]).catch(() => {});
    setCompleting(null);
  }

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-semibold tracking-[-0.03em] flex items-center gap-3">
            <CheckCheck className="w-8 h-8" /> Chores
          </h1>
          <p className="mt-2 text-sm text-black/60 dark:text-white/60">
            Log it, earn Crowns and XP, keep the streak alive.
            {myStreak > 0 && <span className="ml-2 inline-flex items-center gap-1 text-orange-500 font-medium"><Flame className="w-3.5 h-3.5" /> {myStreak}-day streak</span>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {choreLimit !== null && <span className="text-xs text-black/40 dark:text-white/40">{chores.length}/{choreLimit} chores</span>}
          <button onClick={() => setShowNew(true)} className="btn-primary"><Plus className="w-4 h-4" /> Add chore</button>
        </div>
      </header>

      {flash && (
        <div
          role="status"
          aria-live="polite"
          className={`rounded-xl border px-4 py-2.5 text-sm flex items-center gap-2 ${
            flash.tone === "good"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400"
          }`}
        >
          {flash.tone === "good" ? <Sparkles className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />} {flash.text}
        </div>
      )}

      {loading ? (
        <SkeletonCards count={3} />
      ) : chores.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-black/60 dark:text-white/60">No chores tracked yet.</div>
          <button onClick={() => setShowNew(true)} className="btn-secondary mt-4">Add the first one</button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {chores.map((c) => {
            const due = isChoreDue(c.frequency, lastDoneAt.get(c.id) ?? null, new Date(), timezone);
            const leader = perChore.find((p) => p.choreId === c.id)?.doneBy[0];
            return (
              <div key={c.id} className="card p-5 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-lg">{c.emoji}</span>
                    <span className="font-medium">{c.name}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wide ${c.category === "ESSENTIAL" ? "bg-sky-500/15 text-sky-500" : "bg-fuchsia-500/15 text-fuchsia-500"}`}>
                      {c.category === "ESSENTIAL" ? "Essential" : "Elective"}
                    </span>
                    {due ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 uppercase tracking-wide">Due</span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 uppercase tracking-wide">Done</span>
                    )}
                  </div>
                  {c.description && <p className="mt-1 text-xs text-black/50 dark:text-white/50">{c.description}</p>}
                  <div className="mt-2 flex items-center gap-3 text-xs text-black/50 dark:text-white/50">
                    <span className="flex items-center gap-1"><Crown className="w-3 h-3 text-amber-500" /> {c.crownValue}</span>
                    <span>+{c.xpValue} XP</span>
                    <span className="capitalize">{c.frequency.toLowerCase()}</span>
                  </div>
                  {leader && (
                    <div className="mt-1 text-[11px] text-black/40 dark:text-white/40">
                      {leader.userId === meId ? "You" : leader.name} lead{leader.userId === meId ? "" : "s"} this one — {leader.count}×
                    </div>
                  )}
                </div>
                <button
                  onClick={() => complete(c.id)}
                  disabled={completing === c.id}
                  className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition ${due ? "bg-black text-white dark:bg-white dark:text-black hover:opacity-90" : "bg-black/5 dark:bg-white/5 text-black/40 dark:text-white/40"} ${completing === c.id ? "opacity-50" : ""}`}
                >
                  {due ? "Mark done" : "Done again"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      <section className="card p-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-sm font-medium flex items-center gap-2"><Flame className="w-4 h-4 text-orange-500" /> Leaderboard</h2>
          <div className="flex gap-1 rounded-full bg-black/5 dark:bg-white/5 p-1">
            {RANGES.map((rg) => {
              const locked = rg.id !== "week" && !fullHistory;
              return (
                <button
                  key={rg.id}
                  onClick={() => (locked ? say("Full history is a Rhythm+ feature.", "bad", 3000) : setRange(rg.id))}
                  title={locked ? "Upgrade to Rhythm for full history" : undefined}
                  className={`px-3 py-1 rounded-full text-xs transition flex items-center gap-1 ${range === rg.id ? "bg-white dark:bg-black shadow-sm font-medium" : "text-black/50 dark:text-white/50"} ${locked ? "opacity-60" : ""}`}
                >
                  {locked && <Lock className="w-2.5 h-2.5" />}
                  {rg.label}
                </button>
              );
            })}
          </div>
        </div>
        {leaderboard.length === 0 ? (
          <p className="mt-4 text-sm text-black/50 dark:text-white/50">Nobody's logged a chore in this window yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {leaderboard.map((entry) => (
              <li key={entry.userId} className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${entry.rank === 1 ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white" : "bg-black/10 dark:bg-white/10"}`}>
                  {entry.rank}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{entry.userId === meId ? "You" : entry.name}</div>
                  <div className="text-xs text-black/50 dark:text-white/50">{entry.completions} chore{entry.completions === 1 ? "" : "s"} · {entry.xp} XP</div>
                </div>
                <div className="flex items-center gap-1 text-sm font-medium text-amber-500"><Crown className="w-3.5 h-3.5" /> {entry.crowns}</div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {showNew && (
        <NewChoreModal
          onClose={() => setShowNew(false)}
          onSaved={async () => { setShowNew(false); await load(); }}
          hid={hid}
        />
      )}
    </div>
  );
}

function NewChoreModal({ hid, onClose, onSaved }: { hid: string; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🧹");
  const [description, setDescription] = useState("");
  const [frequency, setFrequency] = useState<"DAILY" | "WEEKLY" | "ONEOFF">("DAILY");
  const [category, setCategory] = useState<"ESSENTIAL" | "ELECTIVE">("ESSENTIAL");
  const [crownValue, setCrownValue] = useState("10");
  const [xpValue, setXpValue] = useState("5");
  const [error, setError] = useState<string | null>(null);
  const [upgrade, setUpgrade] = useState(false);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setUpgrade(false);
    if (!name.trim()) return setError("Name is required");
    setSaving(true);
    try {
      const res = await fetch(`/api/households/${hid}/chores`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, emoji, description: description || undefined, frequency, category, crownValue: Number(crownValue), xpValue: Number(xpValue) }),
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
    <Modal onClose={onClose} title="New chore">
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-[64px_1fr] gap-3">
          <div>
            <label htmlFor="choresview-emoji" className="text-xs text-black/50 dark:text-white/50">Emoji</label>
            <input id="choresview-emoji" className="input mt-1 text-center" maxLength={4} value={emoji} onChange={(e) => setEmoji(e.target.value)} />
          </div>
          <div>
            <label htmlFor="choresview-name" className="text-xs text-black/50 dark:text-white/50">Name</label>
            <input id="choresview-name" className="input mt-1" required placeholder="Dishes" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        </div>
        <div>
          <label htmlFor="choresview-description-optional" className="text-xs text-black/50 dark:text-white/50">Description (optional)</label>
          <input id="choresview-description-optional" className="input mt-1" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="choresview-frequency" className="text-xs text-black/50 dark:text-white/50">Frequency</label>
            <select id="choresview-frequency" className="input mt-1" value={frequency} onChange={(e) => setFrequency(e.target.value as typeof frequency)}>
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
              <option value="ONEOFF">One-off</option>
            </select>
          </div>
          <div>
            <label htmlFor="choresview-category" className="text-xs text-black/50 dark:text-white/50">Category</label>
            <select id="choresview-category" className="input mt-1" value={category} onChange={(e) => setCategory(e.target.value as typeof category)}>
              <option value="ESSENTIAL">Essential</option>
              <option value="ELECTIVE">Elective</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="choresview-crowns" className="text-xs text-black/50 dark:text-white/50">Crowns</label>
            <input id="choresview-crowns" className="input mt-1" type="number" min={1} value={crownValue} onChange={(e) => setCrownValue(e.target.value)} />
          </div>
          <div>
            <label htmlFor="choresview-xp" className="text-xs text-black/50 dark:text-white/50">XP</label>
            <input id="choresview-xp" className="input mt-1" type="number" min={0} value={xpValue} onChange={(e) => setXpValue(e.target.value)} />
          </div>
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
