"use client";
import { useEffect, useState } from "react";
import { Flame, Check, Circle, PartyPopper, Sparkles } from "lucide-react";
import Modal from "../../_components/Modal";
import { haptic, celebrationHaptic } from "@/lib/haptics";
import TimezoneSetting from "./TimezoneSetting";

type Member = { userId: string; name: string };
type ObjectiveStatus = { id: string; label: string; description: string; icon: string; done: boolean };
type Daily = { streak: { current: number; longest: number }; objectives: ObjectiveStatus[]; bonusClaimedToday: boolean; timezone: string };
type Cheer = { id: string; emoji: string; message: string | null; createdAt: string; from: { id: string; name: string }; to: { id: string; name: string } };

const CHEER_EMOJI = ["👏", "🙌", "❤️", "🔥", "🎉", "💪"];

/**
 * The daily-return centerpiece: the household's shared streak, today's 3
 * objectives, and a one-tap way to cheer someone — the stuff worth opening
 * the app for even when no chore happens to be due today.
 */
export default function TodayPanel({ hid, meId, members }: { hid: string; meId: string; members: Member[] }) {
  const [daily, setDaily] = useState<Daily | null>(null);
  const [cheers, setCheers] = useState<Cheer[]>([]);
  const [showCheer, setShowCheer] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  async function loadDaily() {
    const d = await fetch(`/api/households/${hid}/daily`).then((r) => r.json()).catch(() => null);
    if (d) setDaily(d);
  }
  async function loadCheers() {
    const d = await fetch(`/api/households/${hid}/cheers`).then((r) => r.json()).catch(() => null);
    if (d) setCheers(d.cheers || []);
  }
  useEffect(() => { loadDaily(); loadCheers(); }, [hid]);

  async function sendCheer(toUserId: string, emoji: string) {
    setShowCheer(false);
    const res = await fetch(`/api/households/${hid}/cheers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toUserId, emoji }),
    }).then((r) => r.json()).catch(() => null);
    if (res?.bonusAwarded) {
      setFlash("🎉 Daily objectives complete! +15 Crowns, +10 XP");
      setTimeout(() => setFlash(null), 3500);
      celebrationHaptic();
    } else {
      haptic();
    }
    await Promise.all([loadDaily(), loadCheers()]);
  }

  if (!daily) return null;

  return (
    <section className="card p-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-sm font-medium flex items-center gap-2"><Sparkles className="w-4 h-4 text-indigo-500" /> Today</h2>
        <div className="flex items-center gap-1.5 text-sm">
          <Flame className={`w-4 h-4 ${daily.streak.current > 0 ? "text-orange-500" : "text-black/20 dark:text-white/20"}`} />
          <span className="font-semibold">{daily.streak.current}</span>
          <span className="text-black/40 dark:text-white/40">day streak</span>
          {daily.streak.longest > daily.streak.current && (
            <span className="text-black/30 dark:text-white/30 text-xs">· best {daily.streak.longest}</span>
          )}
        </div>
      </div>

      {flash && (
        <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-600 dark:text-emerald-400">
          {flash}
        </div>
      )}

      <ul className="mt-4 space-y-2">
        {daily.objectives.map((o) => (
          <li key={o.id} className={`flex items-center gap-3 px-3 py-2 rounded-xl ${o.done ? "bg-emerald-500/10" : "bg-black/[0.03] dark:bg-white/[0.03]"}`}>
            {o.done ? <Check className="w-4 h-4 text-emerald-500 shrink-0" /> : <Circle className="w-4 h-4 text-black/25 dark:text-white/25 shrink-0" />}
            <div className="flex-1 min-w-0">
              <div className={`text-sm ${o.done ? "text-emerald-700 dark:text-emerald-400" : ""}`}>{o.label}</div>
            </div>
            {o.id === "cheer" && !o.done && (
              <button onClick={() => setShowCheer(true)} className="text-xs text-indigo-500 font-medium shrink-0">Cheer someone →</button>
            )}
          </li>
        ))}
      </ul>

      {daily.bonusClaimedToday && (
        <div className="mt-3 text-xs text-black/50 dark:text-white/50 flex items-center gap-1">
          <PartyPopper className="w-3.5 h-3.5" /> Daily bonus claimed — great day.
        </div>
      )}

      <div className="mt-3">
        <TimezoneSetting hid={hid} timezone={daily.timezone} onSaved={loadDaily} />
      </div>

      {cheers.length > 0 && (
        <div className="mt-5 pt-4 border-t border-black/5 dark:border-white/10 space-y-1.5">
          <div className="text-[11px] uppercase tracking-wider text-black/40 dark:text-white/40 mb-2">Recent cheers</div>
          {cheers.slice(0, 3).map((c) => (
            <div key={c.id} className="text-sm text-black/70 dark:text-white/70">
              {c.emoji} <strong>{c.from.id === meId ? "You" : c.from.name}</strong> cheered {c.to.id === meId ? "you" : c.to.name}
              {c.message && <span className="text-black/50 dark:text-white/50"> — "{c.message}"</span>}
            </div>
          ))}
        </div>
      )}

      <div className="mt-4">
        <button onClick={() => setShowCheer(true)} className="btn-secondary !py-2 !px-4 text-sm"><PartyPopper className="w-3.5 h-3.5" /> Send a cheer</button>
      </div>

      {showCheer && (
        <CheerModal members={members.filter((m) => m.userId !== meId)} onClose={() => setShowCheer(false)} onSend={sendCheer} />
      )}
    </section>
  );
}

function CheerModal({ members, onClose, onSend }: { members: Member[]; onClose: () => void; onSend: (toUserId: string, emoji: string) => void }) {
  const [toUserId, setToUserId] = useState(members[0]?.userId || "");
  const [emoji, setEmoji] = useState(CHEER_EMOJI[0]);

  if (members.length === 0) {
    return (
      <Modal onClose={onClose} title="Send a cheer">
        <p className="text-sm text-black/60 dark:text-white/60">No other household members to cheer yet.</p>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose} title="Send a cheer">
      <div className="space-y-4">
        <div>
          <label htmlFor="todaypanel-to" className="text-xs text-black/50 dark:text-white/50">To</label>
          <select id="todaypanel-to" className="input mt-1" value={toUserId} onChange={(e) => setToUserId(e.target.value)}>
            {members.map((m) => <option key={m.userId} value={m.userId}>{m.name}</option>)}
          </select>
        </div>
        <div>
          <span id="cheer-emoji-label" className="text-xs text-black/50 dark:text-white/50">Emoji</span>
          <div role="group" aria-labelledby="cheer-emoji-label" className="mt-2 flex gap-2 flex-wrap">
            {CHEER_EMOJI.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setEmoji(e)}
                aria-pressed={emoji === e}
                aria-label={`Cheer with ${e}`}
                className={`text-xl w-11 h-11 rounded-full flex items-center justify-center transition ${emoji === e ? "bg-indigo-500/20 ring-2 ring-indigo-500" : "bg-black/5 dark:bg-white/5"}`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <button onClick={() => onSend(toUserId, emoji)} className="btn-primary">Send</button>
        </div>
      </div>
    </Modal>
  );
}
