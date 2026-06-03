import { prisma } from "./prisma";

// Goal Raids turn a short, ambitious goal into a named boss with backstory.
// They are intentionally gated to short timeframes + meaningful targets so the
// "raid" framing stays high-stakes rather than applying to every sleepy goal.

export const RAID_THEMES = ["DRAGON", "TITAN", "KRAKEN", "WARLORD", "VAULT"] as const;
export type RaidTheme = (typeof RAID_THEMES)[number];

type ThemeCopy = {
  title: string;
  bossNames: string[];
  lore: (goalName: string, target: string, days: number) => string;
  // Narrative beats keyed by HP-destroyed percentage threshold.
  stages: { at: number; line: string }[];
};

const THEME_COPY: Record<RaidTheme, ThemeCopy> = {
  DRAGON: {
    title: "the Hoard-Keeper",
    bossNames: ["Vael'goth", "Ashmaw", "Pyrrhus", "Cindervex"],
    lore: (g, t, d) =>
      `A dragon coils atop the ${t} you need for ${g}. It has ${d} days of patience and infinite greed. Every dollar you stash is a scale pried loose. Strip it bare before the moon turns.`,
    stages: [
      { at: 0, line: "The dragon stirs. It has not seen a challenger in years." },
      { at: 25, line: "First scales fall. It notices you now." },
      { at: 50, line: "Half its armor is gone. It roars — the deadline trembles." },
      { at: 75, line: "Exposed and furious. One more push." },
      { at: 100, line: "The hoard is yours. The dragon is ash." },
    ],
  },
  TITAN: {
    title: "the Unmoving",
    bossNames: ["Karathul", "Monnos", "Greywall", "The Sentinel"],
    lore: (g, t, d) =>
      `A titan blocks the road to ${g}, demanding ${t} in tribute within ${d} days. It cannot be reasoned with — only worn down, blow by blow, deposit by deposit.`,
    stages: [
      { at: 0, line: "The titan blocks the pass. Immovable." },
      { at: 25, line: "Cracks spider across its stone hide." },
      { at: 50, line: "It buckles to one knee." },
      { at: 75, line: "Crumbling. The road ahead is almost clear." },
      { at: 100, line: "The titan falls. The path to your goal is open." },
    ],
  },
  KRAKEN: {
    title: "of the Deep",
    bossNames: ["Nethys", "Maelstrom", "Old Drown", "Tidewrack"],
    lore: (g, t, d) =>
      `The kraken drags your ${g} into the depths, ${t} sinking with it. You have ${d} days before it's lost to the trench. Sever a tentacle with every contribution.`,
    stages: [
      { at: 0, line: "Tentacles breach the surface. The water goes black." },
      { at: 25, line: "One tentacle severed. It shrieks beneath the waves." },
      { at: 50, line: "The beast surfaces, wounded and thrashing." },
      { at: 75, line: "Barely clinging to the deep." },
      { at: 100, line: "The kraken sinks for good. Your treasure rises." },
    ],
  },
  WARLORD: {
    title: "the Relentless",
    bossNames: ["General Vrax", "Iron Mira", "The Marshal", "Korr the Debt-Lord"],
    lore: (g, t, d) =>
      `A warlord has laid siege to your ${g}, holding ${t} hostage behind ${d} days of walls. This is a campaign. Every payment is ground retaken.`,
    stages: [
      { at: 0, line: "The siege begins. Their banners fly high." },
      { at: 25, line: "Outer walls breached. Momentum is yours." },
      { at: 50, line: "The courtyard is taken. They retreat inward." },
      { at: 75, line: "The keep is surrounded." },
      { at: 100, line: "The warlord surrenders. The campaign is won." },
    ],
  },
  VAULT: {
    title: "the Sealed",
    bossNames: ["The Mechanism", "Cipher-9", "The Last Lock", "Strongbox Prime"],
    lore: (g, t, d) =>
      `Your ${g} sits behind a vault holding ${t}, sealed with ${d} days on the timer. No brute force — only the steady click of tumblers falling, one contribution at a time.`,
    stages: [
      { at: 0, line: "The vault is sealed. The timer counts down." },
      { at: 25, line: "First tumbler falls. Click." },
      { at: 50, line: "Half the locks released." },
      { at: 75, line: "The final mechanism engages." },
      { at: 100, line: "The vault swings open. It's all yours." },
    ],
  },
};

export function pickTheme(goalName: string): RaidTheme {
  const n = goalName.toLowerCase();
  if (/debt|card|loan|payoff|owe/.test(n)) return "WARLORD";
  if (/house|home|down ?payment|car|wedding|ring/.test(n)) return "TITAN";
  if (/trip|travel|vacation|holiday|escape/.test(n)) return "KRAKEN";
  if (/emergency|safe|fund|cushion|rainy/.test(n)) return "VAULT";
  return "DRAGON";
}

export function fmtMoney(n: number) {
  return `$${Math.round(n).toLocaleString()}`;
}

// Eligibility: short timeframe (<= 180 days out) and a target worth fighting for.
export function isRaidEligible(deadline: Date, targetAmount: number, now: Date = new Date()) {
  const days = Math.ceil((deadline.getTime() - now.getTime()) / 86_400_000);
  return days > 0 && days <= 180 && targetAmount >= 500;
}

export function daysRemaining(deadline: Date, now: Date = new Date()) {
  return Math.max(0, Math.ceil((deadline.getTime() - now.getTime()) / 86_400_000));
}

// Required daily/weekly pace to win, given current progress.
export function raidPace(target: number, current: number, deadline: Date, now: Date = new Date()) {
  const remaining = Math.max(0, target - current);
  const days = Math.max(1, daysRemaining(deadline, now));
  return {
    remaining,
    perDay: Math.round((remaining / days) * 100) / 100,
    perWeek: Math.round((remaining / days) * 7 * 100) / 100,
    days,
  };
}

export function stageFor(theme: RaidTheme, pctComplete: number) {
  const stages = THEME_COPY[theme].stages;
  let current = stages[0];
  let index = 0;
  for (let i = 0; i < stages.length; i++) {
    if (pctComplete >= stages[i].at) {
      current = stages[i];
      index = i;
    }
  }
  return { index, line: current.line, atPct: current.at };
}

export function buildBoss(goalName: string, theme: RaidTheme, target: number, deadline: Date, now: Date = new Date()) {
  const copy = THEME_COPY[theme];
  const bossName = copy.bossNames[Math.floor(Math.random() * copy.bossNames.length)];
  const days = daysRemaining(deadline, now);
  return {
    bossName,
    bossTitle: copy.title,
    lore: copy.lore(goalName, fmtMoney(target), days),
  };
}

export function themeCopy(theme: RaidTheme) {
  return THEME_COPY[theme];
}

// Recompute raid status against the live goal and advance narrative stage.
export async function syncRaid(raidId: string) {
  const raid = await prisma.goalRaid.findUnique({ where: { id: raidId }, include: { goal: true } });
  if (!raid) return null;

  const current = raid.goal.currentAmount;
  const pct = raid.targetAmount > 0
    ? Math.max(0, Math.min(100, Math.round(((current - raid.startAmount) / (raid.targetAmount - raid.startAmount)) * 100)))
    : 0;

  const theme = raid.theme as RaidTheme;
  const stage = stageFor(theme, pct);
  const now = new Date();
  const expired = now > raid.deadline;

  let status = raid.status;
  let defeatedAt = raid.defeatedAt;
  if (current >= raid.targetAmount && status === "ACTIVE") {
    status = "DEFEATED";
    defeatedAt = now;
  } else if (expired && status === "ACTIVE") {
    status = "EXPIRED";
  }

  if (status !== raid.status || stage.index !== raid.lastStage || defeatedAt !== raid.defeatedAt) {
    await prisma.goalRaid.update({
      where: { id: raid.id },
      data: { status, defeatedAt, lastStage: stage.index },
    });
  }

  return { raid, current, pct, stage, status, theme };
}
