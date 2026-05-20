export type AchievementDef = {
  slug: string;
  name: string;
  description: string;
  icon: string; // lucide name
  xp: number;
  category: "savings" | "streaks" | "duel" | "insights" | "social" | "setup";
  tier: 1 | 2 | 3 | 4;
};

export const ACHIEVEMENTS: AchievementDef[] = [
  // setup
  { slug: "first-account", name: "First Account", description: "Add your first account.", icon: "Wallet", xp: 25, category: "setup", tier: 1 },
  { slug: "first-transaction", name: "First Transaction", description: "Record your first transaction.", icon: "Receipt", xp: 25, category: "setup", tier: 1 },
  { slug: "ten-tx", name: "Getting Going", description: "Log 10 transactions.", icon: "ListChecks", xp: 50, category: "setup", tier: 1 },
  { slug: "hundred-tx", name: "Power User", description: "Log 100 transactions.", icon: "Activity", xp: 150, category: "setup", tier: 2 },
  { slug: "diversified", name: "Diversified", description: "Hold 4 different account types.", icon: "PieChart", xp: 100, category: "setup", tier: 2 },
  { slug: "first-recurring", name: "Set & Forget", description: "Create your first recurring transaction.", icon: "Repeat", xp: 40, category: "setup", tier: 1 },
  { slug: "first-rule", name: "Rule Maker", description: "Create your first auto-categorization rule.", icon: "Filter", xp: 40, category: "setup", tier: 1 },
  { slug: "first-csv-import", name: "Importer", description: "Import transactions from CSV.", icon: "Upload", xp: 60, category: "setup", tier: 1 },
  { slug: "api-token", name: "Developer", description: "Create your first API token.", icon: "Key", xp: 50, category: "setup", tier: 1 },
  { slug: "cron-subscribed", name: "Automator", description: "Subscribe to a cron (dev).", icon: "Clock", xp: 30, category: "setup", tier: 1 },

  // savings
  { slug: "first-budget", name: "Budgeteer", description: "Create your first budget.", icon: "Target", xp: 40, category: "savings", tier: 1 },
  { slug: "under-budget-month", name: "On Track", description: "Stay under budget for a full month.", icon: "ShieldCheck", xp: 100, category: "savings", tier: 2 },
  { slug: "first-goal", name: "Goal Setter", description: "Create your first goal.", icon: "Flag", xp: 30, category: "savings", tier: 1 },
  { slug: "first-goal-reached", name: "Mission Accomplished", description: "Reach a savings goal.", icon: "Trophy", xp: 200, category: "savings", tier: 3 },
  { slug: "savings-rate-20", name: "Saver", description: "Hit 20% savings rate in a month.", icon: "PiggyBank", xp: 100, category: "savings", tier: 2 },
  { slug: "savings-rate-30", name: "Super Saver", description: "Hit 30% savings rate in a month.", icon: "PiggyBank", xp: 200, category: "savings", tier: 3 },
  { slug: "net-worth-10k", name: "Five Figures", description: "Reach $10k net worth.", icon: "TrendingUp", xp: 75, category: "savings", tier: 1 },
  { slug: "net-worth-50k", name: "Climbing", description: "Reach $50k net worth.", icon: "TrendingUp", xp: 150, category: "savings", tier: 2 },
  { slug: "net-worth-100k", name: "Six Figures", description: "Reach $100k net worth.", icon: "TrendingUp", xp: 300, category: "savings", tier: 4 },
  { slug: "stock-portfolio-10k", name: "Investor", description: "Hold $10k in your portfolio.", icon: "LineChart", xp: 150, category: "savings", tier: 2 },

  // streaks
  { slug: "streak-7", name: "Habit Forming", description: "Log in 7 days in a row.", icon: "Flame", xp: 50, category: "streaks", tier: 1 },
  { slug: "streak-30", name: "Disciplined", description: "Log in 30 days in a row.", icon: "Flame", xp: 200, category: "streaks", tier: 3 },

  // duel
  { slug: "first-duel", name: "Challenger", description: "Start your first duel.", icon: "Swords", xp: 50, category: "duel", tier: 1 },
  { slug: "first-sprint-won", name: "Sprint Champion", description: "Win your first sprint.", icon: "Medal", xp: 75, category: "duel", tier: 1 },
  { slug: "first-duel-won", name: "Victor", description: "Win your first duel.", icon: "Trophy", xp: 250, category: "duel", tier: 3 },
  { slug: "sparring-won", name: "Sparring Champ", description: "Beat the practice opponent.", icon: "Dumbbell", xp: 40, category: "duel", tier: 1 },

  // insights
  { slug: "used-insights", name: "Curious Mind", description: "Visit the Insights page.", icon: "Sparkles", xp: 25, category: "insights", tier: 1 },
  { slug: "used-coach", name: "Coach's Student", description: "Ask the coach a question.", icon: "MessageCircle", xp: 25, category: "insights", tier: 1 },
  { slug: "used-scenarios", name: "Forecaster", description: "Run a scenario simulation.", icon: "Activity", xp: 25, category: "insights", tier: 1 },

  // social
  { slug: "invited-friend", name: "Recruiter", description: "Invite someone to a duel.", icon: "UserPlus", xp: 40, category: "social", tier: 1 },

  // vice tax + debt boss
  { slug: "first-vice-tax", name: "Self-Imposed Tax", description: "Set up your first Vice Tax.", icon: "Flame", xp: 40, category: "savings", tier: 1 },
  { slug: "vice-tax-100", name: "Pleasure Tithe", description: "Funnel $100 in vice taxes into a goal.", icon: "PiggyBank", xp: 100, category: "savings", tier: 2 },
  { slug: "first-debt-ko", name: "First Blood", description: "Defeat your first debt boss.", icon: "Swords", xp: 150, category: "savings", tier: 2 },
  { slug: "debt-free", name: "Debt Free", description: "Defeat every debt boss you've spawned.", icon: "Trophy", xp: 500, category: "savings", tier: 4 },
];

export const ACHIEVEMENTS_BY_SLUG: Record<string, AchievementDef> = Object.fromEntries(
  ACHIEVEMENTS.map((a) => [a.slug, a])
);

export function levelFromXp(xp: number) {
  const level = Math.min(50, Math.floor(Math.sqrt(xp / 100)));
  const nextLevel = level + 1;
  const xpForCurrent = level * level * 100;
  const xpForNext = nextLevel * nextLevel * 100;
  const into = xp - xpForCurrent;
  const span = Math.max(1, xpForNext - xpForCurrent);
  return {
    level,
    xpForCurrent,
    xpForNext,
    progress: Math.min(1, into / span),
    capped: level >= 50,
  };
}
