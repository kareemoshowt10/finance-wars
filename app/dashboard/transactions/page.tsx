"use client";
import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Trash2, Pencil } from "lucide-react";
import { CATEGORIES, formatCurrency, formatDate } from "@/lib/utils";
import Modal from "../_components/Modal";

type Tx = {
  id: string; accountId: string; amount: number; type: "income" | "expense";
  category: string; description: string; date: string;
  account?: { name: string; type: string };
};
type Acct = { id: string; name: string; type: string };

export default function TransactionsPage() {
  const [items, setItems] = useState<Tx[]>([]);
  const [accounts, setAccounts] = useState<Acct[]>([]);
  const [currency, setCurrency] = useState("USD");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Tx | null | "new">(null);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sort, setSort] = useState<"date" | "amount">("date");
  const [order, setOrder] = useState<"asc" | "desc">("desc");

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (cat !== "all") params.set("category", cat);
    if (typeFilter !== "all") params.set("type", typeFilter);
    if (q) params.set("q", q);
    params.set("sort", sort);
    params.set("order", order);
    const [tx, ac, me] = await Promise.all([
      fetch("/api/transactions?" + params.toString()).then((r) => r.json()),
      fetch("/api/accounts").then((r) => r.json()),
      fetch("/api/auth/me").then((r) => r.json()),
    ]);
    setItems(tx);
    setAccounts(ac);
    if (me?.currency) setCurrency(me.currency);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [cat, typeFilter, sort, order]);
  useEffect(() => {
    const id = setTimeout(load, 250);
    return () => clearTimeout(id);
    // eslint-disable-next-line
  }, [q]);

  async function remove(id: string) {
    if (!confirm("Delete this transaction?")) return;
    await fetch(`/api/transactions/${id}`, { method: "DELETE" });
    load();
  }

  const totalIn = useMemo(() => items.filter((i) => i.type === "income").reduce((s, i) => s + i.amount, 0), [items]);
  const totalOut = useMemo(() => items.filter((i) => i.type === "expense").reduce((s, i) => s + i.amount, 0), [items]);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-4xl font-semibold tracking-[-0.03em]">Transactions</h1>
          <p className="text-white/50 mt-1 text-sm">{items.length} record{items.length !== 1 && "s"} · in {formatCurrency(totalIn, currency)} · out {formatCurrency(totalOut, currency)}</p>
        </div>
        <button onClick={() => setOpen("new")} className="btn-primary"><Plus className="w-4 h-4" />Add transaction</button>
      </header>

      <div className="card p-3 flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search description…" className="input pl-9" />
        </div>
        <select value={cat} onChange={(e) => setCat(e.target.value)} className="input max-w-[180px]">
          <option value="all">All categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="input max-w-[140px]">
          <option value="all">All types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
        <select value={`${sort}-${order}`} onChange={(e) => { const [s, o] = e.target.value.split("-"); setSort(s as "date"|"amount"); setOrder(o as "asc"|"desc"); }} className="input max-w-[180px]">
          <option value="date-desc">Newest first</option>
          <option value="date-asc">Oldest first</option>
          <option value="amount-desc">Highest amount</option>
          <option value="amount-asc">Lowest amount</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-white/40 text-sm">Loading…</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-white/60">No transactions match your filters.</div>
            <button onClick={() => setOpen("new")} className="btn-secondary mt-4">Add your first transaction</button>
          </div>
        ) : (
          <ul className="divide-y divide-white/5">
            {items.map((t) => (
              <li key={t.id} className="px-4 py-3 flex items-center gap-3 hover:bg-white/[0.02]">
                <div className={`w-2 h-2 rounded-full ${t.type === "income" ? "bg-emerald-400" : "bg-rose-400"}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">{t.description}</div>
                  <div className="text-xs text-white/40 truncate">{t.category} · {t.account?.name ?? "—"} · {formatDate(t.date)}</div>
                </div>
                <div className={`text-sm font-medium ${t.type === "income" ? "text-emerald-400" : "text-white"}`}>
                  {t.type === "income" ? "+" : "−"}{formatCurrency(t.amount, currency)}
                </div>
                <button onClick={() => setOpen(t)} className="p-2 text-white/40 hover:text-white"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => remove(t.id)} className="p-2 text-white/40 hover:text-rose-400"><Trash2 className="w-4 h-4" /></button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {open !== null && (
        <TxModal
          tx={open === "new" ? null : open}
          accounts={accounts}
          onClose={() => setOpen(null)}
          onSaved={() => { setOpen(null); load(); }}
        />
      )}
    </div>
  );
}

function TxModal({ tx, accounts, onClose, onSaved }:
  { tx: Tx | null; accounts: Acct[]; onClose: () => void; onSaved: () => void }) {
  const [accountId, setAccountId] = useState(tx?.accountId || accounts[0]?.id || "");
  const [type, setType] = useState<"income" | "expense">(tx?.type || "expense");
  const [amount, setAmount] = useState(tx?.amount?.toString() || "");
  const [category, setCategory] = useState(tx?.category || CATEGORIES[0]);
  const [description, setDescription] = useState(tx?.description || "");
  const [date, setDate] = useState(tx?.date ? new Date(tx.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!accountId) return setError("Pick an account");
    if (!amount || Number(amount) <= 0) return setError("Enter a positive amount");
    setSaving(true);
    const payload = { accountId, type, amount: Number(amount), category, description, date };
    try {
      const res = await fetch(tx ? `/api/transactions/${tx.id}` : "/api/transactions", {
        method: tx ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally { setSaving(false); }
  }

  if (accounts.length === 0) {
    return (
      <Modal onClose={onClose} title="No accounts yet">
        <p className="text-sm text-white/60">Create an account first to add transactions.</p>
        <a href="/dashboard/accounts" className="btn-primary mt-4 inline-flex">Go to accounts</a>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose} title={tx ? "Edit transaction" : "New transaction"}>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={() => setType("expense")} className={`px-3 py-2 rounded-lg text-sm border ${type === "expense" ? "bg-white/10 border-white/30" : "border-white/10 text-white/60"}`}>Expense</button>
          <button type="button" onClick={() => setType("income")} className={`px-3 py-2 rounded-lg text-sm border ${type === "income" ? "bg-white/10 border-white/30" : "border-white/10 text-white/60"}`}>Income</button>
        </div>
        <div>
          <label className="text-xs text-white/50">Amount</label>
          <input className="input mt-1" type="number" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-white/50">Account</label>
          <select className="input mt-1" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-white/50">Category</label>
          <select className="input mt-1" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-white/50">Description</label>
          <input className="input mt-1" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What was it for?" />
        </div>
        <div>
          <label className="text-xs text-white/50">Date</label>
          <input className="input mt-1" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
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

