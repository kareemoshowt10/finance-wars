import { prisma } from "./prisma";

// ============================================================================
// Capture Engine — docs/capture-engine/SPEC.md
//
// The Compound Effect design constraint, verbatim from the spec: logging a
// transaction takes under 5 seconds, and no field is required if it can be
// inferred, defaulted, or skipped. Amount + a few words is the entire input.
// Everything else — category, date, account — is guessed or defaulted, never
// blocking. Corrections teach a per-user override memory; repetition becomes
// a one-tap pattern. All entries land in the same Transaction table that
// powers Debt Bosses, Vice Tax, Budgets, Raids, and the Weekly Recap — one
// habit feeding the whole app.
// ============================================================================

export type CaptureKind = "expense" | "income";

export type ParsedEntry = {
  amountCents: number;   // integer cents — no float drift across thousands of entries
  amount: number;        // dollars, exact to 2dp (amountCents / 100)
  description: string;
};

export type CategoryGuess = {
  category: string;
  confidence: number;    // 0..1
  via: "override" | "dictionary" | "fallback";
};

// ---------------------------------------------------------------------------
// Parsing: "5.50 coffee", "$1,200 rent", "coffee 5.50" all work.
// ---------------------------------------------------------------------------

const AMOUNT_RE = /(?:\$\s*)?(\d{1,3}(?:,\d{3})*|\d+)(?:\.(\d{1,2}))?/;

export function parseQuickEntry(input: string): ParsedEntry | { error: string } {
  const text = input.trim();
  if (!text) return { error: "Type an amount and a couple of words." };

  const m = text.match(AMOUNT_RE);
  if (!m) return { error: "Couldn't find an amount." };

  const whole = m[1].replace(/,/g, "");
  const frac = (m[2] ?? "").padEnd(2, "0");
  const amountCents = parseInt(whole, 10) * 100 + (frac ? parseInt(frac, 10) : 0);
  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    return { error: "Amount has to be more than zero." };
  }

  // Description = everything except the matched amount token.
  const description = (text.slice(0, m.index) + " " + text.slice((m.index ?? 0) + m[0].length))
    .replace(/\s+/g, " ")
    .trim();

  return { amountCents, amount: amountCents / 100, description };
}

// ---------------------------------------------------------------------------
// Dictionary categorizer (v1 — no ML, per spec). Keywords map onto the app's
// existing category labels so budgets, Vice Tax, and reports keep working
// unchanged. Merchant names score higher than generic words.
// ---------------------------------------------------------------------------

type DictEntry = { category: string; confidence: number };

const EXPENSE_DICT: Record<string, DictEntry> = {
  // Food & Dining
  coffee: { category: "Food & Dining", confidence: 0.85 },
  starbucks: { category: "Food & Dining", confidence: 0.92 },
  dunkin: { category: "Food & Dining", confidence: 0.92 },
  lunch: { category: "Food & Dining", confidence: 0.85 },
  dinner: { category: "Food & Dining", confidence: 0.85 },
  breakfast: { category: "Food & Dining", confidence: 0.85 },
  restaurant: { category: "Food & Dining", confidence: 0.85 },
  pizza: { category: "Food & Dining", confidence: 0.85 },
  doordash: { category: "Food & Dining", confidence: 0.92 },
  ubereats: { category: "Food & Dining", confidence: 0.92 },
  grubhub: { category: "Food & Dining", confidence: 0.92 },
  mcdonalds: { category: "Food & Dining", confidence: 0.92 },
  chipotle: { category: "Food & Dining", confidence: 0.92 },
  takeout: { category: "Food & Dining", confidence: 0.85 },
  drinks: { category: "Food & Dining", confidence: 0.8 },
  bar: { category: "Food & Dining", confidence: 0.7 },
  beer: { category: "Food & Dining", confidence: 0.8 },
  // Groceries
  groceries: { category: "Groceries", confidence: 0.9 },
  grocery: { category: "Groceries", confidence: 0.9 },
  costco: { category: "Groceries", confidence: 0.85 },
  walmart: { category: "Groceries", confidence: 0.7 },
  aldi: { category: "Groceries", confidence: 0.92 },
  kroger: { category: "Groceries", confidence: 0.92 },
  safeway: { category: "Groceries", confidence: 0.92 },
  traderjoes: { category: "Groceries", confidence: 0.92 },
  wholefoods: { category: "Groceries", confidence: 0.9 },
  // Transport
  gas: { category: "Transport", confidence: 0.85 },
  fuel: { category: "Transport", confidence: 0.85 },
  shell: { category: "Transport", confidence: 0.85 },
  chevron: { category: "Transport", confidence: 0.9 },
  uber: { category: "Transport", confidence: 0.85 },
  lyft: { category: "Transport", confidence: 0.92 },
  parking: { category: "Transport", confidence: 0.9 },
  toll: { category: "Transport", confidence: 0.9 },
  bus: { category: "Transport", confidence: 0.8 },
  train: { category: "Transport", confidence: 0.75 },
  oil: { category: "Transport", confidence: 0.6 },
  // Housing
  rent: { category: "Housing", confidence: 0.95 },
  mortgage: { category: "Housing", confidence: 0.95 },
  hoa: { category: "Housing", confidence: 0.9 },
  repair: { category: "Housing", confidence: 0.6 },
  plumber: { category: "Housing", confidence: 0.85 },
  // Bills & Utilities
  electric: { category: "Bills & Utilities", confidence: 0.9 },
  electricity: { category: "Bills & Utilities", confidence: 0.9 },
  water: { category: "Bills & Utilities", confidence: 0.7 },
  internet: { category: "Bills & Utilities", confidence: 0.9 },
  wifi: { category: "Bills & Utilities", confidence: 0.85 },
  phone: { category: "Bills & Utilities", confidence: 0.8 },
  utilities: { category: "Bills & Utilities", confidence: 0.95 },
  netflix: { category: "Entertainment", confidence: 0.92 },
  spotify: { category: "Entertainment", confidence: 0.92 },
  hulu: { category: "Entertainment", confidence: 0.92 },
  subscription: { category: "Bills & Utilities", confidence: 0.7 },
  insurance: { category: "Bills & Utilities", confidence: 0.8 },
  // Shopping
  amazon: { category: "Shopping", confidence: 0.8 },
  target: { category: "Shopping", confidence: 0.75 },
  clothes: { category: "Shopping", confidence: 0.85 },
  shoes: { category: "Shopping", confidence: 0.85 },
  // Entertainment
  movie: { category: "Entertainment", confidence: 0.9 },
  movies: { category: "Entertainment", confidence: 0.9 },
  concert: { category: "Entertainment", confidence: 0.9 },
  game: { category: "Entertainment", confidence: 0.7 },
  golf: { category: "Entertainment", confidence: 0.85 },
  // Health
  pharmacy: { category: "Health", confidence: 0.9 },
  cvs: { category: "Health", confidence: 0.8 },
  walgreens: { category: "Health", confidence: 0.85 },
  doctor: { category: "Health", confidence: 0.9 },
  dentist: { category: "Health", confidence: 0.9 },
  gym: { category: "Health", confidence: 0.9 },
  haircut: { category: "Health", confidence: 0.85 },
  // Travel
  flight: { category: "Travel", confidence: 0.9 },
  hotel: { category: "Travel", confidence: 0.9 },
  airbnb: { category: "Travel", confidence: 0.92 },
  // Education
  tuition: { category: "Education", confidence: 0.92 },
  books: { category: "Education", confidence: 0.6 },
  course: { category: "Education", confidence: 0.75 },
  // Kids / pets → closest existing buckets
  daycare: { category: "Education", confidence: 0.75 },
  vet: { category: "Health", confidence: 0.75 },
  petfood: { category: "Groceries", confidence: 0.6 },
};

const INCOME_DICT: Record<string, DictEntry> = {
  paycheck: { category: "Salary", confidence: 0.92 },
  payroll: { category: "Salary", confidence: 0.92 },
  salary: { category: "Salary", confidence: 0.95 },
  paid: { category: "Salary", confidence: 0.5 },
  bonus: { category: "Salary", confidence: 0.8 },
  commission: { category: "Salary", confidence: 0.75 },
  freelance: { category: "Freelance", confidence: 0.92 },
  gig: { category: "Freelance", confidence: 0.85 },
  job: { category: "Freelance", confidence: 0.6 },
  client: { category: "Freelance", confidence: 0.75 },
  invoice: { category: "Freelance", confidence: 0.8 },
  drywall: { category: "Freelance", confidence: 0.8 },
  tutoring: { category: "Freelance", confidence: 0.85 },
  dividend: { category: "Investment", confidence: 0.92 },
  interest: { category: "Investment", confidence: 0.85 },
  refund: { category: "Other", confidence: 0.7 },
  reimbursement: { category: "Other", confidence: 0.75 },
  gift: { category: "Other", confidence: 0.75 },
  sold: { category: "Other", confidence: 0.6 },
};

export function normalizeToken(word: string): string {
  return word.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function guessFromDictionary(description: string, kind: CaptureKind): CategoryGuess {
  const dict = kind === "income" ? INCOME_DICT : EXPENSE_DICT;
  const tokens = description.split(/\s+/).map(normalizeToken).filter(Boolean);
  // Also try joined bigrams ("whole foods" → wholefoods, "trader joes" → traderjoes).
  const bigrams: string[] = [];
  for (let i = 0; i < tokens.length - 1; i++) bigrams.push(tokens[i] + tokens[i + 1]);

  let best: CategoryGuess | null = null;
  for (const t of [...bigrams, ...tokens]) {
    const hit = dict[t];
    if (hit && (!best || hit.confidence > best.confidence)) {
      best = { category: hit.category, confidence: hit.confidence, via: "dictionary" };
    }
  }
  if (best) return best;
  return {
    category: kind === "income" ? "Other" : "Other",
    confidence: 0.3,
    via: "fallback",
  };
}

// Personal override memory takes priority over the shipped dictionary.
export async function guessCategory(
  userId: string,
  description: string,
  kind: CaptureKind
): Promise<CategoryGuess> {
  const tokens = description.split(/\s+/).map(normalizeToken).filter(Boolean);
  if (tokens.length > 0) {
    const overrides = await prisma.categoryOverride.findMany({
      where: { userId, kind, keyword: { in: tokens } },
      orderBy: { hitCount: "desc" },
    });
    if (overrides[0]) {
      return { category: overrides[0].category, confidence: 0.95, via: "override" };
    }
  }
  return guessFromDictionary(description, kind);
}

// Correction loop: user changed the guessed category → remember every token
// of the description as a personal mapping, strongest-token-wins next time.
export async function recordCorrection(
  userId: string,
  description: string,
  kind: CaptureKind,
  correctedCategory: string
) {
  const tokens = [...new Set(description.split(/\s+/).map(normalizeToken).filter((t) => t.length >= 3))];
  for (const keyword of tokens.slice(0, 4)) {
    await prisma.categoryOverride.upsert({
      where: { userId_kind_keyword: { userId, kind, keyword } },
      update: { category: correctedCategory, hitCount: { increment: 1 } },
      create: { userId, kind, keyword, category: correctedCategory },
    });
  }
}

// ---------------------------------------------------------------------------
// Duplicate nudge: same user, same amount, same kind, within 10 minutes.
// Flag gently — two coffees is a Tuesday (spec), so never block.
// ---------------------------------------------------------------------------

export async function findPossibleDuplicate(
  userId: string,
  amount: number,
  kind: CaptureKind,
  windowMinutes = 10
) {
  const since = new Date(Date.now() - windowMinutes * 60_000);
  return prisma.transaction.findFirst({
    where: {
      userId,
      amount,
      type: kind === "income" ? "income" : "expense",
      createdAt: { gte: since },
    },
    orderBy: { createdAt: "desc" },
  });
}

// ---------------------------------------------------------------------------
// Recurring detection: once the same rough amount (±10%) and normalized
// description repeat twice, suggest saving it as a one-tap pattern.
// ---------------------------------------------------------------------------

export function normalizeDescription(d: string): string {
  return d.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
}

export async function maybeSuggestPattern(
  userId: string,
  kind: CaptureKind,
  description: string,
  amount: number,
  category: string
): Promise<{ suggested: boolean; patternId?: string }> {
  const norm = normalizeDescription(description);
  if (!norm) return { suggested: false };

  // Already have a pattern (suggested or confirmed) matching this entry?
  // Bump its usage instead of re-suggesting.
  const patterns = await prisma.capturePattern.findMany({ where: { userId, kind } });
  const match = patterns.find(
    (p) =>
      normalizeDescription(p.description) === norm &&
      Math.abs(p.amount - amount) <= Math.max(1, p.amount * 0.1)
  );
  if (match) {
    await prisma.capturePattern.update({
      where: { id: match.id },
      data: { timesUsed: { increment: 1 }, lastUsedAt: new Date(), amount },
    });
    return { suggested: false, patternId: match.id };
  }

  // Count prior similar transactions; ≥2 (including the one just saved) → suggest.
  const type = kind === "income" ? "income" : "expense";
  const recent = await prisma.transaction.findMany({
    where: { userId, type, date: { gte: new Date(Date.now() - 90 * 86_400_000) } },
    select: { description: true, amount: true },
    take: 500,
    orderBy: { date: "desc" },
  });
  const similar = recent.filter(
    (t) =>
      normalizeDescription(t.description) === norm &&
      Math.abs(t.amount - amount) <= Math.max(1, amount * 0.1)
  );
  if (similar.length >= 2) {
    const pattern = await prisma.capturePattern.create({
      data: { userId, kind, description, amount, category, timesUsed: similar.length },
    });
    return { suggested: true, patternId: pattern.id };
  }
  return { suggested: false };
}

// ---------------------------------------------------------------------------
// Default capture account: entry must never block on picking an account, so
// captures land in a lazily-created "Wallet" checking account.
// ---------------------------------------------------------------------------

export async function getCaptureAccount(userId: string) {
  const existing = await prisma.account.findFirst({
    where: { userId, name: "Wallet" },
  });
  if (existing) return existing;
  const any = await prisma.account.findFirst({
    where: { userId, type: "checking" },
    orderBy: { createdAt: "asc" },
  });
  if (any) return any;
  return prisma.account.create({
    data: { userId, name: "Wallet", type: "checking", balance: 0 },
  });
}

// ---------------------------------------------------------------------------
// Consistency — the spec's north star: days logged ÷ days active.
// ---------------------------------------------------------------------------

export async function getConsistency(userId: string, windowDays = 30) {
  const since = new Date(Date.now() - windowDays * 86_400_000);
  since.setHours(0, 0, 0, 0);
  const txs = await prisma.transaction.findMany({
    where: { userId, createdAt: { gte: since } },
    select: { createdAt: true },
  });
  const daysLogged = new Set(txs.map((t) => t.createdAt.toISOString().slice(0, 10))).size;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { createdAt: true } });
  const accountAgeDays = user
    ? Math.max(1, Math.ceil((Date.now() - user.createdAt.getTime()) / 86_400_000))
    : windowDays;
  const daysActive = Math.min(windowDays, accountAgeDays);

  // Current daily logging streak (consecutive days ending today or yesterday).
  const dayKeys = new Set(txs.map((t) => t.createdAt.toISOString().slice(0, 10)));
  let streak = 0;
  const cursor = new Date();
  if (!dayKeys.has(cursor.toISOString().slice(0, 10))) cursor.setDate(cursor.getDate() - 1);
  while (dayKeys.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return {
    daysLogged,
    daysActive,
    rate: daysActive > 0 ? Math.round((daysLogged / daysActive) * 100) / 100 : 0,
    streak,
  };
}
