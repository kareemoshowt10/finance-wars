"use client";
import { useEffect, useState } from "react";
import { Plus, Trash2, Pencil } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import Modal from "../_components/Modal";

type Goal = { id: string; name: string; targetAmount: number; currentAmount: number; deadline: string };

export default function GoalsPage() {
  const [items, setItems] = useState<Goal[]>([]);
  const [currency, setCurrency] = useState("USD");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Goal | null | "new">(null);

  async function load() {
    setLoading(true);
    const [g, me] = await Promise.all([
      fetch("/api/goals").then((r) => r.json()),
      fetch("/api/auth/me").then((r) => r.json()),
    ]);
    setItems(g);
    if (me?.currency) setCurrency(me.currency);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function remove(id: string) {
    if (!confirm("Delete this goal?")) return;
    await fetch(`/api/goals/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-semibold tracking-[-0.03em]">Goals</h1>
          <p className="text-black/50 dark:text-white/50 mt-1 text-sm">Save for what matters.</p>
        </div>
        <button onClick={() => setOpen("new")} className="btn-primary"><Plus className="w-4 h-4" />Add goal</button>
      </header>

      {loading ? (
        <div className="text-black/40 dark:text-white/40 text-sm">Loading…</div>
      ) : items.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-black/60 dark:text-white/60">No goals yet.</div>
          <button onClick={() => setOpen("new")} className="btn-secondary mt-4">Set your first goal</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {items.map((g) => {
            const pct = g.targetAmount > 0 ? Math.min(100, (g.currentAmount / g.targetAmount) * 100) : 0;
            return (
              <div key={g.id} className="card p-5 flex items-center justify-between group">
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-black/40 dark:text-white/40">Deadline {formatDate(g.deadline)}</div>
                  <div className="text-base font-medium mt-0.5 truncate">{g.name}</div>
                  <div className="mt-2 text-2xl font-semibold tracking-tight">{formatCurrency(g.currentAmount, currency)}</div>
                  <div className="text-xs text-black/50 dark:text-white/50">of {formatCurrency(g.targetAmount, currency)}</div>
                  <Projection goalId={g.id} currency={currency} />
                  <div className="mt-2 opacity-0 group-hover:opacity-100 transition flex gap-1">
                    <button onClick={() => setOpen(g)} className="p-1.5 text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => remove(g.id)} className="p-1.5 text-black/40 dark:text-white/40 hover:text-rose-400"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                <div className="relative w-24 h-24 shrink-0">
                  <svg viewBox="0 0 40 40" className="w-full h-full -rotate-90">
                    <circle cx="20" cy="20" r="16" stroke="rgba(255,255,255,0.08)" strokeWidth="3" fill="none" />
                    <circle cx="20" cy="20" r="16" stroke="url(#g)" strokeWidth="3" fill="none"
                      strokeDasharray={`${pct} 100`} strokeLinecap="round" pathLength={100} />
                    <defs>
                      <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
                        <stop offset="0%" stopColor="#a78bfa" />
                        <stop offset="100%" stopColor="#60a5fa" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center text-sm font-medium">{Math.round(pct)}%</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {open !== null && (
        <GoalModal goal={open === "new" ? null : open} onClose={() => setOpen(null)} onSaved={() => { setOpen(null); load(); }} />
      )}
    </div>
  );
}

function Projection({ goalId, currency }: { goalId: string; currency: string }) {
  const [p, setP] = useState<{ onTrack: boolean; shortfall: number; eta: string | null; requiredPerMonth: number } | null>(null);
  useEffect(() => {
    fetch(`/api/goals/${goalId}/projection`).then((r) => r.json()).then(setP).catch(() => {});
  }, [goalId]);
  if (!p) return null;
  const etaLabel = p.eta ? new Date(p.eta).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "—";
  return (
    <div className="mt-2 flex items-center gap-2 text-[11px]">
      <span className={`px-2 py-0.5 rounded-full ${p.onTrack ? "bg-emerald-500/15 text-emerald-500" : "bg-amber-500/15 text-amber-500"}`}>
        {p.onTrack ? "On track" : `Behind by ${formatCurrency(p.shortfall, currency)}/mo`}
      </span>
      <span className="text-black/40 dark:text-white/40">ETA {etaLabel}</span>
    </div>
  );
}

function GoalModal({ goal, onClose, onSaved }: { goal: Goal | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(goal?.name || "");
  const [targetAmount, setTarget] = useState(goal?.targetAmount?.toString() || "");
  const [currentAmount, setCurrent] = useState(goal?.currentAmount?.toString() || "0");
  const [deadline, setDeadline] = useState(goal?.deadline ? new Date(goal.deadline).toISOString().slice(0, 10) : "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError("Name is required");
    if (!targetAmount || Number(targetAmount) <= 0) return setError("Enter a target amount");
    if (!deadline) return setError("Pick a deadline");
    setSaving(true);
    try {
      const res = await fetch(goal ? `/api/goals/${goal.id}` : "/api/goals", {
        method: goal ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, targetAmount: Number(targetAmount),
          currentAmount: Number(currentAmount), deadline,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally { setSaving(false); }
  }

  return (
    <Modal onClose={onClose} title={goal ? "Edit goal" : "New goal"}>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="text-xs text-black/50 dark:text-white/50">Name</label>
          <input className="input mt-1" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-black/50 dark:text-white/50">Target</label>
            <input className="input mt-1" type="number" step="0.01" required value={targetAmount} onChange={(e) => setTarget(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-black/50 dark:text-white/50">Current</label>
            <input className="input mt-1" type="number" step="0.01" value={currentAmount} onChange={(e) => setCurrent(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="text-xs text-black/50 dark:text-white/50">Deadline</label>
          <input className="input mt-1" type="date" required value={deadline} onChange={(e) => setDeadline(e.target.value)} />
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
