"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { Minus, Plus, Check, Undo2, Zap, ChevronDown, Users } from "lucide-react";
import { CATEGORIES } from "@/lib/utils";

// The sub-5-second capture flow (docs/capture-engine/SPEC.md):
// type "5.50 coffee" → Enter → saved with an auto-guessed category chip.
// Nothing sits between "I spent money" and "it's logged" except the number.

type Kind = "expense" | "income";

type SavedTx = {
  id: string;
  amount: number;
  type: string;
  category: string;
  description: string;
};

type Pattern = { id: string; description: string; amount: number; category: string; kind: string };

export default function QuickCapture({ compact = false, onSaved }: { compact?: boolean; onSaved?: () => void }) {
  const [kind, setKind] = useState<Kind>("expense");
  const [text, setText] = useState("");
  const [shared, setShared] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [saved, setSaved] = useState<SavedTx | null>(null);
  const [dupNote, setDupNote] = useState<string | null>(null);
  const [suggestedPattern, setSuggestedPattern] = useState<string | null>(null);
  const [pickingCategory, setPickingCategory] = useState(false);

  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadPatterns = useCallback(async () => {
    try {
      const j = await fetch("/api/capture/patterns").then((r) => r.json());
      const d = j?.data ?? j;
      setPatterns((d?.confirmed ?? []).slice(0, 5));
    } catch { /* patterns are a bonus, never an error state */ }
  }, []);

  useEffect(() => { loadPatterns(); }, [loadPatterns]);
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  function armToastDismiss() {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => {
      setSaved(null); setDupNote(null); setSuggestedPattern(null); setPickingCategory(false);
    }, 8000);
  }

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (busy || !text.trim()) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/capture", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, kind, visibility: shared ? "shared" : "personal" }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(j?.error || "Couldn't save that."); return; }
    const d = j?.data ?? j;
    setSaved(d.transaction);
    setDupNote(d.possibleDuplicate ? `Logged twice? Same amount ${d.possibleDuplicate.minutesAgo}m ago.` : null);
    setSuggestedPattern(d.patternSuggested ?? null);
    setPickingCategory(false);
    setText("");
    inputRef.current?.focus();
    armToastDismiss();
    onSaved?.();
  }

  async function undo() {
    if (!saved) return;
    await fetch(`/api/transactions/${saved.id}`, { method: "DELETE" }).catch(() => {});
    setSaved(null); setDupNote(null); setSuggestedPattern(null);
    inputRef.current?.focus();
    onSaved?.();
  }

  async function correct(category: string) {
    if (!saved) return;
    setPickingCategory(false);
    setSaved({ ...saved, category });
    await fetch("/api/capture/correct", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transactionId: saved.id, category }),
    }).catch(() => {});
    armToastDismiss();
  }

  async function patternAction(id: string, action: "confirm" | "dismiss" | "use") {
    const res = await fetch("/api/capture/patterns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    if (action === "use" && res.ok) {
      const j = await res.json().catch(() => ({}));
      const d = j?.data ?? j;
      if (d?.transaction) {
        setSaved({ ...d.transaction, type: "" });
        armToastDismiss();
        onSaved?.();
      }
    }
    if (action === "confirm" || action === "dismiss") setSuggestedPattern(null);
    loadPatterns();
  }

  return (
    <div className={compact ? "" : "card p-5"}>
      <form onSubmit={submit} className="flex items-stretch gap-2">
        {/* Sign is the button, never typed — no fat-fingered minus signs. */}
        <div className="flex rounded-xl overflow-hidden border border-black/10 dark:border-white/10 shrink-0">
          <button
            type="button"
            onClick={() => { setKind("expense"); inputRef.current?.focus(); }}
            className={`px-3 flex items-center transition ${kind === "expense" ? "bg-red-500/15 text-red-500" : "text-black/40 dark:text-white/40 hover:bg-black/5 dark:hover:bg-white/5"}`}
            aria-label="Log an expense"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => { setKind("income"); inputRef.current?.focus(); }}
            className={`px-3 flex items-center transition ${kind === "income" ? "bg-emerald-500/15 text-emerald-500" : "text-black/40 dark:text-white/40 hover:bg-black/5 dark:hover:bg-white/5"}`}
            aria-label="Log income"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <input
          ref={inputRef}
          value={text}
          onChange={(e) => { setText(e.target.value); setError(null); }}
          placeholder={kind === "expense" ? "5.50 coffee" : "140 drywall job"}
          className="input flex-1 text-base"
          autoComplete="off"
          inputMode="text"
          enterKeyHint="done"
        />

        <button disabled={busy || !text.trim()} className="btn-primary shrink-0">
          {busy ? "…" : "Log"}
        </button>
      </form>

      {error && <div className="mt-2 text-sm text-red-500">{error}</div>}

      {/* Optional details, never in the main path. */}
      <button
        type="button"
        onClick={() => setShowDetails((v) => !v)}
        className="mt-2 text-xs text-black/40 dark:text-white/40 inline-flex items-center gap-1 hover:text-black/70 dark:hover:text-white/70"
      >
        <ChevronDown className={`w-3 h-3 transition ${showDetails ? "rotate-180" : ""}`} />details
      </button>
      {showDetails && (
        <label className="mt-2 flex items-center gap-2 text-sm text-black/60 dark:text-white/60">
          <input type="checkbox" checked={shared} onChange={(e) => setShared(e.target.checked)} className="accent-violet-500" />
          <Users className="w-3.5 h-3.5" /> Count toward our shared household picture
        </label>
      )}

      {/* One-tap confirmed patterns. */}
      {patterns.length > 0 && !saved && (
        <div className="mt-3 flex flex-wrap gap-2">
          {patterns.map((p) => (
            <button
              key={p.id}
              onClick={() => patternAction(p.id, "use")}
              className="text-xs px-3 py-1.5 rounded-full border border-black/10 dark:border-white/10 hover:border-violet-500/50 hover:text-violet-500 transition inline-flex items-center gap-1.5"
              title={`One-tap: ${p.description}`}
            >
              <Zap className="w-3 h-3" />
              {p.description} · ${Math.round(p.amount)}
            </button>
          ))}
        </div>
      )}

      {/* Saved toast: category chip (tap to change) + undo. */}
      {saved && (
        <div className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm">
              <Check className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="font-medium">${saved.amount.toFixed(2)}</span>
              <span className="text-black/50 dark:text-white/50 truncate max-w-[140px]">{saved.description}</span>
              <button
                onClick={() => setPickingCategory((v) => !v)}
                className="text-xs px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-500 hover:bg-violet-500/25 transition"
                title="Tap to change category"
              >
                {saved.category}
              </button>
            </div>
            <button onClick={undo} className="text-xs inline-flex items-center gap-1 text-black/50 dark:text-white/50 hover:text-red-500">
              <Undo2 className="w-3 h-3" />undo
            </button>
          </div>

          {dupNote && <div className="mt-2 text-xs text-orange-500">{dupNote}</div>}

          {pickingCategory && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => correct(c)}
                  className={`text-xs px-2 py-1 rounded-full border transition ${c === saved.category ? "border-violet-500 text-violet-500" : "border-black/10 dark:border-white/10 hover:border-violet-500/50"}`}
                >
                  {c}
                </button>
              ))}
            </div>
          )}

          {suggestedPattern && (
            <div className="mt-2 flex items-center gap-2 text-xs">
              <span className="text-black/60 dark:text-white/60">Log this regularly? Save as one-tap:</span>
              <button onClick={() => patternAction(suggestedPattern, "confirm")} className="px-2 py-0.5 rounded-full bg-violet-500 text-white">Yes</button>
              <button onClick={() => patternAction(suggestedPattern, "dismiss")} className="px-2 py-0.5 rounded-full border border-black/10 dark:border-white/10">No</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
