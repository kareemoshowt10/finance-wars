"use client";
import { useMemo, useState } from "react";
import { Globe } from "lucide-react";
import Modal from "../../_components/Modal";

/** Enough of a spread to be useful if the runtime can't enumerate zones for us. */
const FALLBACK_ZONES = [
  "UTC",
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Athens",
  "Africa/Lagos",
  "Africa/Johannesburg",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Pacific/Auckland",
];

function allZones(): string[] {
  const supported = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf;
  try {
    const zones = supported?.("timeZone");
    if (zones && zones.length) return zones;
  } catch {
    // fall through to the shortlist
  }
  return FALLBACK_ZONES;
}

function deviceZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/**
 * Where the household lives, which is really "when does our day end" — it
 * drives the streak rollover, whether a chore reads as due today, and when
 * the evening nudge goes out.
 */
export default function TimezoneSetting({ hid, timezone, onSaved }: { hid: string; timezone: string; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(timezone);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const zones = useMemo(allZones, []);

  const localTime = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(undefined, { timeZone: timezone, hour: "numeric", minute: "2-digit" }).format(new Date());
    } catch {
      return null;
    }
  }, [timezone]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/households/${hid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timezone: value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save");
      setOpen(false);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        onClick={() => { setValue(timezone); setOpen(true); }}
        className="block text-left text-[11px] leading-5 py-1 text-black/40 dark:text-white/40 hover:text-black/70 dark:hover:text-white/70 transition"
      >
        <Globe className="w-3 h-3 inline align-[-1px] mr-1" />
        Day ends at midnight in {timezone.replace(/_/g, " ")}
        {localTime && <span className="opacity-70">{"\u00a0· "}{localTime} there now</span>}
      </button>

      {open && (
        <Modal onClose={() => setOpen(false)} title="Household timezone">
          <div className="space-y-4">
            <p className="text-sm text-black/60 dark:text-white/60">
              Sets when your day rolls over — the streak, whether a chore counts as done today,
              and when the evening nudge goes out.
            </p>
            <div>
              <label htmlFor="tz-select" className="text-xs text-black/50 dark:text-white/50">Timezone</label>
              <select id="tz-select" className="input mt-1" value={value} onChange={(e) => setValue(e.target.value)}>
                {!zones.includes(value) && <option value={value}>{value}</option>}
                {zones.map((z) => (
                  <option key={z} value={z}>{z.replace(/_/g, " ")}</option>
                ))}
              </select>
            </div>
            <button type="button" onClick={() => setValue(deviceZone())} className="btn-ghost text-sm">
              Use this device&apos;s timezone ({deviceZone().replace(/_/g, " ")})
            </button>
            {error && <div className="text-sm text-red-400">{error}</div>}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setOpen(false)} className="btn-ghost">Cancel</button>
              <button onClick={save} disabled={saving} className="btn-primary">{saving ? "Saving…" : "Save"}</button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
