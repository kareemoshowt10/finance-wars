"use client";
import { useEffect, useState } from "react";
import {
  Plus, Pencil, Trash2, LogIn, LogOut, User, FileText, Tag, Target, Trophy, Repeat, Wallet, PieChart, Key,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

type Entry = {
  id: string; action: string; entity: string; entityId?: string | null;
  meta?: unknown; ip?: string | null; createdAt: string;
};

function iconFor(action: string) {
  if (action.startsWith("auth.login")) return LogIn;
  if (action.startsWith("auth.logout")) return LogOut;
  if (action.startsWith("auth.signup")) return User;
  if (action.endsWith(".create")) return Plus;
  if (action.endsWith(".update") || action.endsWith(".upsert")) return Pencil;
  if (action.endsWith(".delete") || action.endsWith(".revoke")) return Trash2;
  if (action.startsWith("transaction")) return FileText;
  if (action.startsWith("category")) return Tag;
  if (action.startsWith("budget")) return Target;
  if (action.startsWith("goal")) return Trophy;
  if (action.startsWith("recurring")) return Repeat;
  if (action.startsWith("account")) return Wallet;
  if (action.startsWith("holding")) return PieChart;
  if (action.startsWith("token")) return Key;
  return FileText;
}

export default function ActivityPage() {
  const [items, setItems] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/audit")
      .then((r) => r.json())
      .then((data) => {
        setItems(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  }, []);

  const grouped: Record<string, Entry[]> = {};
  for (const e of items) {
    const day = new Date(e.createdAt).toISOString().slice(0, 10);
    (grouped[day] ||= []).push(e);
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-4xl font-semibold tracking-[-0.03em]">Activity</h1>
        <p className="text-black/50 dark:text-white/50 mt-1 text-sm">Your last 100 changes.</p>
      </header>

      {loading ? (
        <div className="text-sm opacity-50">Loading…</div>
      ) : items.length === 0 ? (
        <div className="card p-12 text-center text-sm text-black/60 dark:text-white/60">No activity yet.</div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([day, entries]) => (
            <div key={day}>
              <div className="text-xs text-black/40 dark:text-white/40 uppercase tracking-wider mb-2">{formatDate(day)}</div>
              <div className="card overflow-hidden">
                <ul className="divide-y divide-black/5 dark:divide-white/5">
                  {entries.map((e) => {
                    const Ic = iconFor(e.action);
                    return (
                      <li key={e.id} className="px-4 py-3 flex items-center gap-3">
                        <Ic className="w-4 h-4 text-black/50 dark:text-white/50" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm">{e.action}</div>
                          <div className="text-xs text-black/40 dark:text-white/40">{e.entity}{e.entityId ? ` · ${e.entityId.slice(0, 8)}` : ""}</div>
                        </div>
                        <div className="text-xs text-black/40 dark:text-white/40">
                          {new Date(e.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
