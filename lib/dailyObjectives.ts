// Daily engagement: Daily Objectives.
//
// Three small, achievable things per person per day — a reason to open the
// app even when nothing's technically due. Clearing all three pays a bonus.
// Kept framework/DB-free; lib/dailyEngagement.ts derives each objective's
// "done" state from tables that already exist (no new completion-tracking
// table needed) and awards the bonus.

export type ObjectiveId = "chore" | "goal_checkin" | "cheer";

export type ObjectiveDef = {
  id: ObjectiveId;
  label: string;
  description: string;
  icon: string; // lucide name
};

export const DAILY_OBJECTIVES: ObjectiveDef[] = [
  { id: "chore", label: "Do a chore", description: "Complete any chore today.", icon: "CheckCheck" },
  { id: "goal_checkin", label: "Check in on a goal", description: "Vote or contribute to a household goal today.", icon: "HeartHandshake" },
  { id: "cheer", label: "Cheer someone", description: "Send a cheer to a household member today.", icon: "PartyPopper" },
];

export const DAILY_BONUS_CROWNS = 15;
export const DAILY_BONUS_XP = 10;

export type ObjectiveStatus = ObjectiveDef & { done: boolean };

export type DailyActivity = {
  choreDone: boolean;
  goalCheckin: boolean;
  cheered: boolean;
};

const ACTIVITY_KEY: Record<ObjectiveId, keyof DailyActivity> = {
  chore: "choreDone",
  goal_checkin: "goalCheckin",
  cheer: "cheered",
};

export function buildObjectiveStatuses(activity: DailyActivity): ObjectiveStatus[] {
  return DAILY_OBJECTIVES.map((o) => ({ ...o, done: activity[ACTIVITY_KEY[o.id]] }));
}

export function allObjectivesDone(statuses: ObjectiveStatus[]): boolean {
  return statuses.length > 0 && statuses.every((s) => s.done);
}

export function dateKey(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}
