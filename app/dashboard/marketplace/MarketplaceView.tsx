"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Store, Coins, ShieldCheck, Sparkles, Flame, Crown } from "lucide-react";
import { cn } from "@/lib/utils";

type Item = { id: string; slug: string; name: string; description: string; currency: string; cost: number; category: string };
type Balances = { TP: number; SC: number; SHARD: number; KARMA: number };
type Recent = { id: string; name: string; cost: number; currency: string; createdAt: string };

const CURRENCY_META: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; tint: string }> = {
  TP: { label: "Trust Points", icon: ShieldCheck, tint: "text-emerald-500" },
  SC: { label: "Social Currency", icon: Sparkles, tint: "text-fuchsia-500" },
  SHARD: { label: "Streak Shards", icon: Flame, tint: "text-orange-500" },
  KARMA: { label: "Karma", icon: Crown, tint: "text-amber-500" },
};

export default function MarketplaceView({ items, balances: initialBalances, recent: initialRecent }: { items: Item[]; balances: Balances; recent: Recent[] }) {
  const [balances, setBalances] = useState<Balances>(initialBalances);
  const [recent, setRecent] = useState<Recent[]>(initialRecent);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function redeem(item: Item) {
    setBusyId(item.id);
    setError(null);
    try {
      const res = await fetch("/api/marketplace/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.id }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || "Redemption failed");
        return;
      }
      const j = await res.json();
      setBalances((b) => ({ ...b, [item.currency]: (b[item.currency as keyof Balances] || 0) - item.cost }));
      setRecent((r) => [{ id: j.redemption.id, name: item.name, cost: item.cost, currency: item.currency, createdAt: new Date().toISOString() }, ...r].slice(0, 10));
    } finally {
      setBusyId(null);
    }
  }

  const categories = Array.from(new Set(items.map((i) => i.category)));

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-4xl font-semibold tracking-[-0.03em] flex items-center gap-3">
          <Store className="w-8 h-8" /> Marketplace
        </h1>
        <p className="mt-2 text-sm text-black/60 dark:text-white/60">Spend what you've earned — Trust, Social, Shards, or Karma.</p>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(Object.keys(CURRENCY_META) as (keyof Balances)[]).map((c) => {
          const meta = CURRENCY_META[c];
          const Icon = meta.icon;
          return (
            <div key={c} className="rounded-2xl border border-black/10 dark:border-white/10 p-5">
              <div className={cn("text-xs uppercase tracking-wider flex items-center gap-2", meta.tint)}>
                <Icon className="w-3 h-3" /> {meta.label}
              </div>
              <div className="mt-2 text-3xl font-semibold tabular-nums">{balances[c]}</div>
            </div>
          );
        })}
      </section>

      {error && <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-300 px-4 py-3 text-sm">{error}</div>}

      {categories.map((cat) => (
        <section key={cat} className="space-y-3">
          <h2 className="text-lg font-medium">{cat}</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.filter((i) => i.category === cat).map((item) => {
              const meta = CURRENCY_META[item.currency];
              const Icon = meta?.icon ?? Coins;
              const canAfford = (balances[item.currency as keyof Balances] || 0) >= item.cost;
              return (
                <motion.div key={item.id} whileHover={{ y: -2 }} className="rounded-2xl border border-black/10 dark:border-white/10 p-5 flex flex-col">
                  <div className="font-medium">{item.name}</div>
                  <p className="mt-1 text-sm text-black/60 dark:text-white/60 flex-1">{item.description}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <div className={cn("text-sm font-medium flex items-center gap-1.5", meta?.tint)}>
                      <Icon className="w-4 h-4" /> {item.cost} {item.currency}
                    </div>
                    <button
                      disabled={!canAfford || busyId === item.id}
                      onClick={() => redeem(item)}
                      className={cn(
                        "px-4 py-2 rounded-full text-xs font-medium transition",
                        canAfford ? "bg-black text-white dark:bg-white dark:text-black hover:opacity-90" : "bg-black/5 dark:bg-white/5 text-black/40 dark:text-white/40"
                      )}
                    >
                      {busyId === item.id ? "..." : canAfford ? "Redeem" : "Not enough"}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>
      ))}

      {recent.length > 0 && (
        <section className="rounded-2xl border border-black/10 dark:border-white/10 p-5">
          <h3 className="text-lg font-medium mb-3">Recent redemptions</h3>
          <ul className="divide-y divide-black/5 dark:divide-white/5">
            {recent.map((r) => (
              <li key={r.id} className="py-2 flex justify-between text-sm">
                <span>{r.name}</span>
                <span className="text-black/50 dark:text-white/50">−{r.cost} {r.currency} · {new Date(r.createdAt).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
