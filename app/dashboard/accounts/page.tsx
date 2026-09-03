"use client";
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, CreditCard, PiggyBank, Wallet, TrendingUp } from "lucide-react";
import { ACCOUNT_TYPES, ACCOUNT_TYPE_LABELS, DEBT_ACCOUNT_TYPES, formatCurrency, type AccountType } from "@/lib/utils";
import Modal from "../_components/Modal";

type Acct = { id: string; name: string; type: AccountType; balance: number; interestRate?: number | null };
type Tx = { id: string; accountId: string; amount: number; type: string; date: string };

const typeIcon: Record<string, React.ComponentType<{ className?: string }>> = {
  checking: Wallet, savings: PiggyBank, credit: CreditCard, investment: TrendingUp,
  loan: CreditCard, mortgage: CreditCard, student_loan: CreditCard,
};

export default function AccountsPage() {
  const [items, setItems] = useState<Acct[]>([]);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [currency, setCurrency] = useState("USD");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Acct | null | "new">(null);

  async function load() {
    setLoading(true);
    const [a, me, t] = await Promise.all([
      fetch("/api/accounts").then((r) => r.json()),
      fetch("/api/auth/me").then((r) => r.json()),
      fetch("/api/transactions?limit=500").then((r) => r.json()),
    ]);
    setItems(a);
    setTxs(t);
    if (me?.currency) setCurrency(me.currency);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function remove(id: string) {
    if (!confirm("Delete this account and all of its transactions?")) return;
    await fetch(`/api/accounts/${id}`, { method: "DELETE" });
    load();
  }

  const netWorth = items.reduce((s, a) => s + (DEBT_ACCOUNT_TYPES.includes(a.type) ? -a.balance : a.balance), 0);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-semibold tracking-[-0.03em]">Accounts</h1>
          <p className="text-black/50 dark:text-white/50 mt-1 text-sm">Net worth · <span className="text-black dark:text-white">{formatCurrency(netWorth, currency)}</span></p>
        </div>
        <button onClick={() => setOpen("new")} className="btn-primary"><Plus className="w-4 h-4" />Add account</button>
      </header>

      {loading ? (
        <div className="text-black/40 dark:text-white/40 text-sm">Loading…</div>
      ) : items.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-black/60 dark:text-white/60">No accounts yet.</div>
          <button onClick={() => setOpen("new")} className="btn-secondary mt-4">Add your first account</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((a) => {
            const Icon = typeIcon[a.type];
            return (
              <div key={a.id} className="card p-5 group">
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-xl bg-black/5 dark:bg-white/5 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-black/70 dark:text-white/70" />
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition flex items-center gap-1">
                    <button onClick={() => setOpen(a)} className="p-1.5 text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => remove(a.id)} className="p-1.5 text-black/40 dark:text-white/40 hover:text-rose-400"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                <div className="mt-4 text-xs text-black/40 dark:text-white/40 flex items-center gap-1.5">
                  {ACCOUNT_TYPE_LABELS[a.type] ?? a.type}
                  {a.interestRate != null && (
                    <span className="text-red-400 font-medium">{a.interestRate}% APR</span>
                  )}
                </div>
                <div className="text-sm">{a.name}</div>
                <div className="mt-2 text-3xl font-semibold tracking-tight">
                  {a.type === "credit" && a.balance > 0 && "−"}{formatCurrency(a.balance, currency)}
                </div>
                <Sparkline accountId={a.id} currentBalance={a.balance} txs={txs} />
              </div>
            );
          })}
        </div>
      )}

      {open !== null && (
        <AccountModal acct={open === "new" ? null : open} onClose={() => setOpen(null)} onSaved={() => { setOpen(null); load(); }} />
      )}
    </div>
  );
}

function Sparkline({ accountId, currentBalance, txs }: { accountId: string; currentBalance: number; txs: Tx[] }) {
  const days = 30;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  // Walk back day by day; produce running balance series
  const acctTx = txs.filter((t) => t.accountId === accountId);
  const series: number[] = new Array(days).fill(0);
  let running = currentBalance;
  // Build per-day flow
  const flowByDay = new Map<number, number>();
  for (const t of acctTx) {
    const d = new Date(t.date); d.setHours(0, 0, 0, 0);
    const flow = t.type === "income" ? t.amount : -t.amount;
    flowByDay.set(d.getTime(), (flowByDay.get(d.getTime()) || 0) + flow);
  }
  // Today = index days-1; series[i] = balance at end of (today - (days-1-i)) days
  series[days - 1] = running;
  for (let i = days - 1; i > 0; i--) {
    const d = new Date(today); d.setDate(today.getDate() - (days - 1 - i));
    const flow = flowByDay.get(d.getTime()) || 0;
    running -= flow;
    series[i - 1] = running;
  }
  const min = Math.min(...series);
  const max = Math.max(...series);
  const range = max - min || 1;
  const w = 100, h = 28;
  const points = series.map((v, i) => `${(i / (days - 1)) * w},${h - ((v - min) / range) * h}`).join(" ");
  const last = series[series.length - 1];
  const first = series[0];
  const up = last >= first;
  return (
    <div className="mt-3">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-7" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`sg-${accountId}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={up ? "#34d399" : "#f87171"} stopOpacity={0.4} />
            <stop offset="100%" stopColor={up ? "#34d399" : "#f87171"} stopOpacity={0} />
          </linearGradient>
        </defs>
        <polygon fill={`url(#sg-${accountId})`} points={`0,${h} ${points} ${w},${h}`} />
        <polyline fill="none" stroke={up ? "#34d399" : "#f87171"} strokeWidth="1.2" points={points} />
      </svg>
    </div>
  );
}

function AccountModal({ acct, onClose, onSaved }: { acct: Acct | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(acct?.name || "");
  const [type, setType] = useState<AccountType>(acct?.type || "checking");
  const [balance, setBalance] = useState(acct?.balance?.toString() || "0");
  const [apr, setApr] = useState(acct?.interestRate?.toString() || "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const isDebt = DEBT_ACCOUNT_TYPES.includes(type);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError("Name is required");
    setSaving(true);
    try {
      const res = await fetch(acct ? `/api/accounts/${acct.id}` : "/api/accounts", {
        method: acct ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, type, balance: Number(balance),
          interestRate: isDebt && apr !== "" ? Number(apr) : null,
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
    <Modal onClose={onClose} title={acct ? "Edit account" : "New account"}>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label htmlFor="accounts-name" className="text-xs text-black/50 dark:text-white/50">Name</label>
          <input id="accounts-name" className="input mt-1" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label htmlFor="accounts-type" className="text-xs text-black/50 dark:text-white/50">Type</label>
          <select id="accounts-type" className="input mt-1" value={type} onChange={(e) => setType(e.target.value as AccountType)}>
            {ACCOUNT_TYPES.map((t) => <option key={t} value={t}>{ACCOUNT_TYPE_LABELS[t]}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-black/50 dark:text-white/50">Balance {isDebt && "(enter as positive; will show as debt)"}</label>
          <input className="input mt-1" type="number" step="0.01" value={balance} onChange={(e) => setBalance(e.target.value)} />
        </div>
        {isDebt && (
          <div>
            <label htmlFor="accounts-apr-optional-powers-debt-strategy" className="text-xs text-black/50 dark:text-white/50">APR % (optional — powers debt strategy)</label>
            <input id="accounts-apr-optional-powers-debt-strategy" className="input mt-1" type="number" step="0.01" min="0" max="100" placeholder="e.g. 24.99" value={apr} onChange={(e) => setApr(e.target.value)} />
          </div>
        )}
        {error && <div className="text-sm text-red-400">{error}</div>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <button disabled={saving} className="btn-primary">{saving ? "Saving…" : "Save"}</button>
        </div>
      </form>
    </Modal>
  );
}
