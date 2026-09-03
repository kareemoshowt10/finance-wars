"use client";
import { useEffect, useState } from "react";
import { Plus, Trash2, Pencil } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { formatCurrency, formatCurrencyFull } from "@/lib/utils";
import Modal from "../_components/Modal";

type Holding = {
  id: string; accountId: string; symbol: string; shares: number; costBasis: number;
  currentPrice: number; marketValue: number; gain: number; gainPct: number;
  account?: { name: string; type: string };
};
type Acct = { id: string; name: string; type: string };

const COLORS = ["#a78bfa", "#60a5fa", "#34d399", "#fbbf24", "#f472b6", "#22d3ee", "#fb923c", "#c084fc"];

export default function PortfolioPage() {
  const [items, setItems] = useState<Holding[]>([]);
  const [accounts, setAccounts] = useState<Acct[]>([]);
  const [currency, setCurrency] = useState("USD");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Holding | "new" | null>(null);

  async function load() {
    setLoading(true);
    const [h, a, me] = await Promise.all([
      fetch("/api/holdings").then((r) => r.json()),
      fetch("/api/accounts").then((r) => r.json()),
      fetch("/api/auth/me").then((r) => r.json()),
    ]);
    setItems(Array.isArray(h) ? h : []);
    setAccounts(Array.isArray(a) ? a.filter((x: Acct) => x.type === "investment") : []);
    if (me?.currency) setCurrency(me.currency);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function remove(id: string) {
    if (!confirm("Delete holding?")) return;
    await fetch(`/api/holdings/${id}`, { method: "DELETE" });
    load();
  }

  const totalCost = items.reduce((s, h) => s + h.costBasis, 0);
  const totalValue = items.reduce((s, h) => s + h.marketValue, 0);
  const totalGain = totalValue - totalCost;
  const totalGainPct = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;

  const pieData = items.map((h) => ({ name: h.symbol, value: h.marketValue }));

  const byAccount = items.reduce<Record<string, Holding[]>>((acc, h) => {
    const k = h.account?.name || h.accountId;
    (acc[k] ||= []).push(h);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-semibold tracking-[-0.03em]">Portfolio</h1>
          <p className="text-black/50 dark:text-white/50 mt-1 text-sm">Investment holdings and market value.</p>
        </div>
        <button
          disabled={accounts.length === 0}
          onClick={() => setOpen("new")}
          className="btn-primary disabled:opacity-40"
        >
          <Plus className="w-4 h-4" />Add holding
        </button>
      </header>

      {accounts.length === 0 && (
        <div className="card p-5 text-sm text-black/60 dark:text-white/60">
          Create an <b>investment</b> account first on the Accounts page.
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <div className="card p-5">
          <div className="text-xs text-black/50 dark:text-white/50">Cost basis</div>
          <div className="text-2xl font-semibold tracking-tight mt-1">{formatCurrency(totalCost, currency)}</div>
        </div>
        <div className="card p-5">
          <div className="text-xs text-black/50 dark:text-white/50">Market value</div>
          <div className="text-2xl font-semibold tracking-tight mt-1">{formatCurrency(totalValue, currency)}</div>
        </div>
        <div className="card p-5">
          <div className="text-xs text-black/50 dark:text-white/50">Total gain</div>
          <div className={`text-2xl font-semibold tracking-tight mt-1 ${totalGain >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
            {formatCurrency(totalGain, currency)} <span className="text-xs">({totalGainPct.toFixed(1)}%)</span>
          </div>
        </div>
      </div>

      {items.length > 0 && (
        <div className="card p-5">
          <div className="text-xs text-black/50 dark:text-white/50 mb-3">Allocation</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={90} innerRadius={50} paddingAngle={2}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrencyFull(v, currency)} contentStyle={{ background: "rgba(10,10,10,0.95)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", borderRadius: 12, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-sm opacity-50">Loading…</div>
      ) : items.length === 0 ? (
        <div className="card p-12 text-center text-sm text-black/60 dark:text-white/60">No holdings yet.</div>
      ) : (
        <div className="space-y-4">
          {Object.entries(byAccount).map(([acct, holdings]) => (
            <div key={acct} className="card overflow-hidden">
              <div className="px-4 py-2 text-xs text-black/50 dark:text-white/50 border-b border-black/5 dark:border-white/5">
                {acct}
              </div>
              <ul className="divide-y divide-black/5 dark:divide-white/5">
                {holdings.map((h) => (
                  <li key={h.id} className="px-4 py-3 flex items-center gap-3">
                    <div className="w-10 text-sm font-semibold">{h.symbol}</div>
                    <div className="flex-1 min-w-0 text-xs text-black/50 dark:text-white/50">
                      {h.shares} sh · {formatCurrency(h.currentPrice, currency)}/sh
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{formatCurrency(h.marketValue, currency)}</div>
                      <div className={`text-xs ${h.gain >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                        {h.gain >= 0 ? "+" : ""}{formatCurrency(h.gain, currency)} ({h.gainPct.toFixed(1)}%)
                      </div>
                    </div>
                    <button onClick={() => setOpen(h)} className="p-2 text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => remove(h.id)} className="p-2 text-black/40 dark:text-white/40 hover:text-rose-400"><Trash2 className="w-4 h-4" /></button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {open !== null && (
        <HoldingModal
          holding={open === "new" ? null : open}
          accounts={accounts}
          onClose={() => setOpen(null)}
          onSaved={() => { setOpen(null); load(); }}
        />
      )}
    </div>
  );
}

function HoldingModal({ holding, accounts, onClose, onSaved }: {
  holding: Holding | null; accounts: Acct[]; onClose: () => void; onSaved: () => void;
}) {
  const [accountId, setAccountId] = useState(holding?.accountId || accounts[0]?.id || "");
  const [symbol, setSymbol] = useState(holding?.symbol || "");
  const [shares, setShares] = useState(holding?.shares?.toString() || "");
  const [costBasis, setCostBasis] = useState(holding?.costBasis?.toString() || "");
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!symbol.trim()) return setErr("Symbol required");
    if (!shares || Number(shares) <= 0) return setErr("Shares must be > 0");
    setSaving(true);
    try {
      const payload = { accountId, symbol: symbol.toUpperCase().trim(), shares: Number(shares), costBasis: Number(costBasis || 0) };
      const res = await fetch(holding ? `/api/holdings/${holding.id}` : "/api/holdings", {
        method: holding ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally { setSaving(false); }
  }

  return (
    <Modal onClose={onClose} title={holding ? "Edit holding" : "New holding"}>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label htmlFor="portfolio-account" className="text-xs text-black/50 dark:text-white/50">Account</label>
          <select id="portfolio-account" className="input mt-1" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="portfolio-symbol" className="text-xs text-black/50 dark:text-white/50">Symbol</label>
          <input id="portfolio-symbol" className="input mt-1 uppercase" value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} placeholder="AAPL" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="portfolio-shares" className="text-xs text-black/50 dark:text-white/50">Shares</label>
            <input id="portfolio-shares" className="input mt-1" type="number" step="0.0001" value={shares} onChange={(e) => setShares(e.target.value)} />
          </div>
          <div>
            <label htmlFor="portfolio-cost-basis" className="text-xs text-black/50 dark:text-white/50">Cost basis</label>
            <input id="portfolio-cost-basis" className="input mt-1" type="number" step="0.01" value={costBasis} onChange={(e) => setCostBasis(e.target.value)} />
          </div>
        </div>
        {err && <div className="text-sm text-rose-500">{err}</div>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <button disabled={saving} className="btn-primary">{saving ? "Saving…" : "Save"}</button>
        </div>
      </form>
    </Modal>
  );
}
