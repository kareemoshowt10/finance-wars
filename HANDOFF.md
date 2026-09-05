# Debt Sucker — Handoff & Deploy Notes

Last updated: 2026-09-03 · Branch: `claude/debt-sucker-app-design-jili0t`

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
- Unit tests: 290/290 (`npm test`, ~4s, no dependencies)
- Integration tests: 144/144 (`npm run test:integration`, needs Postgres)
- End-to-end: 45/45 checks (`npm run test:e2e`, needs a running server)
- TypeScript: clean (`npx tsc --noEmit`)
- Lint: clean (`npm run lint`) — see `.eslintrc.README.md` for the two rule decisions
- CI: `.github/workflows/ci.yml` runs all of the above on every push

See [`TESTING.md`](./TESTING.md) for what each suite covers and how to add to
them.

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
| `NEXT_PUBLIC_APP_URL` | Recommended — canonical origin for OAuth redirects, share links, sitemap and OG tags |
| `STRIPE_SECRET_KEY` etc. | **Required to charge anyone.** Without it billing runs in dev mode: every paid plan upgrades for free. See `.env.example` |
| `SEED_TOKEN` | Leave unset in production — it's the only gate on `/api/admin/seed` |

The server prints a configuration report at boot if any of the above is
missing in production (`lib/launchChecks.ts` via `instrumentation.ts`), so a
half-configured deploy announces itself in the logs instead of quietly
behaving like a development build.

## Deploy (Vercel)

1. Import the GitHub repo, point at `main`.
2. Set the env vars above.
3. Build command is already in `package.json`:
   `prisma generate && prisma migrate deploy && next build`
   On a fresh database this applies `prisma/migrations/0_init` and creates
   every table. Schema changes ship as new migrations from then on
   (`npx prisma migrate dev --name whatever` locally, commit the generated
   folder, deploy) — nothing destructive runs against production.

   **Baselining an existing database.** If your database was created by the
   old `prisma db push` build, its tables already exist and `migrate deploy`
   would try to create them again. Tell Prisma the initial migration is
   already in place, once, before the next deploy:

   ```
   DATABASE_URL=<your production url> npx prisma migrate resolve --applied 0_init
   ```

   Confirm there's nothing left over first — this should print no SQL:

   ```
   npx prisma migrate diff --from-url "$DATABASE_URL" \
     --to-schema-datamodel prisma/schema.prisma --script
   ```

   If it *does* print SQL, your live database has drifted from the schema;
   review that SQL and apply it deliberately rather than letting a build do
   it. `npm run db:push` remains available for throwaway local databases.
4. Cron schedules are declared in `vercel.json` (11 jobs) and activate
   automatically on Vercel. `/api/cron/household-nudge` runs hourly on
   purpose: it fans out to each household's *own* 8pm rather than one fixed
   UTC hour, so it needs a chance to look at every zone.

## Continuous integration

`.github/workflows/ci.yml`, three jobs on every push and pull request:

| Job | What it does | Needs |
|---|---|---|
| `check` | typecheck, lint, unit tests | nothing — fails in under a minute |
| `integration` | 144 tests against a real Postgres service container | Postgres 16 |
| `e2e` | `npm run build`, start the server, drive Chromium through 45 checks | Postgres 16 + Playwright |

The `e2e` job's build step doubles as the migration test: `npm run build` runs
`prisma migrate deploy` against an empty database, so a migration that doesn't
apply cleanly fails in CI rather than in production. Screenshots are uploaded
as an artifact when the E2E job fails.

Nothing in CI needs a secret. The database lives in a container that dies with
the job, and `JWT_SECRET`/`CRON_SECRET` are literal throwaway strings in the
workflow file.

## Pre-launch checklist

Run through this once before pointing real users at it.

1. **Database.** If the database already exists from an earlier `db push`
   build, baseline it (see step 3 above) before the first deploy on the new
   build command. On a brand-new database there's nothing to do.
2. **Environment.** Set every var in the table above. Deploy, then read the
   first lines of the server log: a clean boot prints nothing from
   `launchChecks`; anything else names exactly what's missing and what it
   breaks.
3. **Billing.** Confirm `/dashboard/billing` does *not* show the blue "Dev
   mode" banner. If it does, Stripe isn't connected and every upgrade is
   free. Then run one real checkout end to end and confirm the webhook
   updates `Household.plan`.
4. **Crons.** `vercel.json` declares 11 jobs; Vercel's Hobby tier caps
   scheduled jobs, so check your plan covers them — `household-nudge` in
   particular must run hourly to reach every timezone's 8pm.
5. **Smoke test the deploy.** `BASE_URL=https://your-domain npm run test:e2e`
   drives a real browser through signup, household creation, chores, the
   invite flow, loans, goals, billing and the mobile layout. It creates
   throwaway accounts, so point it at staging unless you're happy with test
   rows in production.
6. **Monitoring.** Point an uptime check at `/api/health` — it returns 503
   with `database: "down"` when Postgres is unreachable, and 200 otherwise,
   so the two failure modes page differently.
7. **Search & social.** `/robots.txt` and `/sitemap.xml` are generated from
   `NEXT_PUBLIC_APP_URL`; confirm they show your real domain, then submit the
   sitemap. Check a shared link unfurls with the card from
   `app/opengraph-image.tsx`.

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

1. **Full-scale testing** — an integration suite (144 tests) on a real
   Postgres, covering the money paths, the Stripe webhook, every household
   route's permission boundary, plan limits, a 12-member household with two
   years of history, and genuine concurrency; plus CI running all three suites
   on every push. It found and fixed two real concurrency bugs in money code:
   goal contributions lost money under parallel writes (read-modify-write
   instead of an atomic increment), and the daily bonus paid twice when the
   third objective landed twice at once. See `TESTING.md`.
2. **Launch hardening** — deploys now run `prisma migrate deploy` against a
   real `0_init` migration instead of `db push --accept-data-loss`; error
   boundaries (`app/error.tsx`, `app/global-error.tsx`) replace Next's bare
   "Application error"; a boot-time configuration report
   (`lib/launchChecks.ts`) names anything missing in production; `robots.ts`,
   `sitemap.ts`, a generated `opengraph-image.tsx` and `/api/health` cover the
   public surface; ESLint is configured and clean; 106 form fields across the
   dashboard had labels that weren't associated with their inputs — now wired
   (`htmlFor`/`id`, or `role="group"` for button pickers). Plus an end-to-end
   launch smoke test (`npm run test:e2e`, 45 checks).
3. **Household HQ: timezones, dialogs, instant chore logging** — per-household
   `timezone` drives every day boundary (`lib/time.ts`, day-key arithmetic
   rather than timestamp math, so DST can't break a streak); the nudge cron
   runs hourly and fires at each household's own 8pm; `Modal` got a focus
   trap, Escape-to-close and proper dialog semantics; completing a chore
   updates the card, streak and leaderboard optimistically.
4. **Capture Engine + The Compound** — the app's new center of gravity
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
5. Blueprint design system + homeowner/car-owner toolkit
   (`/tools/home-affordability`, `/down-payment`, `/mortgage`,
   `/car-affordability`) with `lib/bigPurchase.ts` + 19 tests.
6. Lifestyle Inflation Detector (`/dashboard/inflation`, `/api/inflation`).
7. Goal Raid lifecycle (victories, deadline warnings, achievements,
   `/api/cron/raids`).
8. Goal Raids + Money Mind couples alignment game.
9. Weekly Recap, interest accrual, security hardening, Google OAuth.

## Known follow-ups / ideas

- Two validation conventions coexist: 41 routes use `lib/validate`'s
  `parseBody` (422 + per-field messages), 28 use a bare `safeParse` (400, no
  detail). Both are fine; being both means a client can't write one error
  handler. Worth unifying on the 422 shape.
- The untested `lib/` modules are down from 27 to the ones with no money or
  auth exposure (`moneyDate`, `weeklyRecap`, `lifestyleInflation`,
  `debtBoss`, `purchaseReview`, `referrals`, `goalRaidLifecycle`). The
  integration harness is there when they're worth covering.
- `react-hooks/exhaustive-deps` warns in ~18 dashboard components — the
  `useEffect(() => { load(); }, [id])` pattern. Correct today, but worth
  moving to `useCallback` so the rule can be trusted. See
  `.eslintrc.README.md`.
- ~35 `<label>` elements remain without an explicit `htmlFor`. Most are
  wrapping labels (implicit association, already fine); a handful are button
  pickers that want `role="group"` like the cheer picker now has.
- In-memory rate limiting (`lib/ratelimit.ts`) is per-instance — move to a
  shared store (Upstash/Redis) for multi-region.
- Family theme files in `app/_family/*` are unused — delete if not A/B testing.
- Consider surfacing the new big-purchase tools inside the dashboard, not
  just the public site.
