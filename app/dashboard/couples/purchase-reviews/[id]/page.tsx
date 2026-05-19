"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { CheckCircle, XCircle, X, BellOff } from "lucide-react";

export default function PurchaseReviewPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [me, setMe] = useState<string>("");
  const [working, setWorking] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((u) => setMe(u?.id || ""));
    // Need to find the review across households
    fetch("/api/households").then((r) => r.json()).then(async (hs) => {
      for (const h of hs) {
        const list = await fetch(`/api/households/${h.id}/purchase-reviews?status=all`).then((r) => r.json());
        const found = list.find((x: any) => x.id === params.id);
        if (found) { setData(found); break; }
      }
    });
  }, [params.id]);

  async function decide(status: string) {
    setWorking(true);
    await fetch(`/api/purchase-reviews/${params.id}/decide`, { method: "POST", body: JSON.stringify({ status }) });
    router.push("/dashboard/couples");
  }
  async function mute() {
    setWorking(true);
    await fetch(`/api/purchase-reviews/${params.id}/mute-category`, { method: "POST" });
    router.push("/dashboard/couples");
  }

  if (!data) return <div className="text-sm text-black/40 dark:text-white/40">Loading…</div>;
  const isApprover = data.approverUserId === me;
  const pending = data.status === "PENDING";

  return (
    <div className="max-w-xl mx-auto">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="rounded-3xl border border-black/10 dark:border-white/10 p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="text-xs uppercase tracking-wider text-black/50 dark:text-white/50">Big purchase</div>
          <Link href="/dashboard/couples" className="text-black/40 dark:text-white/40"><X className="w-4 h-4" /></Link>
        </div>
        <div>
          <div className="text-4xl font-semibold tracking-tight">${data.amount.toFixed(2)}</div>
          <div className="mt-1 text-sm text-black/55 dark:text-white/55">{data.transaction?.description || "Purchase"}</div>
        </div>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div><dt className="text-xs text-black/50 dark:text-white/50">Account</dt><dd>{data.transaction?.account?.name || "—"}</dd></div>
          <div><dt className="text-xs text-black/50 dark:text-white/50">Category</dt><dd>{data.transaction?.category}</dd></div>
          <div><dt className="text-xs text-black/50 dark:text-white/50">Requester</dt><dd>{data.requester?.name}</dd></div>
          <div><dt className="text-xs text-black/50 dark:text-white/50">Approver</dt><dd>{data.approver?.name}</dd></div>
          <div><dt className="text-xs text-black/50 dark:text-white/50">Status</dt><dd>{data.status}</dd></div>
          <div><dt className="text-xs text-black/50 dark:text-white/50">Expires</dt><dd>{new Date(data.expiresAt).toLocaleString()}</dd></div>
        </dl>
        {data.reason && <p className="text-sm text-black/70 dark:text-white/70 border-l-2 pl-3 border-black/10 dark:border-white/15">{data.reason}</p>}
        {pending && isApprover && (
          <div className="flex flex-wrap gap-2">
            <button onClick={() => decide("APPROVED")} disabled={working} className="flex-1 px-4 py-3 rounded-full bg-emerald-500 text-white text-sm flex items-center justify-center gap-2"><CheckCircle className="w-4 h-4" /> Approve</button>
            <button onClick={() => decide("DENIED")} disabled={working} className="flex-1 px-4 py-3 rounded-full bg-rose-500 text-white text-sm flex items-center justify-center gap-2"><XCircle className="w-4 h-4" /> Deny</button>
          </div>
        )}
        {pending && !isApprover && <div className="text-sm text-amber-500 text-center">Awaiting partner's review.</div>}
        <button onClick={mute} disabled={working} className="w-full px-4 py-2 rounded-full border border-black/10 dark:border-white/15 text-xs flex items-center justify-center gap-2 text-black/55 dark:text-white/55">
          <BellOff className="w-3 h-3" /> Mute this category for me
        </button>
      </motion.div>
    </div>
  );
}
