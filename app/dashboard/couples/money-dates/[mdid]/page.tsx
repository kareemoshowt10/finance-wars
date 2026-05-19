"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check, Clock, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

export default function MoneyDateRoom() {
  const params = useParams<{ mdid: string }>();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [decisions, setDecisions] = useState<Record<string, string>>({});
  const [hid, setHid] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    fetch("/api/households").then((r) => r.json()).then(async (hh) => {
      if (!hh.length) return;
      const found = (await Promise.all(hh.map(async (h: any) => {
        const res = await fetch(`/api/households/${h.id}/money-dates/${params.mdid}/agenda`);
        if (res.ok) return { hid: h.id, data: await res.json() };
        return null;
      }))).find(Boolean);
      if (found) { setHid(found.hid); setData(found.data); }
    });
  }, [params.mdid]);

  useEffect(() => {
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  if (!data) return <div className="text-sm text-black/40 dark:text-white/40">Loading…</div>;

  const md = data.moneyDate;
  const totalSecs = md.durationMin * 60;
  const progress = Math.min(100, (elapsed / totalSecs) * 100);

  async function complete() {
    if (!hid) return;
    setCompleting(true);
    await fetch(`/api/households/${hid}/money-dates/${md.id}/complete`, {
      method: "POST",
      body: JSON.stringify({ decisions }),
    });
    router.push("/dashboard/couples");
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-black/80 backdrop-blur-xl -mx-2 px-2 py-4 border-b border-black/5 dark:border-white/5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              <Calendar className="w-5 h-5" /> Money Date
            </h1>
            <div className="text-xs text-black/55 dark:text-white/55">{new Date(md.scheduledAt).toLocaleString()} · {md.cadence} · {md.durationMin} min</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-xs text-black/55 dark:text-white/55 flex items-center gap-1"><Clock className="w-3 h-3" /> {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")} elapsed</div>
          </div>
        </div>
        <div className="mt-2 h-1 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
          <motion.div className="h-full bg-gradient-to-r from-indigo-500 to-rose-500" animate={{ width: `${progress}%` }} />
        </div>
      </header>

      <p className="text-sm text-black/65 dark:text-white/65">{data.agenda.summary}</p>

      <div className="space-y-3">
        {data.agenda.sections.map((sec: any, i: number) => {
          const open = openSections[sec.title] ?? true;
          return (
            <div key={i} className="rounded-2xl border border-black/10 dark:border-white/10 overflow-hidden">
              <button onClick={() => setOpenSections((s) => ({ ...s, [sec.title]: !open }))} className="w-full px-5 py-4 flex items-center justify-between">
                <div className="text-sm font-semibold">{sec.title} <span className="text-xs text-black/40 dark:text-white/40">· {sec.items.length}</span></div>
                <ChevronDown className={cn("w-4 h-4 transition", open && "rotate-180")} />
              </button>
              <AnimatePresence>
                {open && (
                  <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                    <ul className="border-t border-black/5 dark:border-white/5 divide-y divide-black/5 dark:divide-white/5">
                      {sec.items.map((item: any, j: number) => {
                        const key = `${sec.title}:${j}`;
                        return (
                          <li key={key} className="px-5 py-3">
                            <div className="text-sm font-medium">{item.label}</div>
                            <div className="text-xs text-black/55 dark:text-white/55 mt-0.5">{item.body}</div>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {["Approve", "Defer", "Adjust budget", "Note"].map((act) => (
                                <button key={act} onClick={() => setDecisions((d) => ({ ...d, [key]: d[key] === act ? "" : act }))} className={cn("px-2.5 py-1 rounded-full text-[11px] border", decisions[key] === act ? "bg-black text-white dark:bg-white dark:text-black border-transparent" : "border-black/10 dark:border-white/15 text-black/60 dark:text-white/60")}>
                                  {act}
                                </button>
                              ))}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      <button onClick={complete} disabled={completing} className="w-full px-5 py-3 rounded-full bg-black text-white dark:bg-white dark:text-black text-sm font-medium flex items-center justify-center gap-2">
        <Check className="w-4 h-4" /> {completing ? "Saving…" : "Complete Money Date"}
      </button>
    </div>
  );
}
