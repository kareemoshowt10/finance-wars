"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Sparkles, Wallet, ArrowLeftRight, ArrowRight, X } from "lucide-react";

export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [open, setOpen] = useState(true);
  const [acctName, setAcctName] = useState("Everyday Checking");
  const [acctType, setAcctType] = useState("checking");
  const [acctBal, setAcctBal] = useState("1000");
  const [acctId, setAcctId] = useState<string | null>(null);
  const [txAmount, setTxAmount] = useState("50");
  const [txDesc, setTxDesc] = useState("Coffee");

  async function finish(markOnboarded = true) {
    if (markOnboarded) {
      await fetch("/api/user", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ onboarded: true }) });
    }
    setOpen(false);
    router.refresh();
  }

  async function addAccount() {
    const res = await fetch("/api/accounts", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: acctName, type: acctType, balance: Number(acctBal) }),
    });
    const a = await res.json();
    if (a?.id) { setAcctId(a.id); setStep(2); }
  }

  async function addTx() {
    if (!acctId) return;
    await fetch("/api/transactions", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accountId: acctId, amount: Number(txAmount), type: "expense",
        category: "Food", description: txDesc, date: new Date().toISOString(),
      }),
    });
    finish(true);
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4">
      <button onClick={() => finish(true)} className="absolute top-4 right-4 p-2 text-white/40 hover:text-white"><X className="w-5 h-5" /></button>
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.3 }}
          className="card p-8 max-w-md w-full bg-[#0a0a0a] text-white"
        >
          {step === 0 && (
            <>
              <Sparkles className="w-7 h-7 text-purple-400" />
              <h2 className="mt-4 text-2xl font-semibold tracking-tight">Welcome to Finance Wars</h2>
              <p className="mt-2 text-sm text-white/60">A calm command center for your money. Let&apos;s set up in under a minute.</p>
              <div className="mt-6 flex gap-2">
                <button onClick={() => setStep(1)} className="btn-primary">Get started <ArrowRight className="w-4 h-4" /></button>
                <button onClick={() => finish(true)} className="btn-ghost">Skip</button>
              </div>
            </>
          )}
          {step === 1 && (
            <>
              <Wallet className="w-7 h-7 text-blue-400" />
              <h2 className="mt-4 text-2xl font-semibold tracking-tight">Add your first account</h2>
              <div className="mt-5 space-y-3">
                <input className="input" value={acctName} onChange={(e) => setAcctName(e.target.value)} placeholder="Name" />
                <select className="input" value={acctType} onChange={(e) => setAcctType(e.target.value)}>
                  <option value="checking">checking</option><option value="savings">savings</option>
                  <option value="credit">credit</option><option value="investment">investment</option>
                </select>
                <input className="input" type="number" value={acctBal} onChange={(e) => setAcctBal(e.target.value)} placeholder="Balance" />
              </div>
              <div className="mt-5 flex gap-2">
                <button onClick={addAccount} className="btn-primary">Continue <ArrowRight className="w-4 h-4" /></button>
                <button onClick={() => finish(true)} className="btn-ghost">Skip</button>
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <ArrowLeftRight className="w-7 h-7 text-emerald-400" />
              <h2 className="mt-4 text-2xl font-semibold tracking-tight">Log your first transaction</h2>
              <div className="mt-5 space-y-3">
                <input className="input" value={txDesc} onChange={(e) => setTxDesc(e.target.value)} placeholder="Description" />
                <input className="input" type="number" value={txAmount} onChange={(e) => setTxAmount(e.target.value)} placeholder="Amount" />
              </div>
              <div className="mt-5 flex gap-2">
                <button onClick={addTx} className="btn-primary">Finish</button>
                <button onClick={() => finish(true)} className="btn-ghost">Skip</button>
              </div>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
