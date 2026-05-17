"use client";
import { useEffect, useState } from "react";
import { Plus, Play, Pause, Trash2, Pencil, Repeat } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import Modal from "../_components/Modal";

type Rec = {
  id: string; accountId: string; amount: number; type: "income" | "expense";
  category: string; description: string; frequency: string; nextRunDate: string;
  active: boolean; account?: { name: string };
};
type Acct = { id: string; name: string };

const FREQS = ["WEEKLY", "BIWEEKLY", "MONTHLY", "YEARLY"];

export default function RecurringPage() {
  const [items, setItems] = useState<Rec[]>([]);
  const [accounts, setAccounts] = useState<Acct[]>([]);
  const [currency, setCurrency] = useState("USD");
  const [open, setOpen] = useState<Rec | null | "new">(null);

  async function load() {
    const [r, a, me] = await Promise.all([
      fetch("/api/recurring").then((r) => r.json()),
      fetch("/api/accounts").then((r) => r.json()),
      fetch("/api/auth/me").then((r) => r.json()),
    ]);
    setItems(r); setAccounts(a);
    if (me?.currency) setCurrency(me.currency);
  }
  useEffect(() => { load(); }, []);

  async function toggle(r: Rec) {
    await fetch(`/api/recurring/${r.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !r.active }),
    });
    load();
  }
  async function remove(id: string) {
    if (!confirm("Delete this recurring entry?")) return;
    await fetch(`/api/recurring/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-semibold tracking-[-0.03em]">Recurring</h1>
          <p className="text-black/50 dark:text-white/50 mt-1 text-sm">Automate income and expenses on a schedule.</p>
        </div>
        <button onClick={() => setOpen("new")} className="btn-primary"><Plus className="w-4 h-4" />New recurring</button>
      </header>

      {items.length === 0 ? (
        <div className="card p-12 text-center">
          <Repeat className="w-6 h-6 mx-auto opacity-50" />
          <div className="mt-3 text-black/60 dark:text-white/60 text-sm">No recurring entries yet.</div>
          <button onClick={() => setOpen("new")} className="btn-secondary mt-4">Create one</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {items.map((r) => (
            <div key={r.id} className="card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs text-black/40 dark:text-white/40">{r.frequency.toLowerCase()} · {r.account?.name}</div>
                  <div className="text-sm mt-1">{r.description}</div>
                  <div className={`mt-2 text-2xl font-semibold tracking-tight ${r.type === "income" ? "text-emerald-500" : ""}`}>
                    {r.type === "income" ? "+" : "−"}{formatCurrency(r.amount, currency)}
                  </div>
                  <div className="text-xs text-black/50 dark:text-white/50 mt-1">Next: {formatDate(r.nextRunDate)}</div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => toggle(r)} className="p-2 text-black/40 dark:text-white/40 hover:text-current" title={r.active ? "Pause" : "Resume"}>
                    {r.active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <button onClick={() => setOpen(r)} className="p-2 text-black/40 dark:text-white/40 hover:text-current"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => remove(r.id)} className="p-2 text-black/40 dark:text-white/40 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              {!r.active && <div className="mt-2 inline-block text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-black/10 dark:bg-white/10">Paused</div>}
            </div>
          ))}
        </div>
      )}

      {open !== null && (
        <RecModal rec={open === "new" ? null : open} accounts={accounts} onClose={() => setOpen(null)} onSaved={() => { setOpen(null); load(); }} />
      )}
    </div>
  );
}

function RecModal({ rec, accounts, onClose, onSaved }: { rec: Rec | null; accounts: Acct[]; onClose: () => void; onSaved: () => void }) {
  const [accountId, setAccountId] = useState(rec?.accountId || accounts[0]?.id || "");
  const [type, setType] = useState<"income" | "expense">(rec?.type || "expense");
  const [amount, setAmount] = useState(rec?.amount?.toString() || "");
  const [category, setCategory] = useState(rec?.category || "Other");
  const [description, setDescription] = useState(rec?.description || "");
  const [frequency, setFrequency] = useState(rec?.frequency || "MONTHLY");
  const [nextRunDate, setNextRunDate] = useState(rec?.nextRunDate ? new Date(rec.nextRunDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10));
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setSaving(true);
    try {
      const res = await fetch(rec ? `/api/recurring/${rec.id}` : "/api/recurring", {
        method: rec ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId, type, amount: Number(amount), category, description, frequency, nextRunDate }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Save failed");
      onSaved();
    } catch (e) { setErr(e instanceof Error ? e.message : "Failed"); }
    finally { setSaving(false); }
  }

  if (accounts.length === 0) {
    return <Modal onClose={onClose} title="No accounts"><p className="text-sm">Create an account first.</p></Modal>;
  }
  return (
    <Modal onClose={onClose} title={rec ? "Edit recurring" : "New recurring"}>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setType("expense")} className={`px-3 py-2 rounded-lg text-sm border ${type === "expense" ? "bg-black/10 dark:bg-white/10 border-black/30 dark:border-white/30" : "border-black/10 dark:border-white/10"}`}>Expense</button>
          <button type="button" onClick={() => setType("income")} className={`px-3 py-2 rounded-lg text-sm border ${type === "income" ? "bg-black/10 dark:bg-white/10 border-black/30 dark:border-white/30" : "border-black/10 dark:border-white/10"}`}>Income</button>
        </div>
        <input className="input" type="number" step="0.01" required placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <select className="input" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <input className="input" placeholder="Category" value={category} onChange={(e) => setCategory(e.target.value)} />
        <input className="input" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
        <select className="input" value={frequency} onChange={(e) => setFrequency(e.target.value)}>
          {FREQS.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
        <input className="input" type="date" value={nextRunDate} onChange={(e) => setNextRunDate(e.target.value)} />
        {err && <div className="text-sm text-rose-500">{err}</div>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <button disabled={saving} className="btn-primary">{saving ? "Saving…" : "Save"}</button>
        </div>
      </form>
    </Modal>
  );
}
