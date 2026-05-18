"use client";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Flame, Crown, Hand, Coffee, Snail, Beef, Hash, Dumbbell, Trophy, Send, Swords, ShieldAlert, Check, X, Link2, AlertTriangle,
} from "lucide-react";

const STICKER_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  fire: Flame, flex: Dumbbell, crown: Crown, clap: Hand, tea: Coffee, snail: Snail, goat: Beef, "100": Hash,
};
const STICKERS = ["fire", "flex", "crown", "clap", "tea", "snail", "goat", "100"];

type Player = {
  id: string; userId: string | null; side: string; accepted: boolean; declined: boolean;
  inviteEmail: string | null; totalPoints: number; sprintsWon: number;
  currentStreakDays: number; longestStreakDays: number; stakeAccountId: string | null;
  user?: { id: string; name: string; email: string } | null;
  displayName: string;
};
type Sprint = {
  id: string; weekNumber: number; startDate: string; endDate: string; status: string;
  themeMultiplier: number; themeLabel: string | null; winnerPlayerId: string | null;
  contributions: { id: string; playerId: string; amount: number; pointsAwarded: number; note: string | null; createdAt: string; disputeStatus: string | null }[];
  targets: { id: string; playerId: string; amount: number }[];
};
type Duel = {
  id: string; title: string; targetAmount: number; sprintLengthDays: number;
  startDate: string; endDate: string; status: string; stakeText: string;
  stakeAmount: number | null; stakePercentCap: number | null; isPractice: boolean;
  autoPenaltyEnabled: boolean; stakeVoided: boolean; stakeResolvedAt: string | null;
  dailyCap: number; practiceOpponentDailyAvg: number | null; creatorUserId: string;
};
type State = {
  duel: Duel;
  players: Player[];
  sprints: Sprint[];
  currentSprintId: string | null;
  events: { id: string; kind: string; playerId: string | null; payload: Record<string, unknown> | null; createdAt: string }[];
  cheers: { id: string; fromPlayerId: string; sticker: string; createdAt: string }[];
  openDisputes: { id: string; contributionId: string; raisedByPlayerId: string; reason: string | null; status: string; autoResolveAt: string; contribution: { playerId: string; amount: number } }[];
  me: Player | null;
};

export default function DuelArena({ duelId, userId }: { duelId: string; userId: string }) {
  const [state, setState] = useState<State | null>(null);
  const [tab, setTab] = useState<"feed" | "sprints" | "disputes" | "stake">("feed");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [posting, setPosting] = useState(false);
  const [targetInput, setTargetInput] = useState("");
  const [floatStickers, setFloatStickers] = useState<{ id: number; sticker: string }[]>([]);

  async function load() {
    try {
      const data = await fetch(`/api/duels/${duelId}`).then((r) => r.json());
      setState(data);
    } catch {}
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [duelId]);

  if (!state) return <div className="text-black/50 dark:text-white/50">Loading the arena…</div>;

  const { duel, players, sprints, currentSprintId, events, openDisputes } = state;
  const me = state.me ?? players.find((p) => p.userId === userId) ?? players[0];
  const opp = players.find((p) => p.id !== me.id) ?? players[1];
  const currentSprint = sprints.find((s) => s.id === currentSprintId) ?? null;
  const myTarget = currentSprint?.targets.find((t) => t.playerId === me.id);
  const oppTarget = currentSprint?.targets.find((t) => t.playerId === opp.id);

  const totalContribs = players.reduce((s, p) => s + p.totalPoints, 0);
  const pct = Math.min(100, (totalContribs / duel.targetAmount) * 100);
  const daysLeft = Math.max(0, Math.ceil((new Date(duel.endDate).getTime() - Date.now()) / 86400000));

  const totalSprints = Math.max(1, Math.ceil((new Date(duel.endDate).getTime() - new Date(duel.startDate).getTime()) / 86400000 / duel.sprintLengthDays));

  async function submitContrib() {
    if (!amount) return;
    setPosting(true);
    const res = await fetch(`/api/duels/${duelId}/contributions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: Number(amount), note: note || undefined }),
    });
    if (res.ok) {
      setAmount("");
      setNote("");
      await load();
    } else {
      const data = await res.json();
      alert(data.error || "Failed");
    }
    setPosting(false);
  }

  async function setTarget() {
    if (!targetInput) return;
    await fetch(`/api/duels/${duelId}/sprints/current/target`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: Number(targetInput) }),
    });
    setTargetInput("");
    await load();
  }

  async function sendCheer(sticker: string) {
    setFloatStickers((s) => [...s, { id: Date.now(), sticker }]);
    setTimeout(() => setFloatStickers((s) => s.slice(1)), 2000);
    await fetch(`/api/duels/${duelId}/cheers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sticker }),
    });
  }

  async function voidStake() {
    if (!confirm("Void the auto-penalty? This cannot be undone.")) return;
    await fetch(`/api/duels/${duelId}/void-stake`, { method: "POST" });
    load();
  }

  async function resolveDispute(did: string, action: "concede" | "uphold") {
    await fetch(`/api/duels/${duelId}/disputes/${did}/${action}`, { method: "POST" });
    load();
  }

  async function disputeContrib(cid: string) {
    const reason = prompt("Reason for dispute? (optional)") ?? "";
    await fetch(`/api/duels/${duelId}/contributions/${cid}/dispute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    load();
  }

  const inviteLink = typeof window !== "undefined" ? `${window.location.origin}/dashboard/duels/${duelId}` : "";

  if (duel.status === "PENDING") {
    const invitee = players.find((p) => p.side === "B");
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-semibold tracking-[-0.03em]">{duel.title}</h1>
        <div className="card p-8 text-center space-y-4">
          <Swords className="w-10 h-10 mx-auto" />
          <h2 className="text-xl font-medium">Waiting for {invitee?.inviteEmail || "your partner"}</h2>
          <p className="text-sm text-black/50 dark:text-white/50">Share the link below. The duel kicks off when they accept.</p>
          <div className="flex gap-2 max-w-md mx-auto">
            <input readOnly value={inviteLink} className="input flex-1" />
            <button onClick={() => navigator.clipboard.writeText(inviteLink)} className="btn-secondary"><Link2 className="w-4 h-4" />Copy</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 relative">
      {/* Head-to-head card */}
      <div className="card p-8 relative overflow-hidden">
        <AnimatePresence>
          {floatStickers.map((s) => {
            const Icon = STICKER_ICONS[s.sticker] || Flame;
            return (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, x: -100, y: 50, scale: 0.5 }}
                animate={{ opacity: 1, x: 100, y: -30, scale: 1.5 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.6, ease: "easeOut" }}
                className="absolute left-1/2 top-1/2 pointer-events-none text-amber-400"
              >
                <Icon className="w-10 h-10" />
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div className="flex items-center justify-between flex-wrap gap-6">
          <PlayerSide player={me} mirror={false} />
          <div className="flex-1 min-w-[200px] text-center">
            <div className="text-xs uppercase tracking-[0.2em] text-black/40 dark:text-white/40">{duel.title}</div>
            {currentSprint && (
              <div className="text-xs text-black/50 dark:text-white/50 mt-1">Sprint {currentSprint.weekNumber} of {totalSprints}</div>
            )}
            <div className="text-5xl font-semibold tracking-[-0.03em] mt-2">{daysLeft}d</div>
            <div className="text-xs text-black/50 dark:text-white/50 mt-1">${totalContribs.toFixed(0)} of ${duel.targetAmount.toFixed(0)}</div>
            <div className="mt-3 h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} className="h-full bg-gradient-to-r from-indigo-500 to-fuchsia-500" />
            </div>
          </div>
          <PlayerSide player={opp} mirror />
        </div>
      </div>

      {/* Current sprint panel */}
      {currentSprint && (
        <div className="card p-6 space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-black/40 dark:text-white/40">Current sprint</div>
              <div className="text-lg font-medium mt-1">Week {currentSprint.weekNumber} {currentSprint.themeLabel && `· ${currentSprint.themeLabel}`}</div>
            </div>
            <Countdown to={new Date(currentSprint.endDate)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <TargetRing player={me} target={myTarget} sprint={currentSprint} label="You" />
            <TargetRing player={opp} target={oppTarget} sprint={currentSprint} label={opp.displayName} />
          </div>
          {!myTarget && (
            <div className="flex gap-2">
              <input type="number" placeholder="Set my sprint target ($)" value={targetInput} onChange={(e) => setTargetInput(e.target.value)} className="input flex-1" />
              <button onClick={setTarget} className="btn-primary">Set target</button>
            </div>
          )}
          <div className="space-y-2 pt-2 border-t border-black/5 dark:border-white/5">
            <div className="text-xs uppercase tracking-[0.15em] text-black/40 dark:text-white/40">Log a save</div>
            <div className="flex gap-2 flex-wrap">
              <input type="number" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} className="input w-32" />
              <input placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} className="input flex-1 min-w-[150px]" />
              <button onClick={submitContrib} disabled={posting || !amount} className="btn-primary"><Send className="w-4 h-4" />{posting ? "…" : "Log"}</button>
            </div>
            <div className="text-[11px] text-black/40 dark:text-white/40">Daily cap ${duel.dailyCap.toFixed(0)}. Large entries (&gt;50% of cap) need a note.</div>
          </div>
        </div>
      )}

      {/* Cheer rail */}
      <div className="card p-4">
        <div className="text-xs uppercase tracking-[0.15em] text-black/40 dark:text-white/40 mb-3">Cheer</div>
        <div className="grid grid-cols-8 gap-2">
          {STICKERS.map((s) => {
            const Icon = STICKER_ICONS[s];
            return (
              <button key={s} onClick={() => sendCheer(s)} className="aspect-square rounded-lg hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-center transition">
                <Icon className="w-5 h-5" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-black/5 dark:border-white/5">
        {(["feed", "sprints", "disputes", "stake"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={"px-4 py-2 text-sm capitalize " + (tab === t ? "border-b-2 border-indigo-500 text-black dark:text-white" : "text-black/50 dark:text-white/50")}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "feed" && (
        <div className="space-y-2">
          {events.length === 0 && <div className="text-sm text-black/40 dark:text-white/40">Nothing logged yet.</div>}
          <AnimatePresence initial={false}>
            {events.map((e) => (
              <motion.div
                key={e.id}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="card p-3 text-sm flex items-center gap-3"
              >
                <FeedIcon kind={e.kind} />
                <div className="flex-1">
                  <div>{describeEvent(e, players)}</div>
                  <div className="text-[11px] text-black/40 dark:text-white/40">{new Date(e.createdAt).toLocaleString()}</div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {tab === "sprints" && (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wider text-black/40 dark:text-white/40">
              <tr><th className="text-left p-3">Week</th><th className="text-right p-3">A pts</th><th className="text-right p-3">B pts</th><th className="text-left p-3">Winner</th></tr>
            </thead>
            <tbody>
              {sprints.map((s) => {
                const pA = sumPoints(s.contributions, players[0]?.id);
                const pB = sumPoints(s.contributions, players[1]?.id);
                const winner = s.winnerPlayerId ? players.find((p) => p.id === s.winnerPlayerId)?.displayName : s.status === "CLOSED" ? "Tie" : "—";
                return (
                  <tr key={s.id} className="border-t border-black/5 dark:border-white/5">
                    <td className="p-3">Week {s.weekNumber}</td>
                    <td className="p-3 text-right">{pA.toFixed(0)}</td>
                    <td className="p-3 text-right">{pB.toFixed(0)}</td>
                    <td className="p-3">{winner}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab === "disputes" && (
        <div className="space-y-3">
          {openDisputes.length === 0 ? (
            <div className="text-sm text-black/40 dark:text-white/40">No open disputes.</div>
          ) : openDisputes.map((d) => {
            const isOwner = players.find((p) => p.id === d.contribution.playerId)?.userId === userId;
            return (
              <div key={d.id} className="card p-4 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <ShieldAlert className="w-5 h-5 text-amber-500" />
                  <div>
                    <div className="text-sm">${d.contribution.amount.toFixed(2)} contribution disputed</div>
                    {d.reason && <div className="text-xs text-black/50 dark:text-white/50">Reason: {d.reason}</div>}
                    <div className="text-[11px] text-black/40 dark:text-white/40">Auto-resolves {new Date(d.autoResolveAt).toLocaleDateString()}</div>
                  </div>
                </div>
                {isOwner && (
                  <div className="flex gap-2">
                    <button onClick={() => resolveDispute(d.id, "concede")} className="btn-secondary text-xs"><X className="w-3 h-3" />Concede</button>
                    <button onClick={() => resolveDispute(d.id, "uphold")} className="btn-primary text-xs"><Check className="w-3 h-3" />Uphold</button>
                  </div>
                )}
              </div>
            );
          })}
          {currentSprint && (
            <div className="space-y-2 mt-6">
              <div className="text-xs uppercase tracking-[0.15em] text-black/40 dark:text-white/40">Opponent's recent contributions</div>
              {currentSprint.contributions.filter((c) => c.playerId === opp.id).slice(0, 8).map((c) => (
                <div key={c.id} className="card p-3 flex items-center justify-between text-sm">
                  <div>${c.amount.toFixed(2)} · {new Date(c.createdAt).toLocaleDateString()}{c.note && <span className="text-xs text-black/40 dark:text-white/40"> · {c.note}</span>}</div>
                  {c.disputeStatus !== "PENDING" && (
                    <button onClick={() => disputeContrib(c.id)} className="btn-secondary text-xs"><AlertTriangle className="w-3 h-3" />Dispute</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "stake" && (
        <div className="card p-6 space-y-4">
          <div>
            <div className="text-xs uppercase tracking-[0.15em] text-black/40 dark:text-white/40">Stake</div>
            <div className="text-lg mt-1">{duel.stakeText}</div>
          </div>
          {duel.autoPenaltyEnabled && (
            <div className="text-sm text-black/60 dark:text-white/60">
              Auto-penalty: ${duel.stakeAmount?.toFixed(0)} (capped at {duel.stakePercentCap}% of loser balance).
              {duel.stakeVoided && <span className="ml-2 text-amber-500">Voided.</span>}
            </div>
          )}
          {duel.autoPenaltyEnabled && !duel.stakeVoided && (
            <button onClick={voidStake} className="btn-secondary"><X className="w-4 h-4" />Void auto-penalty</button>
          )}
        </div>
      )}
    </div>
  );
}

function PlayerSide({ player, mirror }: { player: Player; mirror: boolean }) {
  const name = player.displayName;
  return (
    <div className={"flex items-center gap-3 " + (mirror ? "flex-row-reverse text-right" : "")}>
      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-2xl font-semibold">
        {name.charAt(0).toUpperCase()}
      </div>
      <div>
        <div className="font-medium">{name}</div>
        <div className="text-2xl font-semibold tracking-[-0.03em] mt-0.5">{player.totalPoints.toFixed(0)}<span className="text-xs text-black/40 dark:text-white/40 ml-1">pts</span></div>
        <div className="flex items-center gap-1 mt-1 text-xs">
          {[1, 2, 3, 4, 5].map((i) => (
            <span key={i} className={"w-2 h-2 rounded-full " + (i <= player.sprintsWon ? "bg-amber-500" : "bg-black/10 dark:bg-white/10")} />
          ))}
        </div>
        <div className="flex items-center gap-1 mt-1 text-xs text-black/60 dark:text-white/60">
          <Flame className="w-3 h-3 text-orange-500" />{player.currentStreakDays}d
        </div>
      </div>
    </div>
  );
}

function Countdown({ to }: { to: Date }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const ms = Math.max(0, to.getTime() - now);
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms / 3600000) % 24);
  const m = Math.floor((ms / 60000) % 60);
  const s = Math.floor((ms / 1000) % 60);
  return (
    <div className="font-mono text-sm tabular-nums">
      {d}d {String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
    </div>
  );
}

function TargetRing({ player, target, sprint, label }: { player: Player; target?: { amount: number }; sprint: Sprint; label: string }) {
  const actual = sumAmounts(sprint.contributions, player.id);
  const pct = target ? Math.min(100, (actual / target.amount) * 100) : 0;
  const r = 36;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center text-center">
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="currentColor" strokeWidth="6" className="text-black/10 dark:text-white/10" />
        <motion.circle
          cx="50" cy="50" r={r} fill="none" strokeWidth="6"
          stroke="url(#grad)"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct / 100)}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - pct / 100) }}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
        />
        <defs>
          <linearGradient id="grad" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#d946ef" />
          </linearGradient>
        </defs>
        <text x="50" y="55" textAnchor="middle" className="fill-black dark:fill-white text-sm font-semibold">{Math.round(pct)}%</text>
      </svg>
      <div className="text-xs mt-2 truncate max-w-[8rem]">{label}</div>
      <div className="text-[11px] text-black/50 dark:text-white/50">${actual.toFixed(0)}{target && ` / $${target.amount.toFixed(0)}`}</div>
    </div>
  );
}

function FeedIcon({ kind }: { kind: string }) {
  if (kind === "CONTRIBUTION") return <Send className="w-4 h-4 text-emerald-500" />;
  if (kind === "CHEER") return <Hand className="w-4 h-4 text-amber-500" />;
  if (kind === "SPRINT_OPEN") return <Swords className="w-4 h-4 text-indigo-500" />;
  if (kind === "SPRINT_CLOSE") return <Trophy className="w-4 h-4 text-amber-500" />;
  if (kind === "BADGE") return <Crown className="w-4 h-4 text-fuchsia-500" />;
  if (kind === "DISPUTE") return <ShieldAlert className="w-4 h-4 text-amber-500" />;
  if (kind === "STAKE_RESOLVED") return <Trophy className="w-4 h-4 text-rose-500" />;
  return <Flame className="w-4 h-4" />;
}

function describeEvent(e: { kind: string; playerId: string | null; payload: Record<string, unknown> | null }, players: Player[]): string {
  const p = e.playerId ? players.find((x) => x.id === e.playerId) : null;
  const who = p?.displayName || "System";
  const pl = e.payload || {};
  switch (e.kind) {
    case "CONTRIBUTION": return `${who} logged $${Number(pl.amount || 0).toFixed(0)} (+${Number(pl.points || 0).toFixed(0)} pts)`;
    case "CHEER": return `${who} sent ${String(pl.sticker || "")}`;
    case "SPRINT_OPEN": return `Sprint ${pl.weekNumber} opens`;
    case "SPRINT_CLOSE": return `Sprint ${pl.weekNumber} closes — ${pl.tie ? "Tie" : "Winner declared"}`;
    case "BADGE": return `${who} unlocked ${String(pl.badge || "Badge")}`;
    case "DISPUTE": return `${who} raised a dispute`;
    case "STAKE_RESOLVED": return pl.voided ? `Stake voided` : pl.forfeited ? `Stake forfeited` : `Stake transferred $${Number(pl.amount || 0).toFixed(0)}`;
    default: return e.kind;
  }
}

function sumPoints(contribs: Sprint["contributions"], playerId?: string): number {
  if (!playerId) return 0;
  return contribs.filter((c) => c.playerId === playerId && c.disputeStatus !== "PENDING" && c.disputeStatus !== "CONCEDED")
    .reduce((s, c) => s + c.pointsAwarded, 0);
}
function sumAmounts(contribs: Sprint["contributions"], playerId: string): number {
  return contribs.filter((c) => c.playerId === playerId && c.disputeStatus !== "PENDING" && c.disputeStatus !== "CONCEDED")
    .reduce((s, c) => s + c.amount, 0);
}

void useMemo;
