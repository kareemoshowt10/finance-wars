"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Play, Check, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { SAME_PAGE_QUESTIONS, BUDGET_BID_CATEGORIES, WORST_CASE_SCENARIOS } from "@/lib/games";

type Session = { id: string; game: string; status: string; createdAt: string; playCount: number; myScore: number | null };

const GAMES = [
  { id: "SAME_PAGE", name: "Same Page?", emoji: "🧭", description: "Answer 5 priorities independently. Reveal alignment." },
  { id: "BUDGET_BID", name: "Budget Bid", emoji: "💰", description: "Allocate a $500 windfall. Compare overlap." },
  { id: "WORST_CASE", name: "Worst Case", emoji: "🛡️", description: "Three crisis scenarios. Are you on the same playbook?" },
] as const;

export default function GamesView({ sessions: initial }: { sessions: Session[] }) {
  const [sessions, setSessions] = useState<Session[]>(initial);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function startGame(game: string) {
    setBusy(true);
    try {
      const r = await fetch("/api/games", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ game }) });
      if (r.ok) {
        const { session } = await r.json();
        setSessions((s) => [{ id: session.id, game: session.game, status: session.status, createdAt: session.createdAt, playCount: 0, myScore: null }, ...s]);
        setActiveId(session.id);
      }
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-4xl font-semibold tracking-[-0.03em] flex items-center gap-3">
          <Sparkles className="w-8 h-8" /> Money Date Mini-Games
        </h1>
        <p className="mt-2 text-sm text-black/60 dark:text-white/60">Ten-minute rituals that build alignment — and earn Trust Points.</p>
      </header>

      {activeId ? (
        <PlayPanel sessionId={activeId} onClose={() => { setActiveId(null); }} />
      ) : (
        <section className="grid md:grid-cols-3 gap-3">
          {GAMES.map((g) => (
            <motion.button
              key={g.id}
              whileHover={{ y: -3 }}
              disabled={busy}
              onClick={() => startGame(g.id)}
              className="rounded-3xl border border-black/10 dark:border-white/10 p-6 text-left hover:bg-black/5 dark:hover:bg-white/5 transition disabled:opacity-50"
            >
              <div className="text-4xl">{g.emoji}</div>
              <h3 className="mt-3 text-lg font-medium">{g.name}</h3>
              <p className="mt-1 text-sm text-black/60 dark:text-white/60">{g.description}</p>
              <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium"><Play className="w-3.5 h-3.5" /> Start session</div>
            </motion.button>
          ))}
        </section>
      )}

      <section>
        <h2 className="text-lg font-medium mb-3">Recent sessions</h2>
        {sessions.length === 0 ? (
          <div className="text-sm text-black/40 dark:text-white/40">No games played yet.</div>
        ) : (
          <ul className="space-y-2">
            {sessions.map((s) => {
              const game = GAMES.find((g) => g.id === s.game);
              return (
                <li key={s.id} className="flex items-center justify-between rounded-2xl border border-black/10 dark:border-white/10 p-4">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{game?.emoji}</div>
                    <div>
                      <div className="font-medium text-sm">{game?.name || s.game}</div>
                      <div className="text-xs text-black/50 dark:text-white/50">{new Date(s.createdAt).toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {s.status === "COMPLETED" ? (
                      <span className="text-sm tabular-nums font-medium">{s.myScore ?? 0}% alignment</span>
                    ) : (
                      <span className="text-xs px-2 py-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">{s.playCount}/2 played</span>
                    )}
                    <button onClick={() => setActiveId(s.id)} className="px-3 py-1.5 rounded-full border border-black/15 dark:border-white/15 text-xs flex items-center gap-1">Open <ArrowRight className="w-3 h-3" /></button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

type PlayState = {
  id: string; game: string; status: string;
  iPlayed: boolean; myAnswers: Record<string, string | number> | null;
  members: { userId: string | null; name?: string | null }[];
  plays: { userId: string; name: string; score: number | null }[];
  result: { alignment: number; breakdown?: unknown } | null;
};

function PlayPanel({ sessionId, onClose }: { sessionId: string; onClose: () => void }) {
  const [state, setState] = useState<PlayState | null>(null);
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { void load(); }, [sessionId]);

  async function load() {
    const r = await fetch(`/api/games/${sessionId}`);
    if (r.ok) {
      const j = await r.json();
      setState(j.session);
      if (j.session.myAnswers) setAnswers(j.session.myAnswers);
    }
  }

  async function submit() {
    setSubmitting(true);
    try {
      const r = await fetch(`/api/games/${sessionId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers }) });
      if (r.ok) await load();
    } finally { setSubmitting(false); }
  }

  if (!state) return <div className="text-sm text-black/40 dark:text-white/40">Loading…</div>;

  const game = GAMES.find((g) => g.id === state.game);
  const done = state.status === "COMPLETED";

  return (
    <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-black/10 dark:border-white/10 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-3xl">{game?.emoji}</div>
          <div>
            <h2 className="text-xl font-medium">{game?.name}</h2>
            <p className="text-xs text-black/50 dark:text-white/50">{game?.description}</p>
          </div>
        </div>
        <button onClick={onClose} className="text-sm text-black/60 dark:text-white/60">Close</button>
      </div>

      <AnimatePresence mode="wait">
        {done ? (
          <ResultView state={state} />
        ) : state.iPlayed ? (
          <motion.div key="waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-5 text-sm">
            <div className="flex items-center gap-2 font-medium"><Check className="w-4 h-4" /> You've locked in your answers</div>
            <p className="mt-1 text-black/60 dark:text-white/60">Waiting for your partner to play. Results stay hidden until both submit.</p>
          </motion.div>
        ) : state.game === "SAME_PAGE" ? (
          <SamePageForm answers={answers as Record<string, string>} setAnswers={setAnswers as (a: Record<string, string>) => void} onSubmit={submit} submitting={submitting} />
        ) : state.game === "BUDGET_BID" ? (
          <BudgetBidForm answers={answers as Record<string, number>} setAnswers={setAnswers as (a: Record<string, number>) => void} onSubmit={submit} submitting={submitting} />
        ) : (
          <WorstCaseForm answers={answers as Record<string, string>} setAnswers={setAnswers as (a: Record<string, string>) => void} onSubmit={submit} submitting={submitting} />
        )}
      </AnimatePresence>
    </motion.section>
  );
}

function SamePageForm({ answers, setAnswers, onSubmit, submitting }: { answers: Record<string, string>; setAnswers: (a: Record<string, string>) => void; onSubmit: () => void; submitting: boolean }) {
  const complete = SAME_PAGE_QUESTIONS.every((q) => answers[q.id]);
  return (
    <motion.div key="same-page" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      {SAME_PAGE_QUESTIONS.map((q) => (
        <div key={q.id}>
          <div className="text-sm font-medium">{q.question}</div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {q.choices.map((c) => (
              <button key={c} onClick={() => setAnswers({ ...answers, [q.id]: c })} className={cn("px-3 py-2 rounded-xl text-sm text-left border transition", answers[q.id] === c ? "border-black dark:border-white bg-black text-white dark:bg-white dark:text-black" : "border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5")}>
                {c}
              </button>
            ))}
          </div>
        </div>
      ))}
      <button onClick={onSubmit} disabled={!complete || submitting} className="w-full px-5 py-3 rounded-full bg-black text-white dark:bg-white dark:text-black text-sm font-medium disabled:opacity-50">
        {submitting ? "Locking in…" : "Lock in answers"}
      </button>
    </motion.div>
  );
}

function BudgetBidForm({ answers, setAnswers, onSubmit, submitting }: { answers: Record<string, number>; setAnswers: (a: Record<string, number>) => void; onSubmit: () => void; submitting: boolean }) {
  const sum = BUDGET_BID_CATEGORIES.reduce((s, c) => s + (Number(answers[c]) || 0), 0);
  return (
    <motion.div key="budget-bid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div className="text-sm text-black/60 dark:text-white/60">Allocate $500 across these categories. (Will normalize if total differs.)</div>
      <div className="space-y-2">
        {BUDGET_BID_CATEGORIES.map((c) => (
          <div key={c} className="flex items-center gap-3">
            <div className="w-32 text-sm">{c}</div>
            <input
              type="range" min={0} max={500} step={10}
              value={Number(answers[c]) || 0}
              onChange={(e) => setAnswers({ ...answers, [c]: Number(e.target.value) })}
              className="flex-1"
            />
            <div className="w-16 text-right tabular-nums text-sm">${Number(answers[c]) || 0}</div>
          </div>
        ))}
      </div>
      <div className="text-xs text-black/50 dark:text-white/50">Current total: ${sum}</div>
      <button onClick={onSubmit} disabled={submitting || sum === 0} className="w-full px-5 py-3 rounded-full bg-black text-white dark:bg-white dark:text-black text-sm font-medium disabled:opacity-50">
        {submitting ? "Locking in…" : "Lock in bid"}
      </button>
    </motion.div>
  );
}

function WorstCaseForm({ answers, setAnswers, onSubmit, submitting }: { answers: Record<string, string>; setAnswers: (a: Record<string, string>) => void; onSubmit: () => void; submitting: boolean }) {
  const complete = WORST_CASE_SCENARIOS.every((s) => answers[s.id]);
  return (
    <motion.div key="worst-case" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      {WORST_CASE_SCENARIOS.map((s) => (
        <div key={s.id}>
          <div className="text-xs uppercase tracking-wider text-rose-500">{s.label}</div>
          <div className="mt-1 text-sm font-medium">{s.question}</div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {s.choices.map((c) => (
              <button key={c} onClick={() => setAnswers({ ...answers, [s.id]: c })} className={cn("px-3 py-2 rounded-xl text-sm text-left border transition", answers[s.id] === c ? "border-black dark:border-white bg-black text-white dark:bg-white dark:text-black" : "border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5")}>
                {c}
              </button>
            ))}
          </div>
        </div>
      ))}
      <button onClick={onSubmit} disabled={!complete || submitting} className="w-full px-5 py-3 rounded-full bg-black text-white dark:bg-white dark:text-black text-sm font-medium disabled:opacity-50">
        {submitting ? "Locking in…" : "Lock in plan"}
      </button>
    </motion.div>
  );
}

function ResultView({ state }: { state: PlayState }) {
  const alignment = state.result?.alignment ?? 0;
  const tone = alignment >= 80 ? "emerald" : alignment >= 50 ? "amber" : "rose";
  const message = alignment >= 80 ? "On the same page. Strong alignment." : alignment >= 50 ? "Mostly aligned — worth a quick chat on the rest." : "You're not aligned yet. This is a great conversation to have over a money date.";
  const reward = alignment >= 80 ? 20 : alignment >= 50 ? 10 : 5;
  return (
    <motion.div key="result" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-4">
      <div className={cn("inline-block px-6 py-4 rounded-3xl", tone === "emerald" ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : tone === "amber" ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" : "bg-rose-500/15 text-rose-500")}>
        <div className="text-xs uppercase tracking-wider">Alignment</div>
        <div className="text-5xl font-semibold tabular-nums">{alignment}%</div>
      </div>
      <p className="text-sm text-black/70 dark:text-white/70 max-w-md mx-auto">{message}</p>
      <p className="text-xs text-emerald-600 dark:text-emerald-400">+{reward} Trust Points awarded to each player.</p>
    </motion.div>
  );
}
