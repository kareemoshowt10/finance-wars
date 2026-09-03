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

## Daily engagement: a reason to open the app every day

Four mechanics, layered on top of Household HQ, aimed squarely at daily
active use rather than "opens when a chore happens to be due":

1. **Household Streak** — not per-user. Consecutive days with at least one
   chore completion from *anyone* in the house. Breaks if nobody does
   anything, which puts social pressure on the group instead of just one
   person's habit. Computed on the fly from `ChoreCompletion` history
   (`lib/dailyEngagement.ts: getHouseholdStreak`), no new columns needed.
2. **Daily Objectives** — three small per-person quests that reset daily:
   do a chore, check in on a goal (vote or contribute), cheer someone.
   Clearing all three pays a one-time bonus (+15 Crowns, +10 XP) the moment
   the third one lands — awarded from inside whichever route completes it
   (`lib/dailyEngagement.ts: maybeAwardDailyBonus`), not a separate "claim"
   step. Each objective's "done" state is derived from existing tables
   (today's `ChoreCompletion` / `HouseholdGoalContribution` / vote / cheer),
   so there's no new completion-tracking table either.
3. **Cheer** (`HouseholdCheer`) — a one-tap reaction between household
   members. Gives people something to do on a day with no chores due, and
   it's the social/teamwork mechanic from the product brief made concrete.
4. **At-risk nudge** (`/api/cron/household-nudge`) — if a household has an
   active streak and nobody's logged a chore yet today, everyone gets one
   notification. The cron runs *hourly* and each household is nudged at 8pm
   **in its own timezone**, so a "do one before midnight" warning actually
   arrives with a few hours left rather than at lunchtime. Dedupes per
   household per local day via `Notification`'s `(userId, key)` unique
   constraint, same pattern used everywhere else.

All of it surfaces in one **Today** panel at the top of
`/dashboard/household` (`TodayPanel.tsx`) — the streak flame, the 3
objectives with checkmarks, a "send a cheer" button, and a small recent-
cheers feed. Logging a chore is **optimistic**: the card flips to Done, the
streak ticks and the leaderboard re-ranks on the tap itself (client-side via
`applyCompletionToLeaderboard`, which shares its sort with the server's
`buildLeaderboard`), then reconciles against the server response — or rolls
the completion back out and says why, if the write failed. New achievements
(`first-cheer`, `household-streak-7/30`, `first-perfect-day`, `perfect-week`)
reward the same behavior a second way.

### Whose midnight?

A streak is a claim about days, so the app has to know *whose* day. Every
household has a `timezone` (`Household.timezone`, default `UTC`), set from
the small "Day ends at midnight in …" control under the Today panel, and
every day boundary in Household HQ is computed against it: the household
streak, whether a chore reads as due today, whether a daily objective is
cleared, and when the evening nudge fires.

The primitives live in `lib/time.ts` and work on **day keys** (`"2026-09-03"`
strings in the household's zone) rather than timestamp arithmetic, because
adding 86,400,000ms across a DST transition lands on the wrong day and
quietly breaks a streak. `dayKey`, `addDays`, `daysBetween` and friends are
pure and unit-tested against Los Angeles' spring-forward and fall-back
boundaries, Tokyo, and invalid zone names (which fall back to UTC rather
than throwing). `lib/chores.ts` and `lib/dailyEngagement.ts` take an optional
`timeZone` and thread it down; API routes resolve it once per request via
`householdTimeZone(hid)` and hand it to every helper, and the chores view
gets it in the payload so client-side "due" and streak math agrees with the
server's.

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
