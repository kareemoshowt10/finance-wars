# Debt Sucker — Handoff & Deploy Notes

Last updated: 2026-08-28 · Branch: `claude/debt-sucker-app-design-jili0t`

This app was rebranded from **Finance Wars** to **Debt Sucker** and extended
with **Household HQ** (chores, family loans, shared goals). See
[`DEBT_SUCKER.md`](./DEBT_SUCKER.md) for what changed and why. Everything
below still applies unchanged.

## Where things stand

Debt Sucker is a Next.js (App Router) + Prisma/PostgreSQL household-finance
app and game — positioned for **serious, transparent households**: couples
building toward homeownership and car ownership, and families running chores,
family loans, and shared goals through the same ledger. Gamified mechanics
(Debt Bosses, Vice Tax, Goal Raids, Money Mind, Household HQ) drive
engagement; the public site uses the **Blueprint** design system
(architectural drafting-paper aesthetic).

- Build: `✓ Compiled successfully`, ~190 routes
- Tests: 216/216 passing (run `npm install` then `npm test`)
- TypeScript: clean (`npx tsc --noEmit`)

## Resume on another platform

```bash
git clone <repo> && cd finance-wars
npm install
cp .env.example .env   # then fill in the values below
npm run dev
```

## Required environment variables

| Var | Purpose |
|-----|---------|
| `DATABASE_URL` | Postgres connection string (pooled) |
| `DIRECT_URL` | Postgres direct connection (for Prisma migrations/db push) |
| `JWT_SECRET` | **Required in production** — app throws on boot if unset |
| `CRON_SECRET` | Bearer token Vercel cron jobs send; gate for `/api/cron/*` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Optional — Google OAuth sign-in |
| `NEXT_PUBLIC_APP_URL` | Recommended — used to derive OAuth redirect, share URLs |

## Deploy (Vercel)

1. Import the GitHub repo, point at `main`.
2. Set the env vars above.
3. Build command is already in `package.json`:
   `prisma generate && prisma db push --accept-data-loss && next build`
   (On first deploy this creates all tables. Switch to `prisma migrate deploy`
   once you adopt migrations.)
4. Cron schedules are declared in `vercel.json` (11 jobs) and activate
   automatically on Vercel. `/api/cron/household-nudge` runs hourly on
   purpose: it fans out to each household's *own* 8pm rather than one fixed
   UTC hour, so it needs a chance to look at every zone.

## Architecture quick map

- `app/` — App Router pages. Public surfaces use Blueprint
  (`app/_blueprint/*`); the legacy Family theme components remain in
  `app/_family/*` but are no longer wired to routes.
- `app/dashboard/*` — the authenticated app (own dark/light theme, untouched
  by the public themes).
- `app/api/*` — route handlers; `app/api/cron/*` are scheduled jobs.
- `lib/*` — pure domain logic (fully unit-tested): `bigPurchase`,
  `payoffSim`, `goalRaid`, `goalRaidLifecycle`, `moneyMind`,
  `lifestyleInflation`, `viceTax`, `debtBoss`, `interestAccrual`,
  `weeklyRecap`, `achievements/*`.
- `prisma/schema.prisma` — data model.
- `tests/*` — Vitest suite.

## Recently shipped (newest first)

1. **Capture Engine + The Compound** — the app's new center of gravity
   (spec + Supabase reference schema in `docs/capture-engine/`). Sub-5-second
   income/expense logging: `QuickCapture` component (dashboard overview +
   standalone phone-first `/capture` page), keyword categorizer with
   confidence + per-user correction memory (`CategoryOverride`), duplicate
   nudge, one-tap recurring patterns (`CapturePattern`), lazily-created
   Wallet account. All entries land in `Transaction` (new fields:
   `rawDescription`, `categoryConfidence`, `visibility` personal|shared,
   `source`), so Debt Bosses / Vice Tax / Budgets / Recaps feed off capture
   automatically. `/dashboard/compound` shows consistency (days logged ÷
   days active — the north star), 12-week net bars, compounding projection,
   and the clan view (household shared-only visibility). APIs:
   `/api/capture`, `/api/capture/correct`, `/api/capture/patterns`,
   `/api/compound`.
2. Blueprint design system + homeowner/car-owner toolkit
   (`/tools/home-affordability`, `/down-payment`, `/mortgage`,
   `/car-affordability`) with `lib/bigPurchase.ts` + 19 tests.
2. Lifestyle Inflation Detector (`/dashboard/inflation`, `/api/inflation`).
3. Goal Raid lifecycle (victories, deadline warnings, achievements,
   `/api/cron/raids`).
4. Goal Raids + Money Mind couples alignment game.
5. Weekly Recap, interest accrual, security hardening, Google OAuth.

## Known follow-ups / ideas

- Adopt `prisma migrate` instead of `db push` before real users.
- In-memory rate limiting (`lib/ratelimit.ts`) is per-instance — move to a
  shared store (Upstash/Redis) for multi-region.
- Family theme files in `app/_family/*` are unused — delete if not A/B testing.
- Consider surfacing the new big-purchase tools inside the dashboard, not
  just the public site.
