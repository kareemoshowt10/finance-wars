"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DuelInviteActions({ duelId }: { duelId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function accept() {
    setBusy(true);
    await fetch(`/api/duels/${duelId}/accept`, { method: "POST" });
    router.push(`/dashboard/duels/${duelId}`);
    router.refresh();
  }
  async function decline() {
    if (!confirm("Decline this duel?")) return;
    setBusy(true);
    await fetch(`/api/duels/${duelId}/decline`, { method: "POST" });
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      <button disabled={busy} onClick={accept} className="btn-primary text-xs">Accept</button>
      <button disabled={busy} onClick={decline} className="btn-secondary text-xs">Decline</button>
    </div>
  );
}
