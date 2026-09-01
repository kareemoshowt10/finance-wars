"use client";

/**
 * A tap that actually feels like something. Android + most mobile browsers
 * support the Vibration API; iOS Safari doesn't, so this silently no-ops
 * there — the visual feedback still lands, this is a bonus, not the point.
 */
export function haptic(pattern: number | number[] = 10) {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {
    // never let a haptics call break the action it's decorating
  }
}

/** A little more emphatic — for the daily-bonus / achievement moment. */
export function celebrationHaptic() {
  haptic([12, 40, 12]);
}
