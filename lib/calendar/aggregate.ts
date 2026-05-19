import { advanceDate } from "../recurring";

export type CalendarEntry = {
  date: string; // YYYY-MM-DD
  kind: "tx" | "recurring" | "sprintOpen" | "sprintClose" | "duelEnd" | "goalDeadline";
  label: string;
  amount?: number;
  link?: string;
  color?: string;
  id?: string;
};

export type RecurringInput = {
  id: string;
  amount: number;
  type: string;
  description: string;
  category: string;
  frequency: string;
  nextRunDate: Date;
  active: boolean;
};

export type TxInput = { id: string; amount: number; type: string; description: string; date: Date };
export type SprintInput = { id: string; duelId: string; startDate: Date; endDate: Date; weekNumber: number };
export type DuelInput = { id: string; title: string; endDate: Date };
export type GoalInput = { id: string; name: string; deadline: Date };

function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}

export function monthBounds(month: string): { start: Date; end: Date } {
  // month = "YYYY-MM"
  const [y, m] = month.split("-").map(Number);
  const start = new Date(y, (m || 1) - 1, 1);
  const end = new Date(y, (m || 1), 1);
  return { start, end };
}

export function projectRecurringIntoRange(rec: RecurringInput, start: Date, end: Date): Date[] {
  if (!rec.active) return [];
  const out: Date[] = [];
  let d = new Date(rec.nextRunDate);
  // wind back: if rec.nextRunDate is far in the future, we still want the first occurrence inside [start,end)
  // but only forward projection is needed per spec; advance if before start
  let guard = 0;
  while (d < start && guard++ < 4000) d = advanceDate(d, rec.frequency);
  guard = 0;
  while (d < end && guard++ < 4000) {
    out.push(new Date(d));
    d = advanceDate(d, rec.frequency);
  }
  return out;
}

export function aggregateMonth(opts: {
  month: string;
  transactions: TxInput[];
  recurring: RecurringInput[];
  sprints: SprintInput[];
  duels: DuelInput[];
  goals: GoalInput[];
}): CalendarEntry[] {
  const { start, end } = monthBounds(opts.month);
  const entries: CalendarEntry[] = [];

  // group tx by day, pick top 3 by amount per day downstream (we include all but mark color)
  const txByDay = new Map<string, TxInput[]>();
  for (const t of opts.transactions) {
    if (t.date < start || t.date >= end) continue;
    const k = ymd(t.date);
    const arr = txByDay.get(k) || [];
    arr.push(t);
    txByDay.set(k, arr);
  }
  for (const [k, list] of txByDay) {
    const sorted = [...list].sort((a, b) => b.amount - a.amount);
    for (const t of sorted) {
      entries.push({
        date: k,
        kind: "tx",
        label: t.description,
        amount: t.amount,
        link: `/dashboard/transactions`,
        color: t.type === "income" ? "#34d399" : "#f87171",
        id: t.id,
      });
    }
  }

  for (const r of opts.recurring) {
    const dates = projectRecurringIntoRange(r, start, end);
    for (const d of dates) {
      entries.push({
        date: ymd(d),
        kind: "recurring",
        label: r.description,
        amount: r.amount,
        link: `/dashboard/recurring`,
        color: r.type === "income" ? "#60a5fa" : "#fbbf24",
        id: r.id,
      });
    }
  }

  for (const s of opts.sprints) {
    if (s.startDate >= start && s.startDate < end) {
      entries.push({ date: ymd(s.startDate), kind: "sprintOpen", label: `Sprint ${s.weekNumber} opens`, link: `/dashboard/duels/${s.duelId}`, color: "#a78bfa", id: s.id });
    }
    if (s.endDate >= start && s.endDate < end) {
      entries.push({ date: ymd(s.endDate), kind: "sprintClose", label: `Sprint ${s.weekNumber} closes`, link: `/dashboard/duels/${s.duelId}`, color: "#c084fc", id: s.id });
    }
  }

  for (const d of opts.duels) {
    if (d.endDate >= start && d.endDate < end) {
      entries.push({ date: ymd(d.endDate), kind: "duelEnd", label: `Duel ends: ${d.title}`, link: `/dashboard/duels/${d.id}`, color: "#ec4899", id: d.id });
    }
  }
  for (const g of opts.goals) {
    if (g.deadline >= start && g.deadline < end) {
      entries.push({ date: ymd(g.deadline), kind: "goalDeadline", label: `Goal deadline: ${g.name}`, link: `/dashboard/goals`, color: "#10b981", id: g.id });
    }
  }

  entries.sort((a, b) => a.date.localeCompare(b.date));
  return entries;
}
