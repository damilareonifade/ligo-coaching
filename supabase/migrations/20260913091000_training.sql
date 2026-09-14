-- ---------------------------------------------------------------------------
-- Training: the coach's templates, the copies clients hold, and the workouts
-- they log from them.
--
-- The shape follows one decision made in the app: assigning a program COPIES
-- it. Each client holds their own routine, which either side may edit, and a
-- later change on one never reaches another. A pointer would make "change it
-- for this client only" inexpressible and would let a client's edit leak to
-- everybody.
--
--   programs ─► program_routines ─► program_blocks        the coach's master
--                      │
--                      │ copied on assignment
--                      ▼
--   routine_instances ─► routine_blocks                   what a client holds
--          │  └─► routine_updates ─► routine_update_blocks   a pending proposal
--          │
--          └─► workout_sessions ─► workout_exercises ─► workout_sets
--
-- A routine the client built themselves is an instance with no
-- `program_routine_id`. One model, so one editor and one set of policies
-- serve both.
--
-- Who may see what is decided by public.coach_clients and never re-derived
-- here — see `public.has_client_permission`.
-- ---------------------------------------------------------------------------

create type public.program_status as enum ('draft', 'published', 'archived');

-- ---------------------------------------------------------------------------
-- The one authorization question every coach-side policy below asks.
--
-- `security definer` for the same reason `is_linked_to` is: it reads
-- coach_clients with RLS bypassed and answers a single yes/no about the
-- caller. Permissions are the client's to set — see the consent trigger in
-- the previous migration — so trusting this row is safe.
-- ---------------------------------------------------------------------------
create or replace function public.has_client_permission(p_client_id uuid, p_domain text)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
      from public.coach_clients cc
     where cc.coach_id = auth.uid()
       and cc.client_id = p_client_id
       and cc.status = 'active'
       and coalesce((cc.permissions ->> p_domain)::boolean, false)
  );
$$;

comment on function public.has_client_permission(uuid, text) is
  'True when the caller coaches this client and the client shares that domain.';

grant execute on function public.has_client_permission(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- The exercise library. A row with no owner is the shared catalogue; one with
-- an owner is a lift a coach invented and only they should see.
-- ---------------------------------------------------------------------------
create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.users (id) on delete cascade,
  name text not null,
  -- Pre-composed for the picker row: "Barbell · Chest".
  meta text not null default '',
  -- "Compound" | "Accessory" | "Yours"
  tag text not null default 'Accessory',
  -- Picker section: "Recent" | "Chest" | "Back" | …
  muscle_group text not null default 'Other',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint exercises_name_not_blank check (length(btrim(name)) > 0)
);

comment on table public.exercises is
  'Exercise catalogue. NULL owner_id is the shared library, everyone reads it.';

create index exercises_owner_idx on public.exercises (owner_id) where owner_id is not null;
create index exercises_name_idx on public.exercises (lower(name));

create trigger exercises_set_updated_at
  before update on public.exercises
  for each row execute function public.set_updated_at();

alter table public.exercises enable row level security;

create policy exercises_select_shared_or_own on public.exercises
  for select to authenticated
  using (owner_id is null or owner_id = (select auth.uid()));

create policy exercises_write_own on public.exercises
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

revoke all on public.exercises from anon, authenticated;
grant select, insert, update, delete on public.exercises to authenticated;

-- ---------------------------------------------------------------------------
-- The coach's template. `version` is bumped on publish and is what a client's
-- copy records in `base_version`, so "has this copy fallen behind" is a
-- comparison rather than a guess.
-- ---------------------------------------------------------------------------
create table public.programs (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  note text,
  weeks integer not null default 8,
  -- How often the client should train. A target, never a timetable: a program
  -- is a rotation they work through at their own pace, so nothing here is
  -- scheduled to a day and nothing can be missed.
  sessions_per_week integer not null default 4,
  status public.program_status not null default 'draft',
  version integer not null default 1,
  -- True while the coach's edits are ahead of what clients hold.
  has_draft_changes boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint programs_name_not_blank check (length(btrim(name)) > 0),
  constraint programs_weeks_sane check (weeks between 1 and 52),
  constraint programs_frequency_sane check (sessions_per_week between 1 and 7)
);

comment on table public.programs is
  'A coach''s program template. Never held by a client — they hold copies.';

create index programs_coach_idx on public.programs (coach_id, status);

create trigger programs_set_updated_at
  before update on public.programs
  for each row execute function public.set_updated_at();

alter table public.programs enable row level security;

-- Clients never read a template. They read the copy they were given, which is
-- the only version that is true for them.
create policy programs_all_own on public.programs
  for all to authenticated
  using (coach_id = (select auth.uid()))
  with check (coach_id = (select auth.uid()));

revoke all on public.programs from anon, authenticated;
grant select, insert, update, delete on public.programs to authenticated;

-- ---------------------------------------------------------------------------
-- Program → Routines → Exercises. A routine is one session; "Routine 2" is
-- the name it starts with, not the one it has to keep.
-- ---------------------------------------------------------------------------
create table public.program_routines (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs (id) on delete cascade,
  name text not null,
  -- Place in the rotation. Ordering only — never a day of the week.
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint program_routines_name_not_blank check (length(btrim(name)) > 0)
);

create index program_routines_program_idx
  on public.program_routines (program_id, order_index);

create trigger program_routines_set_updated_at
  before update on public.program_routines
  for each row execute function public.set_updated_at();

alter table public.program_routines enable row level security;

-- The subquery is subject to `programs`' own policy, which is what scopes this
-- to the caller's programs. No helper needed: that policy reads only auth.uid()
-- and its own columns, so there is nothing to recurse into.
create policy program_routines_all_via_program on public.program_routines
  for all to authenticated
  using (
    exists (select 1 from public.programs p where p.id = program_id)
  )
  with check (
    exists (select 1 from public.programs p where p.id = program_id)
  );

revoke all on public.program_routines from anon, authenticated;
grant select, insert, update, delete on public.program_routines to authenticated;

-- ---------------------------------------------------------------------------
-- One prescribed exercise. `scheme` is display text ("4 × 8") because that is
-- what a coach types and what a client reads; the set count is derived from it
-- rather than stored twice and left to drift.
-- ---------------------------------------------------------------------------
create table public.program_blocks (
  id uuid primary key default gen_random_uuid(),
  program_routine_id uuid not null
    references public.program_routines (id) on delete cascade,
  name text not null,
  scheme text not null default '3 × 10',
  -- "RPE 8", or empty when the coach left it unset. Not a number: blank is a
  -- real answer and 0 would be a prescription nobody made.
  rpe text not null default '',
  -- NULL for a bodyweight movement, or a load left to the day.
  target_kg numeric(6, 2),
  -- The one cue to remember on this lift.
  note text,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint program_blocks_target_positive check (target_kg is null or target_kg > 0)
);

create index program_blocks_routine_idx
  on public.program_blocks (program_routine_id, order_index);

create trigger program_blocks_set_updated_at
  before update on public.program_blocks
  for each row execute function public.set_updated_at();

alter table public.program_blocks enable row level security;

create policy program_blocks_all_via_routine on public.program_blocks
  for all to authenticated
  using (
    exists (select 1 from public.program_routines r where r.id = program_routine_id)
  )
  with check (
    exists (select 1 from public.program_routines r where r.id = program_routine_id)
  );

revoke all on public.program_blocks from anon, authenticated;
grant select, insert, update, delete on public.program_blocks to authenticated;

-- ---------------------------------------------------------------------------
-- What a client holds.
--
-- `program_routine_id` NULL is a routine they built themselves — the only
-- difference between the two, and why one table serves both.
--
-- `on delete set null` rather than cascade: a coach deleting a program must
-- not delete training their clients are in the middle of. The copy survives
-- and simply stops having a template behind it.
-- ---------------------------------------------------------------------------
create table public.routine_instances (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.users (id) on delete cascade,
  program_routine_id uuid references public.program_routines (id) on delete set null,
  -- Kept alongside the routine link so a coach can still be identified after
  -- the template is gone, and so policies need one join rather than three.
  coach_id uuid references public.users (id) on delete set null,
  name text not null,
  note text,
  order_index integer not null default 0,
  -- The template revision this was copied from. Without it neither "diverged"
  -- nor "behind" can be computed, only guessed. NULL for the client's own.
  base_version integer,
  -- True once either side edited after assignment. It does not decide whether
  -- a publish asks — everyone is asked — it says whose work is at stake.
  diverged boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint routine_instances_name_not_blank check (length(btrim(name)) > 0),
  -- Only a routine that came from a coach has a version behind it. Keyed off
  -- `coach_id` rather than `program_routine_id` because the routine link is
  -- cleared when a coach deletes the template, and the copy outliving it must
  -- not become invalid — `base_version` is then a historical fact about where
  -- it came from, which is exactly what it was always for.
  constraint routine_instances_own_has_no_version
    check (coach_id is not null or base_version is null)
);

comment on table public.routine_instances is
  'A routine one client holds. NULL program_routine_id means they built it.';

create index routine_instances_client_idx
  on public.routine_instances (client_id, order_index);
create index routine_instances_routine_idx
  on public.routine_instances (program_routine_id)
  where program_routine_id is not null;
create index routine_instances_coach_idx
  on public.routine_instances (coach_id) where coach_id is not null;

create trigger routine_instances_set_updated_at
  before update on public.routine_instances
  for each row execute function public.set_updated_at();

alter table public.routine_instances enable row level security;

create policy routine_instances_all_own on public.routine_instances
  for all to authenticated
  using (client_id = (select auth.uid()))
  with check (client_id = (select auth.uid()));

-- A coach always sees what they assigned — they wrote it. Seeing a routine the
-- client built for themselves is a different question, and the client answers
-- it by sharing workouts.
create policy routine_instances_select_as_coach on public.routine_instances
  for select to authenticated
  using (
    coach_id = (select auth.uid())
    or public.has_client_permission(client_id, 'workouts')
  );

-- Editing one client's copy is the point of copy-on-assign, but only for a
-- routine the coach handed over. What a client built is not theirs to rewrite.
create policy routine_instances_update_assigned on public.routine_instances
  for update to authenticated
  using (coach_id = (select auth.uid()) and program_routine_id is not null)
  with check (coach_id = (select auth.uid()) and program_routine_id is not null);

revoke all on public.routine_instances from anon, authenticated;
grant select, insert, update, delete on public.routine_instances to authenticated;

-- ---------------------------------------------------------------------------
-- The copied exercises. Same shape as program_blocks and deliberately a
-- separate table: this one is the client's and is expected to drift from the
-- template it came from.
-- ---------------------------------------------------------------------------
create table public.routine_blocks (
  id uuid primary key default gen_random_uuid(),
  routine_instance_id uuid not null
    references public.routine_instances (id) on delete cascade,
  name text not null,
  scheme text not null default '3 × 10',
  rpe text not null default '',
  target_kg numeric(6, 2),
  note text,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint routine_blocks_target_positive check (target_kg is null or target_kg > 0)
);

create index routine_blocks_instance_idx
  on public.routine_blocks (routine_instance_id, order_index);

create trigger routine_blocks_set_updated_at
  before update on public.routine_blocks
  for each row execute function public.set_updated_at();

alter table public.routine_blocks enable row level security;

create policy routine_blocks_all_via_instance on public.routine_blocks
  for all to authenticated
  using (
    exists (
      select 1 from public.routine_instances i where i.id = routine_instance_id
    )
  )
  with check (
    exists (
      select 1
        from public.routine_instances i
       where i.id = routine_instance_id
         and (i.client_id = (select auth.uid()) or i.coach_id = (select auth.uid()))
    )
  );

revoke all on public.routine_blocks from anon, authenticated;
grant select, insert, update, delete on public.routine_blocks to authenticated;

-- ---------------------------------------------------------------------------
-- A change the coach has published, waiting on this client's answer.
--
-- Publishing proposes; it never overwrites. Nobody is updated silently — not
-- even a client whose copy still matches, because it is their copy either way.
-- At most one proposal per instance: a second publish replaces the first
-- rather than queueing, since nobody wants to answer a backlog.
-- ---------------------------------------------------------------------------
create table public.routine_updates (
  id uuid primary key default gen_random_uuid(),
  routine_instance_id uuid not null unique
    references public.routine_instances (id) on delete cascade,
  template_version integer not null,
  -- What changed, in words — "Bench press, Cable fly".
  summary text not null default '',
  proposed_at timestamptz not null default now()
);

create trigger routine_updates_noop_updated_at
  before update on public.routine_updates
  for each row execute function public.set_updated_at();

alter table public.routine_updates enable row level security;

-- The client decides; the coach may watch. Neither writes it by hand — see
-- publish_program and decide_routine_update in the next migration.
create policy routine_updates_select_either_side on public.routine_updates
  for select to authenticated
  using (
    exists (
      select 1 from public.routine_instances i where i.id = routine_instance_id
    )
  );

create policy routine_updates_delete_own on public.routine_updates
  for delete to authenticated
  using (
    exists (
      select 1
        from public.routine_instances i
       where i.id = routine_instance_id
         and i.client_id = (select auth.uid())
    )
  );

revoke all on public.routine_updates from anon, authenticated;
grant select, delete on public.routine_updates to authenticated;

create table public.routine_update_blocks (
  id uuid primary key default gen_random_uuid(),
  routine_update_id uuid not null
    references public.routine_updates (id) on delete cascade,
  name text not null,
  scheme text not null default '3 × 10',
  rpe text not null default '',
  target_kg numeric(6, 2),
  note text,
  order_index integer not null default 0
);

create index routine_update_blocks_update_idx
  on public.routine_update_blocks (routine_update_id, order_index);

alter table public.routine_update_blocks enable row level security;

create policy routine_update_blocks_select_via_update on public.routine_update_blocks
  for select to authenticated
  using (
    exists (select 1 from public.routine_updates u where u.id = routine_update_id)
  );

revoke all on public.routine_update_blocks from anon, authenticated;
grant select on public.routine_update_blocks to authenticated;

-- ---------------------------------------------------------------------------
-- Workouts.
--
-- `finished_at` is the single source for everything the app derives about
-- training history: when a routine was last done, how many sessions happened
-- this week, which routine is up next, and adherence. Storing any of those
-- would be a second copy of a fact that is already here.
--
-- `routine_instance_id` is NULL for a workout started from nothing.
-- ---------------------------------------------------------------------------
create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.users (id) on delete cascade,
  routine_instance_id uuid references public.routine_instances (id) on delete set null,
  title text not null,
  started_at timestamptz not null default now(),
  -- NULL while it is still running. A workout nobody finished has not been
  -- done: it counts for nothing and advances no rotation.
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workout_sessions_finished_after_start
    check (finished_at is null or finished_at >= started_at)
);

create index workout_sessions_client_finished_idx
  on public.workout_sessions (client_id, finished_at desc)
  where finished_at is not null;
create index workout_sessions_instance_finished_idx
  on public.workout_sessions (routine_instance_id, finished_at desc)
  where finished_at is not null;
-- At most one workout should be open at a time; this makes finding it cheap.
create index workout_sessions_open_idx
  on public.workout_sessions (client_id) where finished_at is null;

create trigger workout_sessions_set_updated_at
  before update on public.workout_sessions
  for each row execute function public.set_updated_at();

alter table public.workout_sessions enable row level security;

create policy workout_sessions_all_own on public.workout_sessions
  for all to authenticated
  using (client_id = (select auth.uid()))
  with check (client_id = (select auth.uid()));

create policy workout_sessions_select_as_coach on public.workout_sessions
  for select to authenticated
  using (public.has_client_permission(client_id, 'workouts'));

revoke all on public.workout_sessions from anon, authenticated;
grant select, insert, update, delete on public.workout_sessions to authenticated;

-- ---------------------------------------------------------------------------
-- What was actually done, as opposed to what was prescribed.
--
-- The notes are two columns rather than one with an author: a cue from a coach
-- and a reminder a client left themselves are different instructions, and
-- writing one must never erase the other.
-- ---------------------------------------------------------------------------
create table public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_session_id uuid not null
    references public.workout_sessions (id) on delete cascade,
  name text not null,
  coach_note text,
  own_note text,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index workout_exercises_session_idx
  on public.workout_exercises (workout_session_id, order_index);

create trigger workout_exercises_set_updated_at
  before update on public.workout_exercises
  for each row execute function public.set_updated_at();

alter table public.workout_exercises enable row level security;

create policy workout_exercises_all_via_session on public.workout_exercises
  for all to authenticated
  using (
    exists (select 1 from public.workout_sessions s where s.id = workout_session_id)
  )
  with check (
    exists (
      select 1
        from public.workout_sessions s
       where s.id = workout_session_id
         and s.client_id = (select auth.uid())
    )
  );

revoke all on public.workout_exercises from anon, authenticated;
grant select, insert, update, delete on public.workout_exercises to authenticated;

-- ---------------------------------------------------------------------------
-- One set. Load and reps are separate columns because they are separate
-- edits: a PR on either has to stay comparable with every other session, and
-- one combined value would let them drift together.
-- ---------------------------------------------------------------------------
create table public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  workout_exercise_id uuid not null
    references public.workout_exercises (id) on delete cascade,
  -- Set number within the exercise, from one.
  n integer not null,
  weight_kg numeric(6, 2) not null default 0,
  reps integer not null default 0,
  completed boolean not null default false,
  is_pr boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workout_exercise_id, n),
  constraint workout_sets_n_positive check (n > 0),
  -- Zero is a real answer — a bodyweight set is zero loaded. Negative is not.
  constraint workout_sets_weight_not_negative check (weight_kg >= 0),
  constraint workout_sets_reps_not_negative check (reps >= 0)
);

create trigger workout_sets_set_updated_at
  before update on public.workout_sets
  for each row execute function public.set_updated_at();

alter table public.workout_sets enable row level security;

create policy workout_sets_all_via_exercise on public.workout_sets
  for all to authenticated
  using (
    exists (select 1 from public.workout_exercises e where e.id = workout_exercise_id)
  )
  with check (
    exists (
      select 1
        from public.workout_exercises e
        join public.workout_sessions s on s.id = e.workout_session_id
       where e.id = workout_exercise_id
         and s.client_id = (select auth.uid())
    )
  );

revoke all on public.workout_sets from anon, authenticated;
grant select, insert, update, delete on public.workout_sets to authenticated;
