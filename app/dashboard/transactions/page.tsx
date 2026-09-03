"use client";
import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Trash2, Pencil, Download, Upload, MoreHorizontal } from "lucide-react";
import Papa from "papaparse";
import { CATEGORIES, formatCurrency, formatDate } from "@/lib/utils";
import Modal from "../_components/Modal";

type Tx = {
  id: string; accountId: string; amount: number; type: "income" | "expense";
  category: string; description: string; date: string;
  account?: { name: string; type: string };
};
type Acct = { id: string; name: string; type: string };
type Cat = { id: string; name: string; color: string; icon: string; kind: string };

const PAGE_SIZE = 25;

export default function TransactionsPage() {
  const [items, setItems] = useState<Tx[]>([]);
  const [accounts, setAccounts] = useState<Acct[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [currency, setCurrency] = useState("USD");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Tx | null | "new">(null);
  const [importOpen, setImportOpen] = useState(false);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sort, setSort] = useState<"date" | "amount">("date");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [cursor, setCursor] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState<"recat" | "move" | null>(null);

  function buildParams(c?: string | null) {
    const params = new URLSearchParams();
    if (cat !== "all") params.set("category", cat);
    if (typeFilter !== "all") params.set("type", typeFilter);
    if (q) params.set("q", q);
    params.set("sort", sort);
    params.set("order", order);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    params.set("pageSize", String(PAGE_SIZE));
    if (c) params.set("cursor", c);
    return params;
  }

  async function load(reset = true) {
    setLoading(true);
    const params = buildParams(reset ? null : cursor);
    const [tx, ac, me, ct] = await Promise.all([
      fetch("/api/transactions?" + params.toString()).then((r) => r.json()),
      fetch("/api/accounts").then((r) => r.json()),
      fetch("/api/auth/me").then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
    ]);
    const newItems: Tx[] = tx.items || [];
    setItems(reset ? newItems : [...items, ...newItems]);
    setNextCursor(tx.nextCursor ?? null);
    setAccounts(ac);
    setCats(ct);
    if (me?.currency) setCurrency(me.currency);
    setLoading(false);
  }

  async function loadMore() {
    if (!nextCursor) return;
    setCursor(nextCursor);
    const params = buildParams(nextCursor);
    const tx = await fetch("/api/transactions?" + params.toString()).then((r) => r.json());
    setItems((prev) => [...prev, ...(tx.items || [])]);
    setNextCursor(tx.nextCursor ?? null);
  }

  useEffect(() => { setCursor(null); load(true); setSelected(new Set()); /* eslint-disable-next-line */ }, [cat, typeFilter, sort, order, from, to]);
  useEffect(() => {
    const id = setTimeout(() => { setCursor(null); load(true); setSelected(new Set()); }, 250);
    return () => clearTimeout(id);
    // eslint-disable-next-line
  }, [q]);

  async function remove(id: string) {
    if (!confirm("Delete this transaction?")) return;
    await fetch(`/api/transactions/${id}`, { method: "DELETE" });
    load(true);
  }

  function toggleAll() {
    if (selected.size === items.length) setSelected(new Set());
    else setSelected(new Set(items.map((i) => i.id)));
  }
  function toggleOne(id: string) {
    const s = new Set(selected);
    if (s.has(id)) s.delete(id); else s.add(id);
    setSelected(s);
  }

  async function bulkDelete() {
    if (!confirm(`Delete ${selected.size} transactions?`)) return;
    await fetch("/api/transactions/bulk", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", ids: Array.from(selected) }),
    });
    setSelected(new Set()); load(true);
  }

  const totalIn = useMemo(() => items.filter((i) => i.type === "income").reduce((s, i) => s + i.amount, 0), [items]);
  const totalOut = useMemo(() => items.filter((i) => i.type === "expense").reduce((s, i) => s + i.amount, 0), [items]);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-4xl font-semibold tracking-[-0.03em]">Transactions</h1>
          <p className="text-black/50 dark:text-white/50 mt-1 text-sm">
            {items.length}{nextCursor ? "+" : ""} record{items.length !== 1 && "s"} · in {formatCurrency(totalIn, currency)} · out {formatCurrency(totalOut, currency)}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <a href="/api/transactions/export" className="btn-secondary !py-2 !px-3 text-xs"><Download className="w-3.5 h-3.5" />Export</a>
          <button onClick={() => setImportOpen(true)} className="btn-secondary !py-2 !px-3 text-xs"><Upload className="w-3.5 h-3.5" />Import</button>
          <button onClick={() => setOpen("new")} className="btn-primary"><Plus className="w-4 h-4" />Add transaction</button>
        </div>
      </header>

      <div className="card p-3 flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/40 dark:text-white/40" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search description or category…" className="input pl-9" />
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
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="input max-w-[160px]" />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="input max-w-[160px]" />
        <select value={`${sort}-${order}`} onChange={(e) => { const [s, o] = e.target.value.split("-"); setSort(s as "date"|"amount"); setOrder(o as "asc"|"desc"); }} className="input max-w-[180px]">
          <option value="date-desc">Newest first</option>
          <option value="date-asc">Oldest first</option>
          <option value="amount-desc">Highest amount</option>
          <option value="amount-asc">Lowest amount</option>
        </select>
      </div>

      {selected.size > 0 && (
        <div className="card p-3 flex items-center gap-2 flex-wrap sticky top-12 md:top-2 z-20 bg-white/95 dark:bg-black/95 backdrop-blur-xl">
          <div className="text-sm">{selected.size} selected</div>
          <div className="flex-1" />
          <button onClick={() => setBulkOpen("recat")} className="btn-secondary !py-1.5 !px-3 text-xs">Recategorize</button>
          <button onClick={() => setBulkOpen("move")} className="btn-secondary !py-1.5 !px-3 text-xs">Move</button>
          <button onClick={bulkDelete} className="btn-danger !py-1.5 !px-3 text-xs">Delete</button>
          <button onClick={() => setSelected(new Set())} className="btn-ghost !py-1.5 !px-3 text-xs">Clear</button>
        </div>
      )}

      <div className="card overflow-hidden">
        {loading && items.length === 0 ? (
          <div className="p-10 text-center text-black/40 dark:text-white/40 text-sm">Loading…</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-black/60 dark:text-white/60">No transactions match your filters.</div>
            <button onClick={() => setOpen("new")} className="btn-secondary mt-4">Add your first transaction</button>
          </div>
        ) : (
          <>
            <div className="px-4 py-2 border-b border-black/5 dark:border-white/5 flex items-center gap-3">
              <input
                type="checkbox"
                checked={selected.size > 0 && selected.size === items.length}
                ref={(el) => { if (el) el.indeterminate = selected.size > 0 && selected.size < items.length; }}
                onChange={toggleAll}
              />
              <div className="text-xs text-black/40 dark:text-white/40">Select all</div>
            </div>
            <ul className="divide-y divide-black/5 dark:divide-white/5">
              {items.map((t) => (
                <li key={t.id} className="px-4 py-3 flex items-center gap-3 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
                  <input type="checkbox" checked={selected.has(t.id)} onChange={() => toggleOne(t.id)} />
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: cats.find((c) => c.name === t.category)?.color || (t.type === "income" ? "#34d399" : "#f87171") }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{t.description}</div>
                    <div className="text-xs text-black/40 dark:text-white/40 truncate">{t.category} · {t.account?.name ?? "—"} · {formatDate(t.date)}</div>
                  </div>
                  <div className={`text-sm font-medium ${t.type === "income" ? "text-emerald-400" : ""}`}>
                    {t.type === "income" ? "+" : "−"}{formatCurrency(t.amount, currency)}
                  </div>
                  <button onClick={() => setOpen(t)} className="p-2 text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => remove(t.id)} className="p-2 text-black/40 dark:text-white/40 hover:text-rose-400"><Trash2 className="w-4 h-4" /></button>
                </li>
              ))}
            </ul>
            {nextCursor && (
              <div className="p-3 flex justify-center border-t border-black/5 dark:border-white/5">
                <button onClick={loadMore} className="btn-secondary text-xs"><MoreHorizontal className="w-4 h-4" />Load more</button>
              </div>
            )}
          </>
        )}
      </div>

      {open !== null && (
        <TxModal
          tx={open === "new" ? null : open}
          accounts={accounts}
          onClose={() => setOpen(null)}
          onSaved={() => { setOpen(null); load(true); }}
        />
      )}
      {importOpen && <ImportModal onClose={() => setImportOpen(false)} onDone={() => { setImportOpen(false); load(true); }} />}
      {bulkOpen && (
        <BulkModal
          mode={bulkOpen}
          ids={Array.from(selected)}
          accounts={accounts}
          onClose={() => setBulkOpen(null)}
          onDone={() => { setBulkOpen(null); setSelected(new Set()); load(true); }}
        />
      )}
    </div>
  );
}

function BulkModal({ mode, ids, accounts, onClose, onDone }: {
  mode: "recat" | "move"; ids: string[]; accounts: Acct[]; onClose: () => void; onDone: () => void;
}) {
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [accountId, setAccountId] = useState(accounts[0]?.id || "");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    const body = mode === "recat"
      ? { action: "recategorize", ids, category }
      : { action: "move", ids, accountId };
    await fetch("/api/transactions/bulk", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    onDone();
  }

  return (
    <Modal onClose={onClose} title={mode === "recat" ? `Recategorize ${ids.length}` : `Move ${ids.length}`}>
      {mode === "recat" ? (
        <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      ) : (
        <select className="input" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      )}
      <div className="flex justify-end gap-2 pt-4">
        <button onClick={onClose} className="btn-ghost">Cancel</button>
        <button onClick={submit} disabled={busy} className="btn-primary">{busy ? "Working…" : "Apply"}</button>
      </div>
    </Modal>
  );
}

function ImportModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [createMissing, setCreateMissing] = useState(true);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function handleFile(file: File) {
    setErr(null);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const data = (res.data as Record<string, string>[]).filter((r) => r.date && r.amount);
        setRows(data);
      },
      error: (e) => setErr(e.message),
    });
  }
  async function confirm() {
    setBusy(true);
    const res = await fetch("/api/transactions/import", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows, createMissingAccounts: createMissing }),
    });
    const d = await res.json();
    setResult(d);
    setBusy(false);
  }

  return (
    <Modal onClose={onClose} title="Import transactions" wide>
      {!result ? (
        <div className="space-y-4">
          <p className="text-xs text-black/60 dark:text-white/60">CSV columns: date, amount, type, category, description, account</p>
          <input type="file" accept=".csv,text/csv" onChange={(e) => e.target.files && handleFile(e.target.files[0])}
            className="block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-black/10 dark:file:bg-black/10 dark:bg-white/10 file:px-3 file:py-1.5 file:text-xs" />
          {err && <div className="text-sm text-rose-500">{err}</div>}
          {rows.length > 0 && (
            <>
              <div className="text-xs text-black/50 dark:text-white/50">{rows.length} rows · preview first 5:</div>
              <div className="text-[11px] overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="text-left opacity-60">
                    <th>date</th><th>amount</th><th>type</th><th>category</th><th>description</th><th>account</th>
                  </tr></thead>
                  <tbody>
                    {rows.slice(0, 5).map((r, i) => (
                      <tr key={i} className="border-t border-black/5 dark:border-white/5">
                        <td>{r.date}</td><td>{r.amount}</td><td>{r.type}</td><td>{r.category}</td><td className="truncate max-w-[100px]">{r.description}</td><td>{r.account}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={createMissing} onChange={(e) => setCreateMissing(e.target.checked)} />
                Create accounts that don&apos;t exist
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={onClose} className="btn-ghost">Cancel</button>
                <button onClick={confirm} disabled={busy} className="btn-primary">{busy ? "Importing…" : `Import ${rows.length}`}</button>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="text-sm">Imported <b className="text-emerald-500">{result.success}</b> rows. <span className="text-rose-500">{result.failed}</span> failed.</div>
          {result.errors.length > 0 && (
            <ul className="text-xs text-rose-500 list-disc list-inside">
              {result.errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          )}
          <div className="flex justify-end pt-2">
            <button onClick={onDone} className="btn-primary">Done</button>
          </div>
        </div>
      )}
    </Modal>
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
        <p className="text-sm text-black/60 dark:text-white/60">Create an account first to add transactions.</p>
        <a href="/dashboard/accounts" className="btn-primary mt-4 inline-flex">Go to accounts</a>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose} title={tx ? "Edit transaction" : "New transaction"}>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={() => setType("expense")} className={`px-3 py-2 rounded-lg text-sm border ${type === "expense" ? "bg-black/10 dark:bg-white/10 border-black/30 dark:border-white/30" : "border-black/10 dark:border-white/10 text-black/60 dark:text-white/60"}`}>Expense</button>
          <button type="button" onClick={() => setType("income")} className={`px-3 py-2 rounded-lg text-sm border ${type === "income" ? "bg-black/10 dark:bg-white/10 border-black/30 dark:border-white/30" : "border-black/10 dark:border-white/10 text-black/60 dark:text-white/60"}`}>Income</button>
        </div>
        <div>
          <label htmlFor="transactions-amount" className="text-xs text-black/50 dark:text-white/50">Amount</label>
          <input id="transactions-amount" className="input mt-1" type="number" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div>
          <label htmlFor="transactions-account" className="text-xs text-black/50 dark:text-white/50">Account</label>
          <select id="transactions-account" className="input mt-1" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="transactions-category" className="text-xs text-black/50 dark:text-white/50">Category</label>
          <select id="transactions-category" className="input mt-1" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="transactions-description" className="text-xs text-black/50 dark:text-white/50">Description</label>
          <input id="transactions-description" className="input mt-1" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What was it for?" />
        </div>
        <div>
          <label htmlFor="transactions-date" className="text-xs text-black/50 dark:text-white/50">Date</label>
          <input id="transactions-date" className="input mt-1" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
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
