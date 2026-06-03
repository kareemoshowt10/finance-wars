"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Brain, ArrowLeft, Lock, Eye, Check, Sparkles, AlertTriangle, Heart, ArrowRight } from "lucide-react";

type Prompt = {
  id: string;
  category: string;
  prompt: string;
  lowLabel: string;
  highLabel: string;
  gapInsight: string;
};

type RoundSummary = {
  id: string;
  status: "OPEN" | "REVEALED";
  createdAt: string;
  revealedAt: string | null;
  mySubmitted: boolean;
  submittedCount: number;
};

type RoundDetail = {
  id: string;
  status: "OPEN" | "REVEALED";
  prompts: Prompt[];
  myAnswers: Record<string, { value: number; note?: string }>;
  mySubmitted: boolean;
  partnerSubmitted: boolean;
  bothSubmitted: boolean;
};

type RevealItem = {
  promptId: string;
  prompt: string;
  category: string;
  lowLabel: string;
  highLabel: string;
  you: { value: number; note?: string } | null;
  partner: { value: number; note?: string } | null;
  gap: number;
  gapInsight: string | null;
};

type Reveal = {
  alignmentScore: number;
  items: RevealItem[];
  biggestGaps: string[];
  strongestAlignments: string[];
  partnerName: string;
};

export default function MoneyMindPage() {
  const [household, setHousehold] = useState<{ id: string; name: string } | null>(null);
  const [rounds, setRounds] = useState<RoundSummary[]>([]);
  const [active, setActive] = useState<RoundDetail | null>(null);
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const loadList = useCallback(async () => {
    const j = await fetch("/api/money-mind").then((r) => r.json());
    setHousehold(j?.household ?? null);
    setRounds(j?.rounds ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { loadList(); }, [loadList]);

  async function openRound(id: string, status: string) {
    if (status === "REVEALED") {
      const j = await fetch(`/api/money-mind/${id}/reveal`).then((r) => r.json());
      setReveal(j?.data ?? j);
      setActive(null);
    } else {
      const j = await fetch(`/api/money-mind/${id}`).then((r) => r.json());
      setActive(j?.data ?? j);
      setReveal(null);
    }
  }

  async function startRound() {
    setBusy(true);
    const j = await fetch("/api/money-mind", { method: "POST" }).then((r) => r.json());
    setBusy(false);
    const round = j?.data?.round ?? j?.round;
    if (round) { await loadList(); openRound(round.id, "OPEN"); }
  }

  if (loading) return <div className="text-sm text-black/50 dark:text-white/50">Loading…</div>;

  if (!household) {
    return (
      <div className="space-y-6">
        <Header />
        <div className="card p-8 text-center text-sm text-black/50 dark:text-white/50">
          Money Mind is a two-player game. Set up a household with your partner first.
          <Link href="/dashboard/couples" className="btn-secondary mt-4 inline-flex">Go to Couples</Link>
        </div>
      </div>
    );
  }

  if (reveal) {
    return <RevealView reveal={reveal} onBack={() => { setReveal(null); loadList(); }} />;
  }

  if (active) {
    return <AnswerView round={active} onDone={() => { setActive(null); loadList(); }} onReveal={async () => {
      const j = await fetch(`/api/money-mind/${active.id}/reveal`, { method: "POST" }).then((r) => r.json());
      const data = j?.data ?? j;
      if (data?.items) { setReveal(data); setActive(null); }
    }} />;
  }

  return (
    <div className="space-y-6">
      <Header />

      <div className="card p-6 bg-gradient-to-br from-violet-500/10 via-fuchsia-500/5 to-indigo-500/10">
        <div className="flex items-start gap-3">
          <Brain className="w-6 h-6 text-violet-400 shrink-0 mt-1" />
          <div>
            <h2 className="text-lg font-semibold">How it works</h2>
            <p className="text-sm text-black/60 dark:text-white/60 mt-1 leading-relaxed max-w-2xl">
              You and your partner answer the same 10 questions about money — <strong>privately</strong>.
              Nobody sees the other's answers until you both finish and reveal together. Then you'll see
              where you're aligned, where you quietly disagree, and exactly what to talk about. No scores
              to win. Just the truth, made safe to say.
            </p>
            <button onClick={startRound} disabled={busy} className="btn-primary mt-4">
              <Sparkles className="w-4 h-4" />{busy ? "Starting…" : "Start a new round"}
            </button>
          </div>
        </div>
      </div>

      {rounds.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-black/60 dark:text-white/60">Rounds</h3>
          {rounds.map((rd) => (
            <button
              key={rd.id}
              onClick={() => openRound(rd.id, rd.status)}
              className="card p-4 w-full flex items-center justify-between gap-4 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition text-left"
            >
              <div>
                <div className="text-sm font-medium flex items-center gap-2">
                  {rd.status === "REVEALED" ? <Eye className="w-4 h-4 text-emerald-500" /> : <Lock className="w-4 h-4 text-violet-400" />}
                  {rd.status === "REVEALED" ? "Revealed" : "In progress"}
                </div>
                <div className="text-xs text-black/50 dark:text-white/50 mt-0.5">
                  {new Date(rd.createdAt).toLocaleDateString()} · {rd.submittedCount}/2 submitted
                  {rd.status === "OPEN" && rd.mySubmitted && " · you're done, waiting on partner"}
                </div>
              </div>
              <ArrowRight className="w-4 h-4 opacity-30" />
            </button>
          ))}
        </section>
      )}
    </div>
  );
}

function Header() {
  return (
    <header>
      <Link href="/dashboard/couples" className="text-xs opacity-50 hover:opacity-100 inline-flex items-center gap-1">
        <ArrowLeft className="w-3 h-3" />Couples
      </Link>
      <h1 className="mt-2 text-4xl font-semibold tracking-[-0.03em] flex items-center gap-3">
        <Brain className="w-8 h-8" /> Money Mind
      </h1>
      <p className="text-black/50 dark:text-white/50 mt-1 text-sm">
        Find out what you each really think — before it becomes a fight.
      </p>
    </header>
  );
}

const CATEGORY_LABEL: Record<string, string> = {
  spending: "Spending", security: "Security", ambition: "Ambition",
  fairness: "Fairness", communication: "Communication", future: "Future",
};

function AnswerView({ round, onDone, onReveal }: { round: RoundDetail; onDone: () => void; onReveal: () => void }) {
  const [answers, setAnswers] = useState<Record<string, { value: number; note?: string }>>(round.myAnswers || {});
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(round.mySubmitted);

  const allAnswered = round.prompts.every((p) => answers[p.id]?.value);

  async function save(submit: boolean) {
    setSaving(true);
    const res = await fetch(`/api/money-mind/${round.id}/answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers, submit }),
    });
    setSaving(false);
    if (res.ok && submit) setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="space-y-6">
        <Header />
        <div className="card p-8 text-center">
          <Check className="w-10 h-10 mx-auto mb-3 text-emerald-500" />
          <h2 className="text-lg font-semibold">Your answers are locked in</h2>
          <p className="text-sm text-black/50 dark:text-white/50 mt-1 max-w-md mx-auto">
            {round.partnerSubmitted
              ? "You've both answered. Reveal your results together — ideally side by side."
              : "Now it's your partner's turn. We'll nudge them. Come back to reveal once you've both finished."}
          </p>
          <div className="flex gap-2 justify-center mt-5">
            {round.partnerSubmitted && (
              <button onClick={onReveal} className="btn-primary"><Eye className="w-4 h-4" />Reveal together</button>
            )}
            <button onClick={onDone} className="btn-secondary">Back</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Header />
      <div className="card p-4 flex items-center gap-2 text-sm text-black/60 dark:text-white/60">
        <Lock className="w-4 h-4 text-violet-400 shrink-0" />
        Private until you both reveal. Answer honestly — that's the whole point.
      </div>

      <div className="space-y-4">
        {round.prompts.map((p, i) => {
          const val = answers[p.id]?.value ?? 0;
          return (
            <div key={p.id} className="card p-5">
              <div className="text-xs uppercase tracking-wider text-violet-400">{CATEGORY_LABEL[p.category] ?? p.category}</div>
              <div className="text-base font-medium mt-1">{i + 1}. {p.prompt}</div>
              <div className="mt-4">
                <input
                  type="range" min={1} max={7} step={1} value={val || 4}
                  onChange={(e) => setAnswers((a) => ({ ...a, [p.id]: { ...a[p.id], value: Number(e.target.value) } }))}
                  className="w-full accent-violet-500"
                  style={{ opacity: val ? 1 : 0.5 }}
                />
                <div className="flex justify-between text-xs text-black/50 dark:text-white/50 mt-1 gap-4">
                  <span className="max-w-[45%]">{p.lowLabel}</span>
                  <span className="max-w-[45%] text-right">{p.highLabel}</span>
                </div>
                {!val && <div className="text-xs text-black/40 dark:text-white/40 mt-2">Drag to answer</div>}
              </div>
              <input
                type="text" maxLength={500} placeholder="Add a private note (optional, shown at reveal)"
                value={answers[p.id]?.note ?? ""}
                onChange={(e) => setAnswers((a) => ({ ...a, [p.id]: { value: a[p.id]?.value ?? 4, note: e.target.value } }))}
                className="input mt-3 text-sm"
              />
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-3 sticky bottom-4">
        <button onClick={() => save(false)} disabled={saving} className="btn-secondary">Save draft</button>
        <button onClick={() => save(true)} disabled={saving || !allAnswered} className="btn-primary">
          {saving ? "Saving…" : allAnswered ? "Lock in my answers" : "Answer all to submit"}
        </button>
      </div>
    </div>
  );
}

function RevealView({ reveal, onBack }: { reveal: Reveal; onBack: () => void }) {
  const score = reveal.alignmentScore;
  const scoreColor = score >= 75 ? "text-emerald-500" : score >= 50 ? "text-yellow-500" : "text-orange-500";
  const scoreLabel = score >= 75 ? "Strongly aligned" : score >= 50 ? "Mostly aligned" : "Worth a real talk";
  const gapSet = new Set(reveal.biggestGaps);
  const alignSet = new Set(reveal.strongestAlignments);

  return (
    <div className="space-y-6">
      <Header />

      <div className="card p-6 text-center bg-gradient-to-br from-violet-500/10 via-fuchsia-500/5 to-indigo-500/10">
        <div className="text-xs uppercase tracking-wider text-black/50 dark:text-white/50">Alignment with {reveal.partnerName}</div>
        <div className={`text-6xl font-semibold mt-2 ${scoreColor}`}>{score}<span className="text-2xl">%</span></div>
        <div className="text-sm font-medium mt-1">{scoreLabel}</div>
        <p className="text-xs text-black/50 dark:text-white/50 mt-3 max-w-md mx-auto">
          This isn't a grade. A lower number just means you have more to talk about — and now you know exactly what.
        </p>
      </div>

      {reveal.biggestGaps.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold flex items-center gap-2 text-orange-500">
            <AlertTriangle className="w-4 h-4" />Talk about these
          </h3>
          <div className="mt-3 space-y-3">
            {reveal.items.filter((it) => gapSet.has(it.promptId)).map((it) => (
              <RevealRow key={it.promptId} item={it} partnerName={reveal.partnerName} highlight="gap" />
            ))}
          </div>
        </section>
      )}

      {reveal.strongestAlignments.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold flex items-center gap-2 text-emerald-500">
            <Heart className="w-4 h-4" />You're on the same page here
          </h3>
          <div className="mt-3 space-y-3">
            {reveal.items.filter((it) => alignSet.has(it.promptId)).map((it) => (
              <RevealRow key={it.promptId} item={it} partnerName={reveal.partnerName} highlight="align" />
            ))}
          </div>
        </section>
      )}

      <section>
        <h3 className="text-sm font-semibold text-black/60 dark:text-white/60">Every answer</h3>
        <div className="mt-3 space-y-3">
          {reveal.items.map((it) => (
            <RevealRow key={it.promptId} item={it} partnerName={reveal.partnerName} />
          ))}
        </div>
      </section>

      <button onClick={onBack} className="btn-secondary">Back to rounds</button>
    </div>
  );
}

function RevealRow({ item, partnerName, highlight }: { item: RevealItem; partnerName: string; highlight?: "gap" | "align" }) {
  const you = item.you?.value ?? 0;
  const partner = item.partner?.value ?? 0;
  const ring = highlight === "gap" ? "ring-1 ring-orange-500/40" : highlight === "align" ? "ring-1 ring-emerald-500/30" : "";

  return (
    <div className={`card p-5 ${ring}`}>
      <div className="text-sm font-medium">{item.prompt}</div>
      <div className="mt-3 relative h-10">
        <div className="absolute inset-x-0 top-1/2 h-0.5 bg-black/10 dark:bg-white/10 -translate-y-1/2" />
        {/* you marker */}
        <Marker value={you} color="bg-violet-500" label="You" align="top" />
        <Marker value={partner} color="bg-fuchsia-500" label={partnerName} align="bottom" />
      </div>
      <div className="flex justify-between text-xs text-black/45 dark:text-white/45 mt-1 gap-4">
        <span className="max-w-[45%]">{item.lowLabel}</span>
        <span className="max-w-[45%] text-right">{item.highLabel}</span>
      </div>
      {(item.you?.note || item.partner?.note) && (
        <div className="mt-3 space-y-1 text-xs">
          {item.you?.note && <div><span className="text-violet-400 font-medium">You:</span> <span className="text-black/60 dark:text-white/60">{item.you.note}</span></div>}
          {item.partner?.note && <div><span className="text-fuchsia-400 font-medium">{partnerName}:</span> <span className="text-black/60 dark:text-white/60">{item.partner.note}</span></div>}
        </div>
      )}
      {item.gapInsight && (
        <div className="mt-3 text-xs text-orange-500/90 bg-orange-500/10 rounded-lg p-3 leading-relaxed">{item.gapInsight}</div>
      )}
    </div>
  );
}

function Marker({ value, color, label, align }: { value: number; color: string; label: string; align: "top" | "bottom" }) {
  if (!value) return null;
  const pct = ((value - 1) / 6) * 100;
  return (
    <div className="absolute -translate-x-1/2" style={{ left: `${pct}%`, top: align === "top" ? "-2px" : "auto", bottom: align === "bottom" ? "-2px" : "auto" }}>
      <div className={`w-3 h-3 rounded-full ${color} ring-2 ring-white dark:ring-black`} />
      <div className={`text-[10px] absolute left-1/2 -translate-x-1/2 whitespace-nowrap ${align === "top" ? "-top-4" : "-bottom-4"} ${color === "bg-violet-500" ? "text-violet-400" : "text-fuchsia-400"}`}>{label}</div>
    </div>
  );
}
