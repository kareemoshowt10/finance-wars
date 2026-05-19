"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Users, ArrowRight, ArrowLeft, Check } from "lucide-react";

export default function SetupWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("Our Household");
  const [email, setEmail] = useState("");
  const [form, setForm] = useState({
    bigPurchaseThreshold: 250,
    emergencyFundFloor: 5000,
    savingsRateMin: 15,
    personalAllowanceA: 250,
    personalAllowanceB: 250,
    requireDualSignOff: true,
  });
  const [hid, setHid] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function createHousehold() {
    setWorking(true);
    setErr(null);
    try {
      const res = await fetch("/api/households", { method: "POST", body: JSON.stringify({ name }) });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      const hh = await res.json();
      setHid(hh.id);
      await fetch("/api/households/active", { method: "POST", body: JSON.stringify({ householdId: hh.id }) });
      setStep(1);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setWorking(false);
    }
  }

  async function sendInvite() {
    if (!hid || !email) { setStep(2); return; }
    setWorking(true);
    setErr(null);
    try {
      const res = await fetch(`/api/households/${hid}/invite`, { method: "POST", body: JSON.stringify({ email }) });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      const d = await res.json();
      setInviteLink(d.link);
      setStep(2);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setWorking(false);
    }
  }

  async function savePact() {
    if (!hid) return;
    setWorking(true);
    try {
      await fetch(`/api/households/${hid}/pact`, { method: "PATCH", body: JSON.stringify(form) });
      setStep(3);
    } finally {
      setWorking(false);
    }
  }

  async function signAndFinish() {
    if (!hid) return;
    setWorking(true);
    try {
      await fetch(`/api/households/${hid}/pact/sign`, { method: "POST" });
      router.push("/dashboard/couples");
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-12">
      <header className="text-center mb-10">
        <Users className="w-10 h-10 mx-auto" />
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Create your household</h1>
        <div className="mt-2 text-sm text-black/55 dark:text-white/55">{["Name", "Invite partner", "Set the Pact", "Sign"][step]} · Step {step + 1} of 4</div>
      </header>

      <div className="rounded-3xl border border-black/10 dark:border-white/10 p-8 min-h-[360px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
          >
            {step === 0 && (
              <div className="space-y-5">
                <label className="block">
                  <div className="text-sm font-medium">Household name</div>
                  <input value={name} onChange={(e) => setName(e.target.value)} className="mt-2 w-full rounded-xl border border-black/10 dark:border-white/15 bg-transparent px-4 py-3" />
                </label>
                <p className="text-xs text-black/50 dark:text-white/50">Pick something meaningful. You can change it later.</p>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-5">
                <label className="block">
                  <div className="text-sm font-medium">Partner email (optional)</div>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="partner@example.com" className="mt-2 w-full rounded-xl border border-black/10 dark:border-white/15 bg-transparent px-4 py-3" />
                </label>
                <p className="text-xs text-black/50 dark:text-white/50">We'll send them a notification. If they don't have an account yet, you'll get a copyable link.</p>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                {inviteLink && (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm">
                    Invite ready. Copy this link: <code className="text-xs">{inviteLink}</code>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  {[
                    ["bigPurchaseThreshold", "Big purchase threshold ($)"],
                    ["emergencyFundFloor", "Emergency fund floor ($)"],
                    ["savingsRateMin", "Savings rate min (%)"],
                    ["personalAllowanceA", "Your allowance ($/mo)"],
                    ["personalAllowanceB", "Partner allowance ($/mo)"],
                  ].map(([k, label]) => (
                    <label key={k} className="block">
                      <div className="text-xs text-black/55 dark:text-white/55">{label}</div>
                      <input type="number" value={(form as any)[k]} onChange={(e) => setForm({ ...form, [k]: Number(e.target.value) })} className="mt-1 w-full rounded-xl border border-black/10 dark:border-white/15 bg-transparent px-3 py-2 text-sm" />
                    </label>
                  ))}
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.requireDualSignOff} onChange={(e) => setForm({ ...form, requireDualSignOff: e.target.checked })} />
                  Require dual sign-off for changes
                </label>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5 text-center">
                <Check className="w-12 h-12 mx-auto text-emerald-500" />
                <div className="text-lg font-medium">Sign your pact</div>
                <p className="text-sm text-black/55 dark:text-white/55">By signing, you commit to these terms. Your partner will sign too — both signatures activate the pact.</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
        {err && <div className="mt-4 text-sm text-rose-500">{err}</div>}
      </div>

      <div className="mt-6 flex justify-between">
        <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} className="px-4 py-2 rounded-full text-sm border border-black/10 dark:border-white/15 disabled:opacity-40 flex items-center gap-1"><ArrowLeft className="w-4 h-4" /> Back</button>
        {step === 0 && <button onClick={createHousehold} disabled={working || !name} className="px-5 py-2 rounded-full bg-black text-white dark:bg-white dark:text-black text-sm font-medium flex items-center gap-1">{working ? "…" : "Continue"} <ArrowRight className="w-4 h-4" /></button>}
        {step === 1 && <button onClick={sendInvite} disabled={working} className="px-5 py-2 rounded-full bg-black text-white dark:bg-white dark:text-black text-sm font-medium flex items-center gap-1">{email ? (working ? "Sending…" : "Send invite") : "Skip"} <ArrowRight className="w-4 h-4" /></button>}
        {step === 2 && <button onClick={savePact} disabled={working} className="px-5 py-2 rounded-full bg-black text-white dark:bg-white dark:text-black text-sm font-medium flex items-center gap-1">{working ? "Saving…" : "Save pact"} <ArrowRight className="w-4 h-4" /></button>}
        {step === 3 && <button onClick={signAndFinish} disabled={working} className="px-5 py-2 rounded-full bg-black text-white dark:bg-white dark:text-black text-sm font-medium flex items-center gap-1">{working ? "Signing…" : "Sign & finish"} <Check className="w-4 h-4" /></button>}
      </div>
    </div>
  );
}
