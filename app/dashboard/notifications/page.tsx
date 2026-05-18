"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Trash2, CheckCheck } from "lucide-react";
import { formatDate } from "@/lib/utils";

type Notif = {
  id: string; kind: string; title: string; body: string;
  link?: string | null; readAt?: string | null; createdAt: string;
};

const KINDS = [
  "all", "BUDGET_EXCEEDED", "BUDGET_WARNING", "GOAL_MILESTONE",
  "GOAL_REACHED", "BILL_DUE", "LARGE_TX", "INSIGHT",
];

export default function NotificationsPage() {
  const [items, setItems] = useState<Notif[]>([]);
  const [kind, setKind] = useState("all");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const url = kind === "all" ? "/api/notifications?limit=200" : `/api/notifications?limit=200&kind=${kind}`;
    const res = await fetch(url).then((r) => r.json());
    setItems(res.items || []);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [kind]);

  async function markAll() {
    await fetch("/api/notifications/read-all", { method: "POST" });
    load();
  }
  async function remove(id: string) {
    await fetch(`/api/notifications/${id}`, { method: "DELETE" });
    load();
  }
  async function markRead(id: string) {
    await fetch(`/api/notifications/${id}/read`, { method: "POST" });
    load();
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-4xl font-semibold tracking-[-0.03em]">Notifications</h1>
          <p className="text-black/50 dark:text-white/50 mt-1 text-sm">Alerts about budgets, goals, and bills.</p>
        </div>
        <button onClick={markAll} className="btn-secondary"><CheckCheck className="w-4 h-4" />Mark all read</button>
      </header>

      <div className="flex flex-wrap gap-1.5">
        {KINDS.map((k) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            className={`px-3 py-1.5 rounded-full text-xs border ${kind === k ? "bg-black/10 dark:bg-white/10 border-black/20 dark:border-white/20" : "border-black/10 dark:border-white/10 text-black/60 dark:text-white/60"}`}
          >
            {k === "all" ? "All" : k.replace(/_/g, " ").toLowerCase()}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-sm text-black/40 dark:text-white/40">Loading…</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <Bell className="w-8 h-8 mx-auto opacity-30" />
            <div className="text-sm text-black/60 dark:text-white/60 mt-3">Nothing here yet.</div>
          </div>
        ) : (
          <ul className="divide-y divide-black/5 dark:divide-white/5">
            {items.map((n) => (
              <li key={n.id} className="px-4 py-3 flex items-start gap-3">
                {!n.readAt && <span className="w-2 h-2 rounded-full bg-indigo-500 mt-2 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{n.title}</div>
                  <div className="text-xs text-black/50 dark:text-white/50 mt-0.5">{n.body}</div>
                  <div className="text-[10px] mt-1 text-black/40 dark:text-white/40">
                    {n.kind.replace(/_/g, " ").toLowerCase()} · {formatDate(n.createdAt)}
                  </div>
                </div>
                {n.link && (
                  <Link href={n.link} onClick={() => markRead(n.id)} className="text-xs underline text-black/60 dark:text-white/60">Open</Link>
                )}
                {!n.readAt && (
                  <button onClick={() => markRead(n.id)} className="text-[11px] text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white">Mark read</button>
                )}
                <button onClick={() => remove(n.id)} className="p-1 text-black/40 dark:text-white/40 hover:text-rose-400"><Trash2 className="w-4 h-4" /></button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
