export const DUEL_STATUS = ["PENDING", "ACTIVE", "COMPLETED", "ABANDONED"] as const;
export type DuelStatus = (typeof DUEL_STATUS)[number];

export const DUEL_SIDES = ["A", "B"] as const;
export type DuelSide = (typeof DUEL_SIDES)[number];

export const SPRINT_STATUS = ["ACTIVE", "CLOSED"] as const;
export type SprintStatus = (typeof SPRINT_STATUS)[number];

export const DUEL_EVENT_KINDS = [
  "CONTRIBUTION",
  "CHEER",
  "SPRINT_OPEN",
  "SPRINT_CLOSE",
  "BADGE",
  "DISPUTE",
  "INVITE",
  "STAKE_RESOLVED",
] as const;
export type DuelEventKind = (typeof DUEL_EVENT_KINDS)[number];

export const DISPUTE_STATUS = ["PENDING", "UPHELD", "CONCEDED", "EXPIRED"] as const;
export type DisputeStatus = (typeof DISPUTE_STATUS)[number];

export const SPRINT_LENGTHS = [3, 7, 14] as const;
export const STICKERS = ["fire", "flex", "crown", "clap", "tea", "snail", "goat", "100"] as const;
export type Sticker = (typeof STICKERS)[number];

export const BADGES = [
  "FIRST_BLOOD",
  "STREAK_7",
  "STREAK_14",
  "PERFECT_WEEK",
  "COMEBACK",
  "LANDSLIDE",
] as const;
export type Badge = (typeof BADGES)[number];
