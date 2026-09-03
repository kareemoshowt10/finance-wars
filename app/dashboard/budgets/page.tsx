"use client";
import { useEffect, useState } from "react";
import { Plus, Trash2, Pencil } from "lucide-react";
import { CATEGORIES, formatCurrency, monthKey } from "@/lib/utils";
import Modal from "../_components/Modal";

type Budget = { id: string; category: string; limit: number; month: string; spent: number };

export default function BudgetsPage() {
  const [items, setItems] = useState<Budget[]>([]);
  const [currency, setCurrency] = useState("USD");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Budget | null | "new">(null);
  const month = monthKey();

  async function load() {
    setLoading(true);
    const [b, me] = await Promise.all([
      fetch("/api/budgets?month=" + month).then((r) => r.json()),
      fetch("/api/auth/me").then((r) => r.json()),
    ]);
    setItems(b);
    if (me?.currency) setCurrency(me.currency);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  async function remove(id: string) {
    if (!confirm("Delete this budget?")) return;
    await fetch(`/api/budgets/${id}`, { method: "DELETE" });
    load();
  }

  const totalLimit = items.reduce((s, b) => s + b.limit, 0);
  const totalSpent = items.reduce((s, b) => s + b.spent, 0);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-semibold tracking-[-0.03em]">Budgets</h1>
          <p className="text-black/50 dark:text-white/50 mt-1 text-sm">
            {month} · {formatCurrency(totalSpent, currency)} of {formatCurrency(totalLimit, currency)}
          </p>
        </div>
        <button onClick={() => setOpen("new")} className="btn-primary"><Plus className="w-4 h-4" />Add budget</button>
      </header>

      {loading ? (
        <div className="text-black/40 dark:text-white/40 text-sm">Loading…</div>
      ) : items.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-black/60 dark:text-white/60">No budgets set for this month.</div>
          <button onClick={() => setOpen("new")} className="btn-secondary mt-4">Create your first budget</button>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((b) => {
            const pct = b.limit > 0 ? Math.min(100, (b.spent / b.limit) * 100) : 0;
            const over = b.spent > b.limit;
            const color = over ? "bg-rose-400" : pct > 80 ? "bg-amber-400" : "bg-emerald-400";
            return (
              <div key={b.id} className="card p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{b.category}</div>
                    <div className="text-xs text-black/40 dark:text-white/40 mt-0.5">{formatCurrency(b.spent, currency)} of {formatCurrency(b.limit, currency)}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`text-sm ${over ? "text-rose-400" : "text-black/70 dark:text-white/70"}`}>{Math.round(pct)}%</div>
                    <button onClick={() => setOpen(b)} className="p-1.5 text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => remove(b.id)} className="p-1.5 text-black/40 dark:text-white/40 hover:text-rose-400"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                <div className="mt-3 h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                  <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {open !== null && (
        <BudgetModal budget={open === "new" ? null : open} month={month} onClose={() => setOpen(null)} onSaved={() => { setOpen(null); load(); }} />
      )}
    </div>
  );
}

function BudgetModal({ budget, month, onClose, onSaved }: { budget: Budget | null; month: string; onClose: () => void; onSaved: () => void }) {
  const [category, setCategory] = useState(budget?.category || CATEGORIES[0]);
  const [limit, setLimit] = useState(budget?.limit?.toString() || "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!limit || Number(limit) <= 0) return setError("Enter a positive limit");
    setSaving(true);
    try {
      const res = await fetch(budget ? `/api/budgets/${budget.id}` : "/api/budgets", {
        method: budget ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, limit: Number(limit), month }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally { setSaving(false); }
  }

  return (
    <Modal onClose={onClose} title={budget ? "Edit budget" : "New budget"}>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label htmlFor="budgets-category" className="text-xs text-black/50 dark:text-white/50">Category</label>
          <select id="budgets-category" className="input mt-1" value={category} onChange={(e) => setCategory(e.target.value)} disabled={!!budget}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="budgets-monthly-limit" className="text-xs text-black/50 dark:text-white/50">Monthly limit</label>
          <input id="budgets-monthly-limit" className="input mt-1" type="number" step="0.01" value={limit} onChange={(e) => setLimit(e.target.value)} required />
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
