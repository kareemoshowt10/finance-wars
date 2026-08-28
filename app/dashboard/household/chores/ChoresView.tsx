"use client";
import { useEffect, useMemo, useState } from "react";
import { CheckCheck, Plus, Crown, Flame, Sparkles } from "lucide-react";
import Modal from "../../_components/Modal";
import { isChoreDue, computeStreak } from "@/lib/chores";

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
  const [flash, setFlash] = useState<string | null>(null);

  async function load() {
    const data = await fetch(`/api/households/${hid}/chores`).then((r) => r.json());
    setChores(data.chores || []);
    setCompletions(data.completions || []);
    setMembers(data.members || []);
    setLoading(false);
  }
  async function loadLeaderboard() {
    const data = await fetch(`/api/households/${hid}/chores/leaderboard?range=${range}`).then((r) => r.json());
    setLeaderboard(data.leaderboard || []);
    setPerChore(data.perChore || []);
  }
  useEffect(() => { setLoading(true); load(); }, [hid]);
  useEffect(() => { loadLeaderboard(); }, [hid, range]);

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
    () => computeStreak(completions.filter((c) => c.userId === meId).map((c) => new Date(c.completedAt)), "DAILY"),
    [completions, meId]
  );

  async function complete(choreId: string) {
    setCompleting(choreId);
    try {
      const res = await fetch(`/api/households/${hid}/chores/${choreId}/complete`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const data = await res.json();
      if (res.ok) {
        setFlash(`+${chores.find((c) => c.id === choreId)?.crownValue ?? 0} Crowns${data.streak > 1 ? ` · ${data.streak}-day streak` : ""}`);
        setTimeout(() => setFlash(null), 2500);
        await Promise.all([load(), loadLeaderboard()]);
      }
    } finally {
      setCompleting(null);
    }
  }

  const nameOf = (userId: string) => members.find((m) => m.userId === userId)?.name || "Member";

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
        <button onClick={() => setShowNew(true)} className="btn-primary"><Plus className="w-4 h-4" /> Add chore</button>
      </header>

      {flash && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
          <Sparkles className="w-4 h-4" /> {flash}
        </div>
      )}

      {loading ? (
        <div className="text-black/40 dark:text-white/40 text-sm">Loading…</div>
      ) : chores.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-black/60 dark:text-white/60">No chores tracked yet.</div>
          <button onClick={() => setShowNew(true)} className="btn-secondary mt-4">Add the first one</button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {chores.map((c) => {
            const due = isChoreDue(c.frequency, lastDoneAt.get(c.id) ?? null);
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
                  className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition ${due ? "bg-black text-white dark:bg-white dark:text-black hover:opacity-90" : "bg-black/5 dark:bg-white/5 text-black/40 dark:text-white/40"}`}
                >
                  {completing === c.id ? "…" : due ? "Mark done" : "Done again"}
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
            {RANGES.map((rg) => (
              <button
                key={rg.id}
                onClick={() => setRange(rg.id)}
                className={`px-3 py-1 rounded-full text-xs transition ${range === rg.id ? "bg-white dark:bg-black shadow-sm font-medium" : "text-black/50 dark:text-white/50"}`}
              >
                {rg.label}
              </button>
            ))}
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
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError("Name is required");
    setSaving(true);
    try {
      const res = await fetch(`/api/households/${hid}/chores`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, emoji, description: description || undefined, frequency, category, crownValue: Number(crownValue), xpValue: Number(xpValue) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
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
            <label className="text-xs text-black/50 dark:text-white/50">Emoji</label>
            <input className="input mt-1 text-center" maxLength={4} value={emoji} onChange={(e) => setEmoji(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-black/50 dark:text-white/50">Name</label>
            <input className="input mt-1" required placeholder="Dishes" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="text-xs text-black/50 dark:text-white/50">Description (optional)</label>
          <input className="input mt-1" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-black/50 dark:text-white/50">Frequency</label>
            <select className="input mt-1" value={frequency} onChange={(e) => setFrequency(e.target.value as typeof frequency)}>
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
              <option value="ONEOFF">One-off</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-black/50 dark:text-white/50">Category</label>
            <select className="input mt-1" value={category} onChange={(e) => setCategory(e.target.value as typeof category)}>
              <option value="ESSENTIAL">Essential</option>
              <option value="ELECTIVE">Elective</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-black/50 dark:text-white/50">Crowns</label>
            <input className="input mt-1" type="number" min={1} value={crownValue} onChange={(e) => setCrownValue(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-black/50 dark:text-white/50">XP</label>
            <input className="input mt-1" type="number" min={0} value={xpValue} onChange={(e) => setXpValue(e.target.value)} />
          </div>
        </div>
        {error && <div className="text-sm text-red-400">{error}</div>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <button disabled={saving} className="btn-primary">{saving ? "Saving…" : "Save"}</button>
        </div>
      </form>
    </Modal>
  );
}
