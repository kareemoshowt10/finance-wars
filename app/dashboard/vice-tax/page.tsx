"use client";
import { useEffect, useState } from "react";
import { Plus, Trash2, Flame, Power } from "lucide-react";
import { CATEGORIES, formatCurrency } from "@/lib/utils";

type Goal = { id: string; name: string; currentAmount: number; targetAmount: number };
type ViceTax = {
  id: string;
  category: string;
  mode: "PERCENT" | "FIXED";
  rate: number;
  enabled: boolean;
  taxedTotal: number;
  hitCount: number;
  goalId: string;
  goal: Goal;
};

export default function ViceTaxPage() {
  const [items, setItems] = useState<ViceTax[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [currency, setCurrency] = useState("USD");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    setLoading(true);
    const [v, g, me] = await Promise.all([
      fetch("/api/vice-taxes").then((r) => r.json()),
      fetch("/api/goals").then((r) => r.json()),
      fetch("/api/auth/me").then((r) => r.json()),
    ]);
    setItems(v?.items ?? v?.data?.items ?? []);
    setGoals(Array.isArray(g) ? g : g?.items ?? []);
    if (me?.currency) setCurrency(me.currency);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function toggle(t: ViceTax) {
    await fetch(`/api/vice-taxes/${t.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !t.enabled }),
    });
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this vice tax?")) return;
    await fetch(`/api/vice-taxes/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-semibold tracking-[-0.03em] flex items-center gap-3">
            <Flame className="w-8 h-8" /> Vice Tax
          </h1>
          <p className="text-black/50 dark:text-white/50 mt-1 text-sm">
            Turn guilty pleasures into savings — every matching expense funds a goal.
          </p>
        </div>
        <button onClick={() => setShowForm((v) => !v)} className="btn-primary">
          <Plus className="w-4 h-4" />New tax
        </button>
      </header>

      {showForm && (
        <NewViceTaxForm
          goals={goals}
          onSaved={() => { setShowForm(false); load(); }}
        />
      )}

      {loading ? (
        <div className="text-sm text-black/50 dark:text-white/50">Loading…</div>
      ) : items.length === 0 ? (
        <div className="card p-8 text-center text-sm text-black/50 dark:text-white/50">
          No vice taxes yet. Pick a category you overspend on and route a cut to a goal.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((t) => (
            <div key={t.id} className={`card p-5 ${t.enabled ? "" : "opacity-60"}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold">{t.category}</div>
                  <div className="text-xs text-black/50 dark:text-white/50 mt-0.5">
                    {t.mode === "PERCENT" ? `${t.rate}% per expense` : `${formatCurrency(t.rate, currency)} per expense`} → {t.goal?.name ?? "goal"}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => toggle(t)} className="btn-ghost" title={t.enabled ? "Disable" : "Enable"}>
                    <Power className="w-4 h-4" />
                  </button>
                  <button onClick={() => remove(t.id)} className="btn-ghost text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="text-black/50 dark:text-white/50">Total taxed</div>
                  <div className="font-semibold mt-0.5">{formatCurrency(t.taxedTotal, currency)}</div>
                </div>
                <div>
                  <div className="text-black/50 dark:text-white/50">Hits</div>
                  <div className="font-semibold mt-0.5">{t.hitCount}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NewViceTaxForm({ goals, onSaved }: { goals: Goal[]; onSaved: () => void }) {
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [mode, setMode] = useState<"PERCENT" | "FIXED">("PERCENT");
  const [rate, setRate] = useState(10);
  const [goalId, setGoalId] = useState(goals[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!goalId) { setErr("Create a goal first to route savings into."); return; }
    setBusy(true);
    const res = await fetch("/api/vice-taxes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, mode, rate, goalId }),
    });
    setBusy(false);
    if (!res.ok) { setErr("Failed to save."); return; }
    onSaved();
  }

  return (
    <form onSubmit={submit} className="card p-5 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs text-black/50 dark:text-white/50">Category</span>
          <select className="input mt-1" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-xs text-black/50 dark:text-white/50">Goal</span>
          <select className="input mt-1" value={goalId} onChange={(e) => setGoalId(e.target.value)}>
            {goals.length === 0 && <option value="">— no goals —</option>}
            {goals.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-xs text-black/50 dark:text-white/50">Mode</span>
          <select className="input mt-1" value={mode} onChange={(e) => setMode(e.target.value as "PERCENT" | "FIXED")}>
            <option value="PERCENT">Percent of expense</option>
            <option value="FIXED">Fixed amount</option>
          </select>
        </label>
        <label className="block">
          <span className="text-xs text-black/50 dark:text-white/50">{mode === "PERCENT" ? "Rate (%)" : "Amount"}</span>
          <input className="input mt-1" type="number" min="0.01" step="0.01" value={rate} onChange={(e) => setRate(Number(e.target.value))} />
        </label>
      </div>
      {err && <div className="text-sm text-red-500">{err}</div>}
      <div className="flex justify-end gap-2">
        <button type="submit" disabled={busy} className="btn-primary">{busy ? "Saving…" : "Save tax"}</button>
      </div>
    </form>
  );
}
