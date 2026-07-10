-- ============================================================
-- Finance Wars — Income & Expense Capture Engine
-- Initial schema: categories, households, expenses, income
--
-- Visibility model (decided): SHARED-ONLY.
-- A household member can read another member's row only when
-- that row is explicitly marked visibility = 'shared'. Personal
-- rows are never visible to anyone but their owner. There is no
-- "full household access" mode — by design, per product decision.
--
-- Drop this into supabase/migrations/ (rename the timestamp
-- prefix to fit your existing sequence) and run via the Supabase
-- CLI, or paste into the SQL editor once a project exists.
-- ============================================================

-- ---------- Reference taxonomy ----------
create table categories (
  id text primary key,
  label text not null,
  kind text not null check (kind in ('expense', 'income')),
  sort_order int not null default 0
);

insert into categories (id, label, kind, sort_order) values
  ('housing',              'Housing',                'expense', 1),
  ('utilities',            'Utilities',               'expense', 2),
  ('groceries',            'Groceries',               'expense', 3),
  ('dining_drinks',        'Dining & Drinks',         'expense', 4),
  ('transportation',       'Transportation',          'expense', 5),
  ('debt_payments',        'Debt Payments',           'expense', 6),
  ('subscriptions',        'Subscriptions',           'expense', 7),
  ('shopping',             'Shopping',                'expense', 8),
  ('health_personal_care', 'Health & Personal Care',  'expense', 9),
  ('entertainment',        'Entertainment',           'expense', 10),
  ('kids_pets',            'Kids/Pets',               'expense', 11),
  ('savings_transfers',    'Savings & Transfers',     'expense', 12),
  ('misc',                 'Miscellaneous',           'expense', 13),
  ('salary',               'Salary/Payroll',          'income', 1),
  ('hourly_gig',           'Hourly/Gig/Freelance',    'income', 2),
  ('bonus_commission',     'Bonus/Commission',        'income', 3),
  ('reimbursement',        'Reimbursement',           'income', 4),
  ('investment',           'Investment/Interest',     'income', 5),
  ('gift',                 'Gift',                    'income', 6),
  ('other_income',         'Other',                   'income', 7);

alter table categories enable row level security;

create policy "categories readable by any authenticated user"
on categories for select
to authenticated
using (true);
-- No insert/update/delete policy: taxonomy changes ship via migration,
-- not from the client. Intentional, per "keep the taxonomy short."

-- ---------- Households (couples / family units) ----------
create table households (
  id uuid primary key default gen_random_uuid(),
  name text,
  created_at timestamptz not null default now()
);

create table household_members (
  household_id uuid not null references households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

alter table households enable row level security;
alter table household_members enable row level security;

create policy "members can read their own household"
on households for select
to authenticated
using (
  id in (select household_id from household_members where user_id = auth.uid())
);

create policy "members can read their household roster"
on household_members for select
to authenticated
using (
  household_id in (select household_id from household_members where user_id = auth.uid())
);
-- Self-referencing subquery is intentional and standard for this pattern —
-- a user's own row always satisfies it, so it isn't recursive in practice.
-- If this becomes a hot path at scale, wrap the subquery in a SECURITY
-- DEFINER function instead of re-deriving it per policy.

-- Deliberately no insert/update/delete policies here yet: the invite/accept
-- flow for linking two users into a household isn't designed. Until it is,
-- rows here should only be written via service role, so nobody can add
-- themselves to a household without an invite step that doesn't exist yet.

-- ---------- Shared updated_at trigger ----------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ---------- Expenses ----------
create table expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  household_id uuid references households(id) on delete set null,
  amount_cents bigint not null check (amount_cents > 0),
  currency text not null default 'USD',
  category text not null references categories(id),
  subcategory text,
  raw_description text not null,
  category_confidence numeric(3, 2) check (category_confidence between 0 and 1),
  is_recurring boolean not null default false,
  recurrence_rule text,
  visibility text not null default 'personal' check (visibility in ('personal', 'shared')),
  source text not null default 'manual' check (source in ('manual', 'receipt_scan', 'import')),
  notes text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index expenses_user_occurred_idx on expenses (user_id, occurred_at desc);
create index expenses_household_idx on expenses (household_id) where household_id is not null;

create trigger expenses_set_updated_at
before update on expenses
for each row execute function set_updated_at();

alter table expenses enable row level security;

create policy "read own expenses"
on expenses for select
to authenticated
using (user_id = auth.uid());

create policy "read shared household expenses"
on expenses for select
to authenticated
using (
  visibility = 'shared'
  and household_id is not null
  and household_id in (select household_id from household_members where user_id = auth.uid())
);

create policy "insert own expenses"
on expenses for insert
to authenticated
with check (
  user_id = auth.uid()
  and (
    visibility = 'personal'
    or household_id in (select household_id from household_members where user_id = auth.uid())
  )
);

create policy "update own expenses"
on expenses for update
to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and (
    visibility = 'personal'
    or household_id in (select household_id from household_members where user_id = auth.uid())
  )
);

create policy "delete own expenses"
on expenses for delete
to authenticated
using (user_id = auth.uid());

-- ---------- Income ----------
create table income (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  household_id uuid references households(id) on delete set null,
  amount_cents bigint not null check (amount_cents > 0),
  currency text not null default 'USD',
  income_type text not null references categories(id),
  raw_description text not null,
  category_confidence numeric(3, 2) check (category_confidence between 0 and 1),
  is_recurring boolean not null default false,
  recurrence_rule text,
  visibility text not null default 'personal' check (visibility in ('personal', 'shared')),
  source text not null default 'manual' check (source in ('manual', 'import')),
  notes text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index income_user_occurred_idx on income (user_id, occurred_at desc);
create index income_household_idx on income (household_id) where household_id is not null;

create trigger income_set_updated_at
before update on income
for each row execute function set_updated_at();

alter table income enable row level security;

create policy "read own income"
on income for select
to authenticated
using (user_id = auth.uid());

create policy "read shared household income"
on income for select
to authenticated
using (
  visibility = 'shared'
  and household_id is not null
  and household_id in (select household_id from household_members where user_id = auth.uid())
);

create policy "insert own income"
on income for insert
to authenticated
with check (
  user_id = auth.uid()
  and (
    visibility = 'personal'
    or household_id in (select household_id from household_members where user_id = auth.uid())
  )
);

create policy "update own income"
on income for update
to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and (
    visibility = 'personal'
    or household_id in (select household_id from household_members where user_id = auth.uid())
  )
);

create policy "delete own income"
on income for delete
to authenticated
using (user_id = auth.uid());
