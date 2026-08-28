"use client";
import { useEffect, useState } from "react";
import { Landmark, Plus } from "lucide-react";
import Modal from "../../_components/Modal";
import { formatCurrency, formatCurrencyFull, formatDate } from "@/lib/utils";
import { loanProgress } from "@/lib/loans";

type Payment = { id: string; amount: number; note: string | null; createdAt: string };
type Loan = {
  id: string;
  principal: number;
  balanceRemaining: number;
  interestRateApr: number;
  purpose: string;
  category: "ESSENTIAL" | "ELECTIVE";
  status: "ACTIVE" | "PAID" | "FORGIVEN";
  dueDate: string | null;
  createdAt: string;
  lender: { id: string; name: string };
  borrower: { id: string; name: string };
  payments: Payment[];
};
type Member = { userId: string; name: string };

export default function BankView({ hid, meId, currency, members }: { hid: string; meId: string; currency: string; members: Member[] }) {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [bankPosition, setBankPosition] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [payingLoan, setPayingLoan] = useState<Loan | null>(null);

  async function load() {
    setLoading(true);
    const data = await fetch(`/api/households/${hid}/loans`).then((r) => r.json());
    setLoans(data.loans || []);
    setBankPosition(data.bankPosition || {});
    setLoading(false);
  }
  useEffect(() => { load(); }, [hid]);

  const nameOf = (userId: string) => members.find((m) => m.userId === userId)?.name || "Member";

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-semibold tracking-[-0.03em] flex items-center gap-3">
            <Landmark className="w-8 h-8" /> The Bank
          </h1>
          <p className="mt-2 text-sm text-black/60 dark:text-white/60">Front each other money, track exactly what it's for, and see who owes what.</p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary"><Plus className="w-4 h-4" /> Issue a loan</button>
      </header>

      {Object.keys(bankPosition).length > 0 && (
        <div className="card p-5">
          <div className="text-xs uppercase tracking-wider text-black/40 dark:text-white/40 mb-3">The bank's book</div>
          <div className="flex flex-wrap gap-4">
            {Object.entries(bankPosition).sort((a, b) => b[1] - a[1]).map(([userId, net]) => (
              <div key={userId} className="flex-1 min-w-[140px]">
                <div className="text-sm font-medium">{userId === meId ? "You" : nameOf(userId)}</div>
                <div className={`text-lg font-semibold ${net > 0 ? "text-emerald-500" : net < 0 ? "text-rose-500" : ""}`}>
                  {net === 0 ? "—" : formatCurrency(Math.abs(net), currency)}
                </div>
                <div className="text-[11px] text-black/40 dark:text-white/40">{net > 0 ? "owed" : net < 0 ? "owes" : "even"}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-black/40 dark:text-white/40 text-sm">Loading…</div>
      ) : loans.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-black/60 dark:text-white/60">No loans yet. The bank is open for business.</div>
          <button onClick={() => setShowNew(true)} className="btn-secondary mt-4">Issue the first loan</button>
        </div>
      ) : (
        <div className="grid gap-3">
          {loans.map((loan) => {
            const pct = loanProgress(loan.principal, loan.balanceRemaining);
            return (
              <div key={loan.id} className="card p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{loan.purpose}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wide ${loan.category === "ESSENTIAL" ? "bg-sky-500/15 text-sky-500" : "bg-fuchsia-500/15 text-fuchsia-500"}`}>
                        {loan.category === "ESSENTIAL" ? "Essential" : "Elective"}
                      </span>
                      {loan.status === "PAID" && <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 uppercase tracking-wide">Paid off</span>}
                    </div>
                    <div className="mt-1 text-sm text-black/60 dark:text-white/60">
                      {loan.lender.id === meId ? "You" : loan.lender.name} → {loan.borrower.id === meId ? "you" : loan.borrower.name}
                      {loan.interestRateApr > 0 && ` · ${loan.interestRateApr}% APR`}
                      {loan.dueDate && ` · due ${formatDate(loan.dueDate)}`}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xl font-semibold tracking-tight">{formatCurrencyFull(loan.balanceRemaining, currency)}</div>
                    <div className="text-xs text-black/40 dark:text-white/40">of {formatCurrencyFull(loan.principal, currency)}</div>
                  </div>
                </div>
                <div className="mt-3 h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500" style={{ width: `${pct}%` }} />
                </div>
                {loan.status === "ACTIVE" && (
                  <div className="mt-3 flex justify-end">
                    <button onClick={() => setPayingLoan(loan)} className="btn-ghost text-sm">Record a payment</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showNew && (
        <NewLoanModal hid={hid} members={members.filter((m) => m.userId !== meId)} onClose={() => setShowNew(false)} onSaved={async () => { setShowNew(false); await load(); }} />
      )}
      {payingLoan && (
        <PaymentModal hid={hid} loan={payingLoan} currency={currency} onClose={() => setPayingLoan(null)} onSaved={async () => { setPayingLoan(null); await load(); }} />
      )}
    </div>
  );
}

function NewLoanModal({ hid, members, onClose, onSaved }: { hid: string; members: Member[]; onClose: () => void; onSaved: () => void }) {
  const [borrowerUserId, setBorrower] = useState(members[0]?.userId || "");
  const [principal, setPrincipal] = useState("");
  const [purpose, setPurpose] = useState("");
  const [category, setCategory] = useState<"ESSENTIAL" | "ELECTIVE">("ELECTIVE");
  const [interestRateApr, setApr] = useState("0");
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!borrowerUserId) return setError("Pick who's borrowing");
    if (!principal || Number(principal) <= 0) return setError("Enter an amount");
    if (!purpose.trim()) return setError("What's this for?");
    setSaving(true);
    try {
      const res = await fetch(`/api/households/${hid}/loans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ borrowerUserId, principal: Number(principal), purpose, category, interestRateApr: Number(interestRateApr) || 0, dueDate: dueDate || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally { setSaving(false); }
  }

  return (
    <Modal onClose={onClose} title="Issue a loan">
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="text-xs text-black/50 dark:text-white/50">Borrower</label>
          <select className="input mt-1" value={borrowerUserId} onChange={(e) => setBorrower(e.target.value)}>
            {members.map((m) => <option key={m.userId} value={m.userId}>{m.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-black/50 dark:text-white/50">What's it for?</label>
          <input className="input mt-1" required placeholder="New headset" value={purpose} onChange={(e) => setPurpose(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-black/50 dark:text-white/50">Amount</label>
            <input className="input mt-1" type="number" step="0.01" required value={principal} onChange={(e) => setPrincipal(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-black/50 dark:text-white/50">Category</label>
            <select className="input mt-1" value={category} onChange={(e) => setCategory(e.target.value as typeof category)}>
              <option value="ELECTIVE">Elective</option>
              <option value="ESSENTIAL">Essential</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-black/50 dark:text-white/50">Interest (APR %, optional)</label>
            <input className="input mt-1" type="number" step="0.1" min={0} value={interestRateApr} onChange={(e) => setApr(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-black/50 dark:text-white/50">Due date (optional)</label>
            <input className="input mt-1" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </div>
        {error && <div className="text-sm text-red-400">{error}</div>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <button disabled={saving} className="btn-primary">{saving ? "Saving…" : "Issue loan"}</button>
        </div>
      </form>
    </Modal>
  );
}

function PaymentModal({ hid, loan, currency, onClose, onSaved }: { hid: string; loan: Loan; currency: string; onClose: () => void; onSaved: () => void }) {
  const [amount, setAmount] = useState(loan.balanceRemaining.toFixed(2));
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!amount || Number(amount) <= 0) return setError("Enter an amount");
    setSaving(true);
    try {
      const res = await fetch(`/api/households/${hid}/loans/${loan.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(amount), note: note || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally { setSaving(false); }
  }

  return (
    <Modal onClose={onClose} title={`Pay down "${loan.purpose}"`}>
      <form onSubmit={submit} className="space-y-3">
        <div className="text-sm text-black/60 dark:text-white/60">Balance remaining: {formatCurrencyFull(loan.balanceRemaining, currency)}</div>
        <div>
          <label className="text-xs text-black/50 dark:text-white/50">Amount</label>
          <input className="input mt-1" type="number" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-black/50 dark:text-white/50">Note (optional)</label>
          <input className="input mt-1" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        {error && <div className="text-sm text-red-400">{error}</div>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <button disabled={saving} className="btn-primary">{saving ? "Saving…" : "Record payment"}</button>
        </div>
      </form>
    </Modal>
  );
}
