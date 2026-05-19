"use client";
import { motion } from "framer-motion";
import * as Icons from "lucide-react";
import { Flame, Trophy } from "lucide-react";

type Item = {
  slug: string;
  name: string;
  description: string;
  icon: string;
  xp: number;
  category: string;
  tier: number;
  unlocked: boolean;
  unlockedAt: string | null;
  progress: number;
  progressLabel?: string;
};

const CATEGORY_ORDER = ["setup", "savings", "streaks", "duel", "insights", "social"];
const CATEGORY_LABELS: Record<string, string> = {
  setup: "Setup",
  savings: "Savings",
  streaks: "Streaks",
  duel: "Duel",
  insights: "Insights",
  social: "Social",
};

export default function AchievementsClient({
  items, xp, level, streak, longest,
}: {
  items: Item[];
  xp: number;
  level: { level: number; xpForCurrent: number; xpForNext: number; progress: number; capped: boolean };
  streak: number;
  longest: number;
}) {
  const grouped: Record<string, Item[]> = {};
  for (const i of items) {
    (grouped[i.category] ||= []).push(i);
  }

  const nextLocked = items.find((i) => !i.unlocked && i.progress > 0)
    || items.find((i) => !i.unlocked);

  return (
    <div className="space-y-10">
      <header className="space-y-4">
        <h1 className="text-4xl font-semibold tracking-[-0.03em] flex items-center gap-3">
          <Trophy className="w-8 h-8" /> Achievements
        </h1>
        <div className="rounded-2xl border border-black/10 dark:border-white/10 p-6 bg-white dark:bg-white/[0.02]">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-xl font-semibold shadow-lg">
                {level.level}
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-black/40 dark:text-white/40">Level</div>
                <div className="text-lg font-medium">{xp.toLocaleString()} XP</div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-black/60 dark:text-white/60">
              <Flame className="w-4 h-4 text-orange-500" />
              <span className="tabular-nums">{streak}-day streak</span>
              <span className="opacity-50">· best {longest}</span>
            </div>
          </div>
          <div className="mt-5">
            <div className="flex justify-between text-xs text-black/50 dark:text-white/50 mb-1.5 tabular-nums">
              <span>{xp - level.xpForCurrent} / {level.xpForNext - level.xpForCurrent} to lvl {level.level + 1}</span>
              {level.capped && <span>MAX</span>}
            </div>
            <div className="h-2 rounded-full bg-black/5 dark:bg-white/5 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${level.progress * 100}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-600"
              />
            </div>
          </div>
          {nextLocked && (
            <div className="mt-4 text-xs text-black/50 dark:text-white/50">
              Next up: <span className="text-black dark:text-white font-medium">{nextLocked.name}</span> · {nextLocked.description}
            </div>
          )}
        </div>
      </header>

      {CATEGORY_ORDER.filter((c) => grouped[c]).map((cat) => (
        <section key={cat} className="space-y-3">
          <h2 className="text-xs uppercase tracking-[0.25em] text-black/40 dark:text-white/40">{CATEGORY_LABELS[cat]}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {grouped[cat].map((i) => {
              const Icon = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[i.icon] || Trophy;
              return (
                <motion.div
                  key={i.slug}
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className={[
                    "rounded-2xl border p-4 transition",
                    i.unlocked
                      ? "border-black/10 dark:border-white/10 bg-white dark:bg-white/[0.02]"
                      : "border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.01] grayscale opacity-70",
                  ].join(" ")}
                >
                  <div className="flex items-start gap-3">
                    <div className={[
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                      i.unlocked ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white" : "bg-black/10 dark:bg-white/10 text-black/40 dark:text-white/40",
                    ].join(" ")}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <div className="text-sm font-medium truncate">{i.name}</div>
                        <div className="text-[11px] tabular-nums opacity-60">+{i.xp}</div>
                      </div>
                      <div className="text-xs text-black/55 dark:text-white/55 mt-0.5 line-clamp-2">{i.description}</div>
                      {!i.unlocked && i.progressLabel && (
                        <div className="mt-2">
                          <div className="h-1 rounded-full bg-black/5 dark:bg-white/5 overflow-hidden">
                            <div className="h-full bg-black/30 dark:bg-white/30" style={{ width: `${i.progress * 100}%` }} />
                          </div>
                          <div className="text-[10px] mt-1 opacity-50 tabular-nums">{i.progressLabel}</div>
                        </div>
                      )}
                      {i.unlocked && i.unlockedAt && (
                        <div className="text-[10px] mt-1.5 opacity-50">{new Date(i.unlockedAt).toLocaleDateString()}</div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
