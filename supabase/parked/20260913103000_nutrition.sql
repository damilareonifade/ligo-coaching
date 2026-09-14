-- ---------------------------------------------------------------------------
-- Nutrition.
--
-- Three tables: the food catalogue, what was actually eaten, and what the
-- client is aiming at. The Food tab reads all three, and so does Today, which
-- is why this comes first on the client side — it is the only thing standing
-- between the home screen and real data.
--
-- The load-bearing decision is that a log **copies** the food rather than
-- pointing at it. Same argument as copy-on-assign: a log is a record of what
-- somebody ate on a Tuesday, and editing a food's calories in March must not
-- rewrite February. `food_id` is kept as provenance and is allowed to go NULL
-- when the food is deleted; the log survives intact either way.
-- ---------------------------------------------------------------------------

create table public.foods (
  id uuid primary key default gen_random_uuid(),
  -- NULL is the shared library everyone reads; a set one is a client's own,
  -- exactly as `exercises` works for the coach side.
  owner_id uuid references public.users (id) on delete cascade,
  name text not null,
  brand text not null default '',
  -- "100 g", "1 scoop", "1 medium". What the numbers below are per.
  serving_label text not null default '1 serving',
  kcal integer not null default 0,
  protein_g numeric(6, 1) not null default 0,
  carbs_g numeric(6, 1) not null default 0,
  fat_g numeric(6, 1) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint foods_name_not_blank check (length(btrim(name)) > 0),
  constraint foods_kcal_not_negative check (kcal >= 0),
  constraint foods_macros_not_negative
    check (protein_g >= 0 and carbs_g >= 0 and fat_g >= 0)
);

comment on table public.foods is
  'Food catalogue. NULL owner_id is the shared library, everyone reads it.';

create index foods_owner_idx on public.foods (owner_id) where owner_id is not null;
create index foods_name_idx on public.foods (lower(name));

create trigger foods_set_updated_at
  before update on public.foods
  for each row execute function public.set_updated_at();

alter table public.foods enable row level security;

create policy foods_select_shared_or_own on public.foods
  for select to authenticated
  using (owner_id is null or owner_id = (select auth.uid()));

create policy foods_write_own on public.foods
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

revoke all on public.foods from anon, authenticated;
grant select, insert, update, delete on public.foods to authenticated;

-- ---------------------------------------------------------------------------
-- May this coach write on this client's behalf?
--
-- `log_for` is the switch the client set on the permissions screen — "Sam can
-- log for me", described there as write access whose entries are labelled with
-- their name. This is the only place that switch is read, and it is a
-- different question from `has_client_permission`: seeing what someone ate and
-- adding to it are not the same permission.
-- ---------------------------------------------------------------------------
create or replace function public.can_log_for(p_client_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.coach_clients cc
     where cc.coach_id = auth.uid()
       and cc.client_id = p_client_id
       and cc.status = 'active'
       and cc.log_for
  );
$$;

grant execute on function public.can_log_for(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- What was eaten.
-- ---------------------------------------------------------------------------
create table public.food_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.users (id) on delete cascade,
  -- Provenance only. `on delete set null` because a deleted food must not take
  -- a month of someone's history with it.
  food_id uuid references public.foods (id) on delete set null,
  -- Copied at the moment of logging, never read back through `food_id`.
  name text not null,
  serving_label text not null default '1 serving',
  kcal integer not null default 0,
  protein_g numeric(6, 1) not null default 0,
  carbs_g numeric(6, 1) not null default 0,
  fat_g numeric(6, 1) not null default 0,
  -- "breakfast", "lunch", "post-workout"… Free text and optional: most
  -- logging is one-handed and mid-meal, and forcing a slot would slow it down.
  meal text,
  logged_at timestamptz not null default now(),
  -- Who actually entered it. The client themselves, or a coach they gave
  -- write access to — the history says which, because the client is entitled
  -- to know what they did not write.
  logged_by uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint food_logs_name_not_blank check (length(btrim(name)) > 0),
  constraint food_logs_kcal_not_negative check (kcal >= 0),
  constraint food_logs_macros_not_negative
    check (protein_g >= 0 and carbs_g >= 0 and fat_g >= 0)
);

comment on table public.food_logs is
  'One entry. Copies the food rather than pointing at it — a log is history.';

create index food_logs_client_day_idx on public.food_logs (client_id, logged_at desc);

alter table public.food_logs enable row level security;

create policy food_logs_all_own on public.food_logs
  for all to authenticated
  using (client_id = (select auth.uid()))
  with check (client_id = (select auth.uid()));

create policy food_logs_select_as_coach on public.food_logs
  for select to authenticated
  using (public.has_client_permission(client_id, 'nutrition'));

-- Seeing and adding are separate permissions, so this is its own policy rather
-- than a widening of the one above.
create policy food_logs_insert_as_coach on public.food_logs
  for insert to authenticated
  with check (public.can_log_for(client_id) and logged_by = (select auth.uid()));

create policy food_logs_delete_as_coach on public.food_logs
  for delete to authenticated
  using (public.can_log_for(client_id) and logged_by = (select auth.uid()));

revoke all on public.food_logs from anon, authenticated;
grant select, insert, update, delete on public.food_logs to authenticated;

-- ---------------------------------------------------------------------------
-- What they are aiming at.
--
-- Client-owned, and only client-writable. A coach can suggest targets in a
-- message; setting them silently would be the same category of thing as a
-- coach granting themselves access, which this schema refuses everywhere else.
-- ---------------------------------------------------------------------------
create table public.nutrition_targets (
  client_id uuid primary key references public.users (id) on delete cascade,
  kcal integer not null default 2400,
  protein_g integer not null default 180,
  carbs_g integer not null default 260,
  fat_g integer not null default 70,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint nutrition_targets_sane
    check (kcal between 0 and 20000 and protein_g >= 0 and carbs_g >= 0 and fat_g >= 0)
);

create trigger nutrition_targets_set_updated_at
  before update on public.nutrition_targets
  for each row execute function public.set_updated_at();

alter table public.nutrition_targets enable row level security;

create policy nutrition_targets_all_own on public.nutrition_targets
  for all to authenticated
  using (client_id = (select auth.uid()))
  with check (client_id = (select auth.uid()));

create policy nutrition_targets_select_as_coach on public.nutrition_targets
  for select to authenticated
  using (public.has_client_permission(client_id, 'nutrition'));

revoke all on public.nutrition_targets from anon, authenticated;
grant select, insert, update, delete on public.nutrition_targets to authenticated;

-- ---------------------------------------------------------------------------
-- The quick-add row: what this person logs most often.
--
-- Grouped here because PostgREST cannot group, and because the alternative is
-- downloading someone's eating history to count it on a phone. Names are
-- matched case-insensitively so "Greek yoghurt" and "greek yoghurt" are one
-- habit rather than two.
-- ---------------------------------------------------------------------------
create or replace function public.frequent_foods(
  p_client_id uuid,
  p_limit integer default 4
)
returns table (name text, serving_label text, kcal integer, times integer)
language sql
security definer
stable
set search_path = ''
as $$
  select
    (array_agg(l.name order by l.logged_at desc))[1] as name,
    (array_agg(l.serving_label order by l.logged_at desc))[1] as serving_label,
    (array_agg(l.kcal order by l.logged_at desc))[1] as kcal,
    count(*)::integer as times
  from public.food_logs l
  where l.client_id = p_client_id
    and l.logged_at > now() - interval '60 days'
    and (
      p_client_id = auth.uid()
      or public.has_client_permission(p_client_id, 'nutrition')
    )
  group by lower(l.name)
  order by count(*) desc, max(l.logged_at) desc
  limit least(greatest(coalesce(p_limit, 4), 1), 20);
$$;

comment on function public.frequent_foods(uuid, integer) is
  'Most-logged foods of the last 60 days, for the quick-add row.';

grant execute on function public.frequent_foods(uuid, integer) to authenticated;
