-- ---------------------------------------------------------------------------
-- What onboarding asks for, and somewhere to put it.
--
-- Five screens collected seven answers and stored none of them: the steps
-- wrote to a Zustand draft, and `finishOnboarding` called `reset()` on it. A
-- coach typed a bio and it was gone before they reached the next screen.
--
-- Two tables rather than columns on `public.users`, because the two sets have
-- nothing to do with each other and different people are allowed to read them.
-- A coach's profile is shown to a stranger holding their invite code; a
-- client's goals are theirs, and their coach's only if they share workouts.
--
-- `units` is deliberately absent. It already has a home — `settingsStore` and
-- `public.cache`, synced between devices by useSettingsSync — and a second
-- copy here would be a preference with two sources of truth.
-- ---------------------------------------------------------------------------

create table public.coach_profiles (
  coach_id uuid primary key references public.users (id) on delete cascade,
  -- "Ironworks Lagos". Where they coach, not where they live.
  gym text not null default '',
  bio text not null default '',
  -- "Strength", "Hypertrophy"… A coach picks any number, so an array rather
  -- than a column per option: the list is theirs to grow and this table should
  -- not need a migration when it does.
  specialties text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint coach_profiles_bio_length check (length(bio) <= 400),
  constraint coach_profiles_gym_length check (length(gym) <= 120)
);

comment on table public.coach_profiles is
  'A coach''s public face. Shown to anyone holding their invite code.';

create trigger coach_profiles_set_updated_at
  before update on public.coach_profiles
  for each row execute function public.set_updated_at();

alter table public.coach_profiles enable row level security;

-- A client sees the profile of the coach they are attached to. Everyone else
-- reaches it only through `lookup_coach`, which is definer and returns a
-- deliberately narrow slice.
create policy coach_profiles_select_own_or_linked on public.coach_profiles
  for select to authenticated
  using (coach_id = (select auth.uid()) or public.is_linked_to(coach_id));

create policy coach_profiles_write_own on public.coach_profiles
  for all to authenticated
  using (coach_id = (select auth.uid()))
  with check (coach_id = (select auth.uid()));

revoke all on public.coach_profiles from anon, authenticated;
grant select, insert, update, delete on public.coach_profiles to authenticated;

-- ---------------------------------------------------------------------------
-- The client's side.
--
-- `sessions_per_week` is the one answer here that already had something
-- waiting for it: `weekly_progress` measured every client against a hardcoded
-- 3 when no coach had assigned them a program. Someone training four days a
-- week and told they were at 3 of 3 was being measured against a number
-- nobody chose.
-- ---------------------------------------------------------------------------
create table public.client_profiles (
  client_id uuid primary key references public.users (id) on delete cascade,
  goals text[] not null default '{}',
  -- "New to training" | "1–3 yrs" | "3+ yrs". Free text rather than an enum:
  -- the buckets are copy on a screen, and changing copy should not be a
  -- migration.
  experience text not null default '',
  sessions_per_week integer not null default 4,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_profiles_frequency_sane check (sessions_per_week between 1 and 7)
);

comment on table public.client_profiles is
  'What a client said they are training for. Their coach sees it only with workouts.';

create trigger client_profiles_set_updated_at
  before update on public.client_profiles
  for each row execute function public.set_updated_at();

alter table public.client_profiles enable row level security;

-- Goals and experience are training context, so they follow the workouts
-- permission rather than being visible to any coach on the roster.
create policy client_profiles_select_own_or_coach on public.client_profiles
  for select to authenticated
  using (
    client_id = (select auth.uid())
    or public.has_client_permission(client_id, 'workouts')
  );

create policy client_profiles_write_own on public.client_profiles
  for all to authenticated
  using (client_id = (select auth.uid()))
  with check (client_id = (select auth.uid()));

revoke all on public.client_profiles from anon, authenticated;
grant select, insert, update, delete on public.client_profiles to authenticated;

-- ---------------------------------------------------------------------------
-- The lookup can now say who the coach actually is.
--
-- It returned a name and a client count, so the line under it read
-- "Coach · 4 clients" — true, and nothing a person would recognise anyone by.
-- The gym and specialties they typed during onboarding are what the screen
-- promised would be shown: "Clients see this before they attach."
--
-- Dropped rather than replaced: the return type changes, and CREATE OR REPLACE
-- cannot do that.
-- ---------------------------------------------------------------------------
drop function public.lookup_coach(text);

create or replace function public.lookup_coach(p_code text)
returns table (
  id uuid,
  full_name text,
  avatar_url text,
  client_count integer,
  gym text,
  bio text,
  specialties text[]
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_code text := upper(btrim(coalesce(p_code, '')));
  v_recent integer;
  v_coach public.users;
begin
  if v_actor is null then
    raise exception 'you are not signed in' using errcode = '42501';
  end if;

  if v_code = '' then
    raise exception 'Enter an invite code.' using errcode = '22023';
  end if;

  select count(*) into v_recent
    from public.coach_code_lookups l
   where l.actor = v_actor and l.looked_up_at > now() - interval '1 hour';

  if v_recent >= 10 then
    raise exception 'Too many code attempts. Try again in an hour.'
      using errcode = '54000';
  end if;

  select u.* into v_coach
    from public.users u
   where u.invite_code = v_code and u.role = 'coach' and u.role_confirmed;

  insert into public.coach_code_lookups (actor, code, found)
  values (v_actor, v_code, v_coach.id is not null);

  -- Empty, not an exception: each statement is its own transaction, so raising
  -- would roll back the ledger row the rate limit above counts — and the
  -- lookups worth counting are precisely the ones that miss.
  if v_coach.id is null then
    return;
  end if;

  if v_coach.id = v_actor then
    raise exception 'That is your own invite code.' using errcode = '22023';
  end if;

  -- Left join, so a coach who signed up before this table existed — or who
  -- skipped the step — still resolves. The profile row is optional; the
  -- lookup is not.
  return query
  select
    v_coach.id,
    v_coach.full_name,
    v_coach.avatar_url,
    (select count(*)::integer from public.coach_clients cc
      where cc.coach_id = v_coach.id and cc.status = 'active'),
    coalesce(p.gym, ''),
    coalesce(p.bio, ''),
    coalesce(p.specialties, '{}'::text[])
    from (select 1) as always
    left join public.coach_profiles p on p.coach_id = v_coach.id;
end;
$$;

grant execute on function public.lookup_coach(text) to authenticated;

-- ---------------------------------------------------------------------------
-- And the weekly target stops being a guess.
--
-- Order matters: a coach's program is what the client agreed to be coached
-- through, so it wins. Their own answer is next. The constant is only for
-- someone who has neither, and is now the last resort rather than the usual
-- one.
-- ---------------------------------------------------------------------------
create or replace function public.weekly_progress(p_client_id uuid)
returns table (done integer, target integer)
language sql
security definer
stable
set search_path = ''
as $$
  select
    (
      select count(*)::integer
        from public.workout_sessions s
       where s.client_id = p_client_id
         and s.finished_at >= date_trunc('week', now())
    ) as done,
    coalesce(
      (
        select p.sessions_per_week
          from public.routine_instances i
          join public.program_routines r on r.id = i.program_routine_id
          join public.programs p on p.id = r.program_id
         where i.client_id = p_client_id
         order by i.order_index
         limit 1
      ),
      (
        select cp.sessions_per_week
          from public.client_profiles cp
         where cp.client_id = p_client_id
      ),
      3
    ) as target
   where p_client_id = auth.uid()
      or public.has_client_permission(p_client_id, 'workouts');
$$;

grant execute on function public.weekly_progress(uuid) to authenticated;
