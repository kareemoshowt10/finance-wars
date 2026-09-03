// Timezone-aware calendar helpers.
//
// The household streak, "is this chore due today", and the daily-objective
// reset all hinge on where one day ends and the next begins. Computing that
// in server-local time (which is UTC in production) means a household in Los
// Angeles rolls over at 4pm — so all of it runs in the household's own zone
// instead.
//
// Day keys ("YYYY-MM-DD") are the unit of work rather than timestamps, which
// sidesteps DST arithmetic: stepping a day is a calendar operation, not a
// "subtract 86400000ms" one (that's wrong twice a year).

export const DEFAULT_TIMEZONE = "UTC";

/** True if the runtime recognises this IANA zone — guards against bad stored values. */
export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * Undefined/empty means "use the system zone" (what the pure helpers did
 * before zones existed, so existing callers keep their behavior). A supplied
 * but unrecognised zone falls back to UTC rather than throwing — a bad value
 * in one household's row shouldn't 500 its dashboard.
 */
function resolveZone(tz?: string | null): string | undefined {
  if (!tz) return undefined;
  return isValidTimeZone(tz) ? tz : DEFAULT_TIMEZONE;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

type Wall = { year: number; month: number; day: number; hour: number; minute: number; second: number };

/** The wall-clock reading an instant shows in a zone. */
function wallClock(d: Date, timeZone?: string): Wall {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: resolveZone(timeZone),
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const out: Record<string, number> = {};
  for (const p of dtf.formatToParts(d)) {
    if (p.type !== "literal") out[p.type] = Number(p.value);
  }
  // Some ICU builds render midnight as hour 24 under hour12:false.
  if (out.hour === 24) out.hour = 0;
  return out as unknown as Wall;
}

/** The calendar day an instant falls on, in the given zone, as "YYYY-MM-DD". */
export function dayKey(d: Date, timeZone?: string): string {
  const w = wallClock(d, timeZone);
  return `${w.year}-${pad(w.month)}-${pad(w.day)}`;
}

/** Hour of day (0-23) an instant reads as in the given zone. */
export function hourInZone(d: Date, timeZone?: string): number {
  return wallClock(d, timeZone).hour;
}

/** Step a day key by whole calendar days. Anchored at noon so DST can't shift the date. */
export function addDays(key: string, delta: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d, 12) + delta * 86400000);
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

/** Day of week for a day key (0 = Sunday). */
export function weekdayOf(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay();
}

/** The key of the Sunday that starts the week containing `key`. */
export function weekStartKey(key: string): string {
  return addDays(key, -weekdayOf(key));
}

/** Whole days between two day keys (b - a). */
export function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd, 12) - Date.UTC(ay, am - 1, ad, 12)) / 86400000);
}

function offsetMs(d: Date, timeZone?: string): number {
  const w = wallClock(d, timeZone);
  return Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second) - d.getTime();
}

/**
 * The instant at which a calendar day begins in a zone — i.e. what to compare
 * stored UTC timestamps against for "today". Two passes so that days starting
 * on a DST boundary resolve to the right side of the jump.
 */
export function startOfDayInstant(key: string, timeZone?: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  const target = Date.UTC(y, m - 1, d, 0, 0, 0);
  let ts = target - offsetMs(new Date(target), timeZone);
  ts = target - offsetMs(new Date(ts), timeZone);
  return new Date(ts);
}

/** The instant "today" began, in the given zone. */
export function startOfToday(now: Date, timeZone?: string): Date {
  return startOfDayInstant(dayKey(now, timeZone), timeZone);
}
