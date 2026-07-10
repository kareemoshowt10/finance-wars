# Finance Wars — Income & Expense Capture Engine

*First written spec for this layer — built for the finance-wars project's Supabase/Postgres stack. No prior spec found to reconcile with. Note: no live Supabase project is provisioned yet under this account — the schema below is ready to run locally via the Supabase CLI or against a project once one exists.*

## Problem statement

Every personal finance app fails the same way: people stop logging, and everything downstream — categorization, insights, goal tracking — runs on stale or missing data. *The Compound Effect* (Darren Hardy — not Dan Hardy, who's the UFC welterweight) argues small actions only produce outsized results when repeated consistently, and consistency only survives when the action is nearly effortless. That's the literal design constraint here, not a marketing peg: a weekly insight report is worthless if entries stop after week two.

**Working rule for every screen below:** logging a transaction takes under 5 seconds, and no field is required if it can be inferred, defaulted, or skipped.

## Goals

*(Starting targets — treat as hypotheses to revisit once real usage data exists, not settled benchmarks.)*

- ≥90% of transactions logged same-day — the actual test of "no friction"
- Median time-to-log under 5 seconds
- Under 20% of entries need a category correction by a user's third week — proof the learning loop is working
- Every field the Finance Wars weekly report will eventually need already exists in these two tables at MVP — zero backfill later

## Non-goals

- The Finance Wars weekly report/dashboard UI itself — separate deliverable, though several fields below exist specifically to support it
- Couples goal-setting and competitive mechanics (the "war" part of Finance Wars) — separate deliverable
- Budgeting or forecasting on top of the captured data — this layer is about capture, not analysis

## User stories

- As someone who just bought a coffee, I want to log the expense in under 5 seconds without picking a category myself, so logging doesn't become a chore I eventually skip.
- As someone who just got paid for a same-day hourly job, I want logging income to be exactly as fast as logging an expense, so income tracking gets the same consistency as spending.
- As a returning user, I want my regular transactions (payroll, my usual grocery run) to become one-tap after the first couple of times, so the app gets faster the longer I use it.
- As a partner in a household, I want some purchases to stay private and others to count toward our shared picture, so tracking money doesn't feel like surveillance.
- *(Future)* As a couple, we want our combined weekly picture to show whether this week moved us toward or away from our shared goal.

## Log an Expense — the flow

1. Quick-add reachable in one tap from anywhere in the app.
2. Type or speak amount + a couple words: "5.50 coffee."
3. The instant typing stops, the app guesses a category and shows it as a pre-filled, tap-to-change chip — it never blocks on the guess being right.
4. Date defaults to now. Payment method, notes, receipt photo (later), and "split with partner" all live behind an optional "details" disclosure, never in the main path.
5. Save fires on the amount entry itself (or a lightweight confirm + "undo" toast). Nothing sits between "I spent money" and "it's logged" except the number.

## Log Income — the flow

Same shape: "140 drywall job" → amount + description → auto-categorized as Hourly/Gig → date defaults to today → saved.

For recurring income specifically: once the same rough amount, interval, and description repeat twice, offer to save it as a pattern ("Is this your regular paycheck?"). From then on, payday logging is a single tap instead of a re-typed entry.

## Input edge cases worth handling explicitly

- **Zero/blank amount:** block save with a small inline nudge, not a modal.
- **Decimal precision:** display to 2 decimal places regardless of what's typed; store as integer cents so rounding doesn't drift across thousands of entries.
- **Sign errors:** expense vs. income is determined by which quick-add button was tapped, not a +/− the user types — there's no way to fat-finger the sign.
- **Accidental duplicates:** same amount, same user, within a short window — flag gently ("logged twice?") rather than auto-block, since real duplicates happen (two coffees is a Tuesday).

## Auto-categorization system

- **v1, no ML infrastructure needed:** a keyword/merchant dictionary plus rules, shipped with common mappings (Starbucks → Dining & Drinks, Shell → Transportation) and the taxonomy below.
- **Confidence + correction loop:** every guess carries a confidence score. Corrections are stored two ways — immediately as a personal override, and in aggregate (anonymized) to sharpen the default model for everyone. Accuracy should climb fast in a user's first few weeks.
- **Forward-compatible with the paid photo tier:** the categorizer takes "text description + amount" as input now. OCR receipt text is just a richer version of the same input later — an additive input method, not a second system to build.

## Data model

Expense and income share a shape on purpose — it makes the weekly report's math trivial later: net = income − expense, both filterable identically. Needs two supporting tables (`households`, `household_members`) plus the two transaction tables — full runnable DDL is in `finance-wars-income-expense-schema.sql`, alongside this doc.

**expenses:** `id, user_id, household_id (nullable), amount_cents, currency, category, subcategory (optional), raw_description, category_confidence, is_recurring, recurrence_rule (nullable), visibility (personal | shared), source (manual | receipt_scan | import), notes (optional), occurred_at, created_at, updated_at`

**income:** `id, user_id, household_id (nullable), amount_cents, currency, income_type (salary | hourly_gig | bonus_commission | reimbursement | investment | gift | other), raw_description, category_confidence, is_recurring, recurrence_rule (nullable), visibility (personal | shared), source, notes, occurred_at, created_at, updated_at`

## Starter taxonomy

**Expense:** Housing · Utilities · Groceries · Dining & Drinks · Transportation · Debt Payments · Subscriptions · Shopping · Health & Personal Care · Entertainment · Kids/Pets · Savings & Transfers · Miscellaneous

**Income:** Salary/Payroll · Hourly/Gig/Freelance · Bonus/Commission · Reimbursement · Investment/Interest · Gift · Other

Keep this short at launch. Hardy's point about sustainable habits cuts both ways: a system simple enough to survive beats a taxonomically perfect one that feels like homework. Subcategories can come later.

## Why these fields matter once Finance Wars reads from them

- `visibility` is what lets a household dashboard show combined totals without forcing every purchase into a joint view.
- `occurred_at` + `is_recurring` are what let the weekly report separate baseline spend from discretionary and plot an actual trend line — the real "compound effect" visual: not "you spent $412 this week" but the trajectory if that keeps compounding.
- `category_confidence`, invisible to users now, is what eventually justifies surfacing "double-check these three" instead of quietly letting bad guesses erode trust in the report.

## Requirements

### Must have (MVP)
- Manual text entry for both flows; amount + free-text description are the only required fields
- Instant category guess, shown as an editable chip, never blocking save
- Personal correction memory (per-user overrides persist and take priority over defaults)
- Recurring detection after 2 matching entries, surfaced as a one-tap suggestion
- `visibility` field on every row, defaulting to personal
- Edge-case handling from above (zero-amount block, integer-cent storage, duplicate nudge)

### Should have (fast follow)
- Voice-to-text entry, using the same parsing pipeline as text — closes a real friction gap (driving, hands full) for a fraction of the cost of receipt scanning, and is worth sequencing *before* the paid tier
- Aggregate (anonymized) correction data improving the global default categorization model

### Could have (v1.2, paid tier)
- Photo/document capture with OCR, feeding the same categorization pipeline as a second input method
- Itemized receipt splitting into multiple categorized lines — a real upsell ("your $84 Target run was $31 groceries + $53 household"), not just convenience

### Won't have (this phase, deliberately)
- Bank/card linking (Plaid-style auto-import) — entry stays manual/voice/photo-parsed only. Keeps the security and compliance surface small while the core habit-loop is still unproven; revisit once retention data justifies the lift.
- The Finance Wars weekly report UI and couples goal mechanics — separate deliverables (see Non-goals)

## Success metrics

### Leading (days–weeks)
- Consistency rate — days logged ÷ days active. Given the compound-effect thesis, this is the actual north star; everything else is downstream of it.
- Median time-to-log per entry
- Category-correction rate, trending down week over week

### Lagging (weeks–months)
- Week-2 and week-4 retention on logging behavior specifically, not just app opens
- Conversion into the paid photo tier — no target yet; set this once MVP usage data exists rather than guessing now

## Decisions log

- **Household visibility — decided:** shared-only. A partner can read a row only when it's explicitly marked `visibility = 'shared'` and both people belong to the same household; everything else is private by default, no exceptions. Implemented as Postgres Row Level Security — a partner's read policy checks `visibility = 'shared'` **and** shared household membership, never a blanket household match. See `finance-wars-income-expense-schema.sql`.
- **Not yet decided:** the partner invite/accept flow (how two users actually become linked as a household) isn't designed. The schema supports it (`households` / `household_members`), but there are no write policies on those tables yet — deliberately, so nobody can add themselves to a household without an invite step that doesn't exist yet. Worth a short spec of its own before the couples layer ships.
