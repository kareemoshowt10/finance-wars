"use client";
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, CreditCard, PiggyBank, Wallet, TrendingUp } from "lucide-react";
import { ACCOUNT_TYPES, formatCurrency, type AccountType } from "@/lib/utils";
import Modal from "../_components/Modal";

type Acct = { id: string; name: string; type: AccountType; balance: number };

const typeIcon = {
  checking: Wallet, savings: PiggyBank, credit: CreditCard, investment: TrendingUp,
} as const;

export default function AccountsPage() {
  const [items, setItems] = useState<Acct[]>([]);
  const [currency, setCurrency] = useState("USD");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Acct | null | "new">(null);

  async function load() {
    setLoading(true);
    const [a, me] = await Promise.all([
      fetch("/api/accounts").then((r) => r.json()),
      fetch("/api/auth/me").then((r) => r.json()),
    ]);
    setItems(a);
    if (me?.currency) setCurrency(me.currency);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function remove(id: string) {
    if (!confirm("Delete this account and all of its transactions?")) return;
    await fetch(`/api/accounts/${id}`, { method: "DELETE" });
    load();
  }

  const netWorth = items.reduce((s, a) => s + (a.type === "credit" ? -a.balance : a.balance), 0);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-semibold tracking-[-0.03em]">Accounts</h1>
          <p className="text-white/50 mt-1 text-sm">Net worth · <span className="text-white">{formatCurrency(netWorth, currency)}</span></p>
        </div>
        <button onClick={() => setOpen("new")} className="btn-primary"><Plus className="w-4 h-4" />Add account</button>
      </header>

      {loading ? (
        <div className="text-white/40 text-sm">Loading…</div>
      ) : items.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-white/60">No accounts yet.</div>
          <button onClick={() => setOpen("new")} className="btn-secondary mt-4">Add your first account</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((a) => {
            const Icon = typeIcon[a.type];
            return (
              <div key={a.id} className="card p-5 group">
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-white/70" />
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition flex items-center gap-1">
                    <button onClick={() => setOpen(a)} className="p-1.5 text-white/40 hover:text-white"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => remove(a.id)} className="p-1.5 text-white/40 hover:text-rose-400"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                <div className="mt-4 text-xs text-white/40 capitalize">{a.type}</div>
                <div className="text-sm">{a.name}</div>
                <div className="mt-2 text-3xl font-semibold tracking-tight">
                  {a.type === "credit" && a.balance > 0 && "−"}{formatCurrency(a.balance, currency)}
                </div>
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

function AccountModal({ acct, onClose, onSaved }: { acct: Acct | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(acct?.name || "");
  const [type, setType] = useState<AccountType>(acct?.type || "checking");
  const [balance, setBalance] = useState(acct?.balance?.toString() || "0");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError("Name is required");
    setSaving(true);
    try {
      const res = await fetch(acct ? `/api/accounts/${acct.id}` : "/api/accounts", {
        method: acct ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, type, balance: Number(balance) }),
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
          <label className="text-xs text-white/50">Name</label>
          <input className="input mt-1" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-white/50">Type</label>
          <select className="input mt-1" value={type} onChange={(e) => setType(e.target.value as AccountType)}>
            {ACCOUNT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-white/50">Balance</label>
          <input className="input mt-1" type="number" step="0.01" value={balance} onChange={(e) => setBalance(e.target.value)} />
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
