"use client";
import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Plus, Users, Trophy, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type Progress = {
  total: number;
  target: number;
  pct: number;
  perUser: { userId: string; name: string; amount: number; pct: number }[];
  leader: { userId: string; amount: number } | null;
};
type Quest = {
  id: string; title: string; description: string | null; mode: string;
  targetAmount: number; deadline: string; status: string;
  completedAt: string | null; progress: Progress;
};
type Squad = {
  id: string; name: string; emoji: string; inviteCode: string; isOwner: boolean;
  members: { userId: string; name: string; role: string }[];
  quests: Quest[];
};

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

export default function SquadDetailView({ initial, meId }: { initial: Squad; meId: string }) {
  const [squad, setSquad] = useState<Squad>(initial);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [contribFor, setContribFor] = useState<string | null>(null);
  const [contribAmt, setContribAmt] = useState("");
  const [form, setForm] = useState({ title: "", description: "", mode: "COOP" as "COOP" | "RACE", targetAmount: "", deadline: "" });

  async function refresh() {
    const r = await fetch(`/api/squads/${squad.id}`);
    if (r.ok) {
      const j = await r.json();
      setSquad((prev) => ({ ...prev, members: j.squad.members, quests: j.squad.quests.map((q: Quest) => ({ ...q, deadline: typeof q.deadline === "string" ? q.deadline : new Date(q.deadline).toISOString() })) }));
    }
  }

  async function createQuest() {
    if (!form.title || !form.targetAmount || !form.deadline) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/squads/${squad.id}/quests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, targetAmount: Number(form.targetAmount), deadline: new Date(form.deadline).toISOString() }),
      });
      if (r.ok) {
        setCreating(false);
        setForm({ title: "", description: "", mode: "COOP", targetAmount: "", deadline: "" });
        await refresh();
      }
    } finally { setBusy(false); }
  }

  async function contribute(questId: string) {
    if (!contribAmt) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/squads/quests/${questId}/contributions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(contribAmt) }),
      });
      if (r.ok) {
        setContribFor(null);
        setContribAmt("");
        await refresh();
      }
    } finally { setBusy(false); }
  }

  function copyCode() {
    navigator.clipboard.writeText(squad.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="space-y-8">
      <Link href="/dashboard/squads" className="inline-flex items-center gap-1 text-sm text-black/60 dark:text-white/60"><ArrowLeft className="w-4 h-4" /> All squads</Link>

      <header className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="text-5xl">{squad.emoji}</div>
          <div>
            <h1 className="text-3xl font-semibold tracking-[-0.02em]">{squad.name}</h1>
            <div className="mt-1 text-sm text-black/60 dark:text-white/60 flex items-center gap-2">
              <Users className="w-3.5 h-3.5" /> {squad.members.length} members
            </div>
          </div>
        </div>
        <button onClick={copyCode} className="px-4 py-2 rounded-full border border-black/15 dark:border-white/15 text-sm font-mono tracking-widest flex items-center gap-2">
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {squad.inviteCode}
        </button>
      </header>

      <section className="rounded-2xl border border-black/10 dark:border-white/10 p-5">
        <h2 className="text-sm uppercase tracking-wider text-black/50 dark:text-white/50 mb-3">Members</h2>
        <div className="flex flex-wrap gap-2">
          {squad.members.map((m) => (
            <div key={m.userId} className="px-3 py-1.5 rounded-full bg-black/5 dark:bg-white/10 text-sm">
              {m.name} {m.role === "OWNER" && <span className="text-[10px] uppercase ml-1 text-amber-500">owner</span>}
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-medium flex items-center gap-2"><Trophy className="w-5 h-5" /> Quests</h2>
          <button onClick={() => setCreating((v) => !v)} className="px-4 py-2 rounded-full bg-black text-white dark:bg-white dark:text-black text-sm flex items-center gap-2"><Plus className="w-4 h-4" /> New quest</button>
        </div>

        {creating && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-black/10 dark:border-white/10 p-5 space-y-3 bg-black/5 dark:bg-white/5">
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Quest title" className="w-full px-4 py-3 rounded-xl bg-white dark:bg-black/40 text-sm" />
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What are you working toward?" rows={2} className="w-full px-4 py-3 rounded-xl bg-white dark:bg-black/40 text-sm" />
            <div className="grid md:grid-cols-3 gap-3">
              <select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value as "COOP" | "RACE" })} className="px-4 py-3 rounded-xl bg-white dark:bg-black/40 text-sm">
                <option value="COOP">Coop (pool together)</option>
                <option value="RACE">Race (first to hit target)</option>
              </select>
              <input value={form.targetAmount} onChange={(e) => setForm({ ...form, targetAmount: e.target.value })} placeholder="Target amount" type="number" className="px-4 py-3 rounded-xl bg-white dark:bg-black/40 text-sm" />
              <input value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} type="date" className="px-4 py-3 rounded-xl bg-white dark:bg-black/40 text-sm" />
            </div>
            <button onClick={createQuest} disabled={busy} className="px-5 py-2 rounded-full bg-black text-white dark:bg-white dark:text-black text-sm font-medium disabled:opacity-50">Create quest</button>
          </motion.div>
        )}

        {squad.quests.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-black/15 dark:border-white/15 p-8 text-center text-sm text-black/50 dark:text-white/50">No quests yet — start one to give the squad something to chase.</div>
        ) : (
          <div className="space-y-3">
            {squad.quests.map((q) => {
              const days = Math.max(0, Math.ceil((new Date(q.deadline).getTime() - Date.now()) / 86400000));
              return (
                <div key={q.id} className={cn("rounded-2xl border p-5 space-y-3", q.status === "COMPLETED" ? "border-emerald-500/40 bg-emerald-500/5" : "border-black/10 dark:border-white/10")}>
                  <div className="flex items-start justify-between flex-wrap gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-xs uppercase tracking-wider">
                        <span className={cn("px-2 py-0.5 rounded-full", q.mode === "RACE" ? "bg-rose-500/15 text-rose-500" : "bg-cyan-500/15 text-cyan-500")}>{q.mode}</span>
                        {q.status === "COMPLETED" && <span className="text-emerald-600 dark:text-emerald-400">Completed</span>}
                      </div>
                      <h3 className="mt-1 text-lg font-medium">{q.title}</h3>
                      {q.description && <p className="text-sm text-black/60 dark:text-white/60">{q.description}</p>}
                    </div>
                    <div className="text-right text-sm">
                      <div className="font-medium tabular-nums">{fmt(q.progress.total)} / {fmt(q.targetAmount)}</div>
                      <div className="text-xs text-black/50 dark:text-white/50">{q.status === "ACTIVE" ? `${days} days left` : "done"}</div>
                    </div>
                  </div>

                  <div className="h-2 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-emerald-400 to-cyan-500" style={{ width: `${q.progress.pct}%` }} />
                  </div>

                  {q.mode === "RACE" && q.progress.perUser.length > 0 && (
                    <div className="space-y-1.5">
                      {q.progress.perUser.map((u) => (
                        <div key={u.userId} className="flex items-center gap-3 text-xs">
                          <div className="w-24 truncate">{u.name}</div>
                          <div className="flex-1 h-1.5 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
                            <div className={cn("h-full", q.progress.leader?.userId === u.userId ? "bg-amber-500" : "bg-black/30 dark:bg-white/40")} style={{ width: `${u.pct}%` }} />
                          </div>
                          <div className="w-20 text-right tabular-nums">{fmt(u.amount)}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {q.status === "ACTIVE" && (
                    <div>
                      {contribFor === q.id ? (
                        <div className="flex items-center gap-2">
                          <input value={contribAmt} onChange={(e) => setContribAmt(e.target.value)} type="number" placeholder="Amount" className="px-3 py-2 rounded-xl bg-black/5 dark:bg-white/10 text-sm flex-1" />
                          <button onClick={() => contribute(q.id)} disabled={busy || !contribAmt} className="px-4 py-2 rounded-full bg-black text-white dark:bg-white dark:text-black text-sm disabled:opacity-50">Add</button>
                          <button onClick={() => { setContribFor(null); setContribAmt(""); }} className="text-sm text-black/60 dark:text-white/60">Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => setContribFor(q.id)} className="px-4 py-2 rounded-full border border-black/15 dark:border-white/15 text-sm">+ Contribute</button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
