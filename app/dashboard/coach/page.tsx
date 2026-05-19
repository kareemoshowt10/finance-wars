"use client";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Send, Sparkles } from "lucide-react";

type ChartData = { type: "bar" | "progress" | "line"; data: { label: string; value: number }[] };
type Msg = { id: string; role: "user" | "coach"; text: string; chart?: ChartData };

const INITIAL_PROMPTS = [
  "How am I doing this month?",
  "What did I spend on food last month?",
  "What are my top expenses?",
  "Show me my subscriptions",
  "Am I on track for my goals?",
  "How can I save more?",
];

export default function CoachPage() {
  const [messages, setMessages] = useState<Msg[]>([
    { id: "intro", role: "coach", text: "Hi — I'm your finance coach. I look at your real data and give straight answers. Try a prompt below or ask anything." },
  ]);
  const [input, setInput] = useState("");
  const [followUps, setFollowUps] = useState<string[]>(INITIAL_PROMPTS);
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function send(text: string) {
    if (!text.trim() || busy) return;
    const userMsg: Msg = { id: `u${Date.now()}`, role: "user", text };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/coach", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: text }) });
      const data = await res.json();
      setMessages((m) => [...m, { id: `c${Date.now()}`, role: "coach", text: data.reply, chart: data.chart }]);
      setFollowUps(data.suggestedFollowUps || INITIAL_PROMPTS);
    } catch {
      setMessages((m) => [...m, { id: `c${Date.now()}`, role: "coach", text: "Something went sideways. Try again?" }]);
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <header>
        <h1 className="text-4xl md:text-5xl font-semibold tracking-[-0.03em] flex items-center gap-3">
          <MessageCircle className="w-8 h-8" />Coach
        </h1>
        <p className="text-black/50 dark:text-white/50 mt-1 text-sm">A rule-based assistant that reads your real data.</p>
      </header>

      <div className="card p-5 min-h-[60vh] flex flex-col">
        <div className="flex-1 space-y-4 overflow-y-auto pr-1">
          <AnimatePresence initial={false}>
            {messages.map((m) => (
              <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${m.role === "user" ? "bg-black text-white dark:bg-white dark:text-black" : "bg-black/5 dark:bg-white/5"}`}>
                  {m.text}
                  {m.chart && <MiniChart chart={m.chart} />}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {busy && <div className="text-xs text-black/40 dark:text-white/40 flex items-center gap-1"><Sparkles className="w-3 h-3 animate-pulse" /> Thinking…</div>}
          <div ref={endRef} />
        </div>

        {followUps.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-3 border-t border-black/5 dark:border-white/5 mt-3">
            {followUps.map((f) => (
              <button key={f} onClick={() => send(f)} disabled={busy} className="text-xs px-3 py-1.5 rounded-full border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-40">
                {f}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="mt-3 flex gap-2">
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask the coach anything…" className="input flex-1" />
          <button type="submit" disabled={busy || !input.trim()} className="btn-primary"><Send className="w-4 h-4" /></button>
        </form>
      </div>
    </div>
  );
}

function MiniChart({ chart }: { chart: ChartData }) {
  const max = Math.max(...chart.data.map((d) => d.value), 1);
  if (chart.type === "progress") {
    return (
      <div className="mt-3 space-y-2">
        {chart.data.map((d) => (
          <div key={d.label}>
            <div className="flex justify-between text-[11px] opacity-70 mb-0.5"><span>{d.label}</span><span>{d.value}%</span></div>
            <div className="h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-indigo-500 to-fuchsia-500" style={{ width: `${Math.min(100, d.value)}%` }} />
            </div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="mt-3 space-y-1.5">
      {chart.data.map((d) => (
        <div key={d.label}>
          <div className="flex justify-between text-[11px] opacity-70 mb-0.5"><span className="truncate">{d.label}</span><span className="tabular-nums">${Math.round(d.value).toLocaleString()}</span></div>
          <div className="h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500" style={{ width: `${(d.value / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
