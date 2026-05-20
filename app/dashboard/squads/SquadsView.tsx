"use client";
import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Flame, Plus, LogIn, Users, Target } from "lucide-react";

type Squad = { id: string; name: string; emoji: string; inviteCode: string; role: string; memberCount: number; questCount: number };

export default function SquadsView({ initialSquads }: { initialSquads: Squad[] }) {
  const [squads, setSquads] = useState<Squad[]>(initialSquads);
  const [mode, setMode] = useState<"none" | "create" | "join">("none");
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🎯");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function create() {
    setBusy(true); setErr(null);
    try {
      const r = await fetch("/api/squads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, emoji }) });
      if (!r.ok) { setErr((await r.json()).error || "Failed"); return; }
      const j = await r.json();
      setSquads((s) => [{ id: j.squad.id, name: j.squad.name, emoji: j.squad.emoji, inviteCode: j.squad.inviteCode, role: "OWNER", memberCount: 1, questCount: 0 }, ...s]);
      setMode("none"); setName("");
    } finally { setBusy(false); }
  }

  async function join() {
    setBusy(true); setErr(null);
    try {
      const r = await fetch("/api/squads/join", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ inviteCode: code }) });
      if (!r.ok) { setErr((await r.json()).error || "Failed"); return; }
      const j = await r.json();
      const sq = j.squad;
      setSquads((s) => s.some((x) => x.id === sq.id) ? s : [{ id: sq.id, name: sq.name, emoji: sq.emoji, inviteCode: sq.inviteCode, role: "MEMBER", memberCount: 1, questCount: 0 }, ...s]);
      setMode("none"); setCode("");
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-10">
      <header className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-semibold tracking-[-0.03em] flex items-center gap-3">
            <Flame className="w-8 h-8" /> Squads
          </h1>
          <p className="mt-2 text-sm text-black/60 dark:text-white/60">Group quests with friends and family. Cooperate to pool, or race to be first.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setMode("create")} className="px-4 py-2 rounded-full bg-black text-white dark:bg-white dark:text-black text-sm font-medium flex items-center gap-2"><Plus className="w-4 h-4" /> New Squad</button>
          <button onClick={() => setMode("join")} className="px-4 py-2 rounded-full border border-black/15 dark:border-white/15 text-sm flex items-center gap-2"><LogIn className="w-4 h-4" /> Join with code</button>
        </div>
      </header>

      {mode !== "none" && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-black/10 dark:border-white/10 p-5 bg-black/5 dark:bg-white/5">
          {mode === "create" ? (
            <div className="flex flex-wrap items-center gap-3">
              <input value={emoji} onChange={(e) => setEmoji(e.target.value)} maxLength={4} className="w-16 px-3 py-2 rounded-xl bg-white dark:bg-black/40 text-center text-lg" />
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Squad name (e.g. The Siblings)" className="flex-1 min-w-[200px] px-4 py-2 rounded-xl bg-white dark:bg-black/40 text-sm" />
              <button onClick={create} disabled={busy || !name} className="px-4 py-2 rounded-full bg-black text-white dark:bg-white dark:text-black text-sm font-medium disabled:opacity-50">Create</button>
              <button onClick={() => setMode("none")} className="text-sm text-black/60 dark:text-white/60">Cancel</button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="INVITE CODE" className="flex-1 min-w-[200px] px-4 py-2 rounded-xl bg-white dark:bg-black/40 text-sm font-mono tracking-widest" />
              <button onClick={join} disabled={busy || !code} className="px-4 py-2 rounded-full bg-black text-white dark:bg-white dark:text-black text-sm font-medium disabled:opacity-50">Join</button>
              <button onClick={() => setMode("none")} className="text-sm text-black/60 dark:text-white/60">Cancel</button>
            </div>
          )}
          {err && <div className="mt-2 text-xs text-rose-500">{err}</div>}
        </motion.div>
      )}

      {squads.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-black/15 dark:border-white/15 p-10 text-center">
          <div className="text-4xl">🎯</div>
          <h2 className="mt-3 text-xl font-medium">No squads yet</h2>
          <p className="mt-1 text-sm text-black/60 dark:text-white/60">Create one for your family group, friend crew, or co-workers.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {squads.map((s) => (
            <Link key={s.id} href={`/dashboard/squads/${s.id}`} className="rounded-2xl border border-black/10 dark:border-white/10 p-5 hover:bg-black/5 dark:hover:bg-white/5 transition">
              <div className="flex items-start justify-between">
                <div className="text-3xl">{s.emoji}</div>
                <div className="text-[10px] font-mono tracking-widest text-black/40 dark:text-white/40">{s.inviteCode}</div>
              </div>
              <div className="mt-3 text-lg font-medium">{s.name}</div>
              <div className="mt-2 flex items-center gap-3 text-xs text-black/50 dark:text-white/50">
                <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {s.memberCount}</span>
                <span className="flex items-center gap-1"><Target className="w-3 h-3" /> {s.questCount} quests</span>
                <span className="ml-auto text-[10px] uppercase tracking-wider">{s.role}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
