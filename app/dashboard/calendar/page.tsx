"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, X, Calendar as CalIcon } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type Entry = {
  date: string;
  kind: "tx" | "recurring" | "sprintOpen" | "sprintClose" | "duelEnd" | "goalDeadline";
  label: string;
  amount?: number;
  link?: string;
  color?: string;
  id?: string;
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function ym(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function CalendarPage() {
  const [cursor, setCursor] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [currency, setCurrency] = useState("USD");

  const month = ym(cursor);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((d) => d?.currency && setCurrency(d.currency)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/calendar?month=${month}`)
      .then((r) => r.json())
      .then((d) => setEntries(d.entries || []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [month]);

  const byDay = useMemo(() => {
    const m = new Map<string, Entry[]>();
    for (const e of entries) {
      const list = m.get(e.date) || [];
      list.push(e);
      m.set(e.date, list);
    }
    return m;
  }, [entries]);

  const grid = useMemo(() => {
    const first = new Date(cursor);
    const firstWeekday = first.getDay();
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const cells: { date: Date | null }[] = [];
    for (let i = 0; i < firstWeekday; i++) cells.push({ date: null });
    for (let i = 1; i <= daysInMonth; i++) cells.push({ date: new Date(cursor.getFullYear(), cursor.getMonth(), i) });
    while (cells.length % 7 !== 0) cells.push({ date: null });
    return cells;
  }, [cursor]);

  const todayKey = ymd(new Date());

  const selectedEntries = selected ? entries.filter((e) => e.date === selected) : [];

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-4xl md:text-5xl font-semibold tracking-[-0.03em] flex items-center gap-3">
            <CalIcon className="w-8 h-8" />Calendar
          </h1>
          <p className="text-black/50 dark:text-white/50 mt-1 text-sm">Bills, sprints, deadlines, and transactions in one view.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} className="btn-ghost p-2"><ChevronLeft className="w-4 h-4" /></button>
          <div className="px-3 py-1.5 text-sm font-medium min-w-[10rem] text-center">
            {cursor.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </div>
          <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} className="btn-ghost p-2"><ChevronRight className="w-4 h-4" /></button>
          <button onClick={() => { const n = new Date(); setCursor(new Date(n.getFullYear(), n.getMonth(), 1)); }} className="btn-secondary text-xs">Today</button>
        </div>
      </header>

      <div className="card overflow-hidden">
        <div className="grid grid-cols-7 border-b border-black/5 dark:border-white/5">
          {DAYS.map((d) => (
            <div key={d} className="px-2 py-2 text-[10px] uppercase tracking-[0.2em] text-black/40 dark:text-white/40 text-center">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {grid.map((cell, i) => {
            const key = cell.date ? ymd(cell.date) : `b${i}`;
            const list = cell.date ? byDay.get(key) || [] : [];
            const isToday = cell.date && key === todayKey;
            return (
              <button
                key={key}
                disabled={!cell.date}
                onClick={() => cell.date && setSelected(key)}
                className={`min-h-[88px] md:min-h-[110px] p-2 text-left border-r border-b border-black/5 dark:border-white/5 transition ${cell.date ? "hover:bg-black/[0.03] dark:hover:bg-white/[0.03]" : "bg-black/[0.02] dark:bg-white/[0.02]"}`}
              >
                {cell.date && (
                  <>
                    <div className={`text-xs ${isToday ? "inline-flex items-center justify-center w-6 h-6 rounded-full bg-black text-white dark:bg-white dark:text-black font-medium" : "text-black/70 dark:text-white/70"}`}>{cell.date.getDate()}</div>
                    <div className="mt-1 space-y-0.5">
                      {list.slice(0, 3).map((e, idx) => (
                        <div key={idx} className="text-[10px] leading-tight truncate rounded px-1.5 py-0.5" style={{ background: (e.color || "#a78bfa") + "22", color: e.color || "#a78bfa" }}>
                          {e.label}
                        </div>
                      ))}
                      {list.length > 3 && <div className="text-[10px] text-black/40 dark:text-white/40">+{list.length - 3} more</div>}
                    </div>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {loading && <div className="text-xs text-black/40 dark:text-white/40">Loading…</div>}

      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex justify-end"
            onClick={() => setSelected(null)}
          >
            <motion.div
              initial={{ x: 400 }} animate={{ x: 0 }} exit={{ x: 400 }} transition={{ type: "spring", stiffness: 250, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md h-full bg-white dark:bg-[#0a0a0a] border-l border-black/10 dark:border-white/10 p-6 overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-black/40 dark:text-white/40">Day</div>
                  <div className="text-xl font-semibold">{new Date(selected + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</div>
                </div>
                <button onClick={() => setSelected(null)} className="p-2 hover:opacity-70"><X className="w-4 h-4" /></button>
              </div>
              {selectedEntries.length === 0 ? (
                <div className="text-sm text-black/50 dark:text-white/50">Nothing scheduled.</div>
              ) : (
                <ul className="space-y-2">
                  {selectedEntries.map((e, i) => (
                    <li key={i}>
                      <Link href={e.link || "#"} className="card p-3 flex items-center gap-3 hover:bg-black/[0.03] dark:hover:bg-white/[0.03]">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: e.color || "#a78bfa" }} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm truncate">{e.label}</div>
                          <div className="text-[11px] uppercase tracking-wide text-black/40 dark:text-white/40">{e.kind}</div>
                        </div>
                        {e.amount !== undefined && (
                          <div className="text-sm font-medium tabular-nums">{formatCurrency(e.amount, currency)}</div>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
