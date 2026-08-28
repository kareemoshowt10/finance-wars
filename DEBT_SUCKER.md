# Debt Sucker

**Debt Sucker** is the unified product this codebase now builds toward: a
household finance app that's also a game. You track debt like a bank would —
including the debt your own family members owe each other — and the daily
grind of running a household (chores, who pays for what, what you're saving
up for) gets a scoreboard instead of a shrug.

## Where this came from

Three repos existed before this one converged:

- **finance-wars** (this repo) — a Next.js + Prisma web app for couples:
  shared households, bill splitting, a real ledger, debt-payoff mechanics
  ("Debt Bosses"), savings goals, achievements, duels. This became the base,
  since it already had most of the plumbing a household money app needs and
  ships as a web app everyone can open with a link — no install required.
- **chore-wars** — an Expo/React Native app with the chores half of the
  product: a chore board, an XP/Crowns economy, streaks, and a bounty board
  for uncovered chores. Its *mechanics* were ported into this codebase as new
  Prisma models and API routes (see below); the Expo app itself was not
  merged file-for-file, since the two apps don't share a framework, database
  layer, or server runtime. A README on its `claude/debt-sucker-app-design-*`
  branch points back here.
- **financewars** — empty; also pointed here.

## What "Household HQ" adds

Three linked systems, layered on top of the existing household/ledger code:

1. **Chores** (`Chore`, `ChoreCompletion`) — log a chore, earn Crowns (a new
   wallet currency) and XP, build a streak. A per-chore and household-wide
   leaderboard answers "who actually does the dishes" with data instead of
   an argument. See `lib/chores.ts`.
2. **The Bank** (`Loan`, `LoanPayment`) — one household member fronts another
   money for something specific, with an optional interest rate. Track the
   purpose, the balance, and who's paid down what — the "become the bank"
   framing from the product brief. See `lib/loans.ts`.
3. **Household Goals** (`HouseholdGoal`, `HouseholdGoalContribution`,
   `HouseholdGoalVote`) — pool money toward something you're saving for.
   Elective goals (a PS5, a pool) compete for votes and dollars; essential
   ones (a bathroom remodel) get flagged the moment they've gone 21+ days
   without a contribution, so the boring-but-necessary goal doesn't quietly
   die at the bottom of the list. See `lib/householdGoals.ts`.

All three are reachable from **Household HQ** in the dashboard nav
(`/dashboard/household`, `/chores`, `/bank`, `/goals`), and summarized on one
`/api/households/[hid]/pulse` endpoint for the overview page.

Crowns earned from chores can be spent directly into a Household Goal
(10 Crowns = $1 of contribution) via `/api/households/[hid]/goals/[id]/contribute`,
so the two systems reinforce each other: do the chores, fund the goal.

## Business model: three plans, gating what's already built

The path to a real business here is the straightforward one: charge for
Household HQ. Three plans — carried over unchanged from Chore Wars' original
pricing sketch — gate the features above instead of Chore Wars' original
bounty board / cash box:

| Plan | Price | Unlocks |
|---|---|---|
| Free | $0 | Up to 4 members, 5 active chores, 7-day leaderboard, 1 active loan (no interest), 1 active goal |
| Rhythm | $1/mo | Unlimited chores, full chore history, unlimited loans, 3 active goals, 12 members |
| Household HQ | $20/mo | Unlimited goals, interest-bearing loans, multiple households, 30 members |

See `lib/plans.ts` for the catalog and `lib/planEnforcement.ts` for where
each limit is actually checked (chore/loan/goal creation, invites, loan
interest, and the leaderboard's history range).

**Billing is Stripe, with a dev-mode fallback** (`lib/billing.ts`): with no
`STRIPE_SECRET_KEY` set, "upgrading" a household sets its plan directly —
no charge, no Stripe account needed — so the whole paywall is testable
today. Set `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `STRIPE_PRICE_RHYTHM`
/ `STRIPE_PRICE_HOUSEHOLD_HQ` (see `.env.example`) to start charging for
real; `/api/billing/webhook` keeps `Household.plan` in sync with Stripe from
then on. Manage a plan from **Billing & Plan** in the dashboard nav
(`/dashboard/billing`) — restricted to the household's `OWNER`.

## Everything else

The rest of this repo — accounts, transactions, budgets, insights, Duels,
Squads, the couples tools — is unchanged and still applies; Household HQ is
additive. See `HANDOFF.md` for deploy/environment details.
