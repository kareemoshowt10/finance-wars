"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import Modal from "../../_components/Modal";
import { formatCurrency, formatDate } from "@/lib/utils";

type Goal = { id: string; name: string; targetAmount: number; currentAmount: number; deadline: string };
type Contribution = { id: string; amount: number; date: string; note: string | null; transactionId: string | null };
type Projection = { monthlySavings: number; remaining: number; eta: string | null; requiredPerMonth: number; onTrack: boolean; shortfall: number };
type Tx = { id: string; amount: number; description: string; date: string };

export default function GoalDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id as string;
  const [goal, setGoal] = useState<Goal | null>(null);
  const [contribs, setContribs] = useState<Contribution[]>([]);
  const [projection, setProjection] = useState<Projection | null>(null);
  const [currency, setCurrency] = useState("USD");
  const [open, setOpen] = useState(false);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [txId, setTxId] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!id) return;
    const [gs, cs, pj, me, ts] = await Promise.all([
      fetch("/api/goals").then((r) => r.json()),
      fetch(`/api/goals/${id}/contributions`).then((r) => r.json()),
      fetch(`/api/goals/${id}/projection`).then((r) => r.json()),
      fetch("/api/auth/me").then((r) => r.json()),
      fetch("/api/transactions?pageSize=20").then((r) => r.json()),
    ]);
    const g = (gs || []).find((x: Goal) => x.id === id);
    setGoal(g || null);
    setContribs(cs || []);
    setProjection(pj || null);
    if (me?.currency) setCurrency(me.currency);
    setTxs((ts?.items || []).slice(0, 20));
  }
  useEffect(() => { load(); }, [id]);

  async function addContribution() {
    setSaving(true);
    try {
      const res = await fetch(`/api/goals/${id}/contributions`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(amount), date, note: note || null, transactionId: txId || null }),
      });
      if (res.ok) {
        setOpen(false);
        setAmount(""); setNote(""); setTxId("");
        load();
      }
    } finally { setSaving(false); }
  }

  async function removeContrib(cid: string) {
    if (!confirm("Delete this contribution?")) return;
    await fetch(`/api/goals/${id}/contributions/${cid}`, { method: "DELETE" });
    load();
  }

  if (!goal) return <div className="text-black/40 dark:text-white/40 text-sm">Loading…</div>;

  const pct = Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);

  return (
    <div className="space-y-6">
      <button onClick={() => router.push("/dashboard/goals")} className="text-xs text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white flex items-center gap-1"><ArrowLeft className="w-3 h-3" />All goals</button>

      <header className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-semibold tracking-[-0.03em]">{goal.name}</h1>
          <p className="text-black/50 dark:text-white/50 mt-1 text-sm">Target {formatCurrency(goal.targetAmount, currency)} by {formatDate(goal.deadline)}</p>
        </div>
        <button onClick={() => setOpen(true)} className="btn-primary"><Plus className="w-4 h-4" />Contribute</button>
      </header>

      <div className="card p-5">
        <div className="flex items-baseline justify-between">
          <div className="text-2xl font-semibold">{formatCurrency(goal.currentAmount, currency)}</div>
          <div className="text-xs text-black/50 dark:text-white/50">{Math.round(pct)}% of {formatCurrency(goal.targetAmount, currency)}</div>
        </div>
        <div className="h-2 mt-3 rounded-full bg-black/5 dark:bg-white/5 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-purple-500 to-blue-500" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {projection && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Tile label="Monthly savings" value={formatCurrency(projection.monthlySavings, currency)} />
          <Tile label="Need / month" value={formatCurrency(projection.requiredPerMonth, currency)} />
          <Tile label="ETA" value={projection.eta ? formatDate(projection.eta) : "—"} />
          <Tile label="Status" value={projection.onTrack ? "On track" : `Short ${formatCurrency(projection.shortfall, currency)}`} className={projection.onTrack ? "text-emerald-500" : "text-rose-500"} />
        </div>
      )}

      <div className="card p-5">
        <div className="text-sm font-medium mb-3">Contributions</div>
        {contribs.length === 0 ? (
          <div className="text-xs text-black/40 dark:text-white/40">No contributions yet.</div>
        ) : (
          <ul className="divide-y divide-black/5 dark:divide-white/5">
            {contribs.map((c) => (
              <li key={c.id} className="py-2.5 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">{formatCurrency(c.amount, currency)}</div>
                  <div className="text-xs text-black/40 dark:text-white/40">{formatDate(c.date)}{c.note ? ` · ${c.note}` : ""}</div>
                </div>
                <button onClick={() => removeContrib(c.id)} className="p-2 text-black/40 dark:text-white/40 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {open && (
        <Modal title="Add contribution" onClose={() => setOpen(false)}>
          <div className="space-y-3">
            <div>
              <label htmlFor="id-amount" className="text-xs text-black/50 dark:text-white/50">Amount</label>
              <input id="id-amount" className="input" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="100" />
            </div>
            <div>
              <label htmlFor="id-date" className="text-xs text-black/50 dark:text-white/50">Date</label>
              <input id="id-date" className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <label htmlFor="id-note-optional" className="text-xs text-black/50 dark:text-white/50">Note (optional)</label>
              <input id="id-note-optional" className="input" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            <div>
              <label htmlFor="id-link-transaction-optional" className="text-xs text-black/50 dark:text-white/50">Link transaction (optional)</label>
              <select id="id-link-transaction-optional" className="input" value={txId} onChange={(e) => setTxId(e.target.value)}>
                <option value="">None</option>
                {txs.map((t) => <option key={t.id} value={t.id}>{formatDate(t.date)} · {t.description} · {formatCurrency(t.amount, currency)}</option>)}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setOpen(false)} className="btn-ghost">Cancel</button>
              <button onClick={addContribution} disabled={saving || !amount} className="btn-primary">{saving ? "Saving…" : "Add"}</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Tile({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs text-black/50 dark:text-white/50">{label}</div>
      <div className={`text-xl font-semibold mt-1 ${className || ""}`}>{value}</div>
    </div>
  );
}
