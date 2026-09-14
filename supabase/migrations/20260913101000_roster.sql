-- ---------------------------------------------------------------------------
-- The coach's roster.
--
-- Two things live here. Labels, which are the coach's own filing system and
-- the last piece of the roster with no table behind it. And a view that
-- answers the roster screen's actual question — "who am I coaching, and what
-- is going on with them" — in one read rather than one per client.
-- ---------------------------------------------------------------------------

create table public.roster_labels (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  -- A token name from src/theme/labelColors.ts, never a hex. A label is a
  -- coach's private filing colour, so the app resolves the name to whatever
  -- the palette currently says — a stored hex would freeze it.
  color text not null default 'label-slate',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint roster_labels_name_not_blank check (length(btrim(name)) > 0),
  constraint roster_labels_colour_known check (
    color in ('label-violet', 'label-amber', 'label-sky',
              'label-green', 'label-rose', 'label-slate')
  )
);

comment on table public.roster_labels is
  'A coach''s own filing. Never a permission, and never visible to the client.';

create index roster_labels_coach_idx on public.roster_labels (coach_id);

create trigger roster_labels_set_updated_at
  before update on public.roster_labels
  for each row execute function public.set_updated_at();

alter table public.roster_labels enable row level security;

-- Entirely private to the coach. A client has no business knowing they have
-- been filed under "Prep", and nothing in the app shows them.
create policy roster_labels_all_own on public.roster_labels
  for all to authenticated
  using (coach_id = (select auth.uid()))
  with check (coach_id = (select auth.uid()));

revoke all on public.roster_labels from anon, authenticated;
grant select, insert, update, delete on public.roster_labels to authenticated;

-- ---------------------------------------------------------------------------
-- Which label a client is filed under. On the link rather than on the client,
-- because it is the coach's note about the relationship — two coaches filing
-- the same person file them differently.
--
-- `on delete set null`: deleting a label unfiles whoever carried it and does
-- nothing else. Nobody is detached and no permission moves, which is what the
-- labels screen promises before the coach confirms.
-- ---------------------------------------------------------------------------
alter table public.coach_clients
  add column label_id uuid references public.roster_labels (id) on delete set null;

-- ---------------------------------------------------------------------------
-- And only the coach may set it.
--
-- The consent trigger was written the other way round — it lists what a coach
-- may *not* touch and lets the client write anything. Filing is the one column
-- that inverts that: it is the coach's, and a client reaching it would be
-- rearranging someone else's desk.
-- ---------------------------------------------------------------------------
create or replace function public.enforce_coach_client_column_rules()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
begin
  if current_user <> 'authenticated' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if actor = new.coach_id then
      new.status := 'pending';
      new.permissions := '{"workouts": false, "nutrition": false, "metrics": false,
                           "health": false, "monthly": false}'::jsonb;
      new.log_for := false;
      new.accepted_at := null;
    end if;

    return new;
  end if;

  if new.coach_id <> old.coach_id or new.client_id <> old.client_id then
    raise exception 'the link itself is immutable' using errcode = '42501';
  end if;

  if actor = new.client_id then
    -- The one column that belongs to the other side.
    if new.label_id is distinct from old.label_id then
      raise exception 'a label is the coach''s own filing' using errcode = '42501';
    end if;
    return new;
  end if;

  if new.permissions is distinct from old.permissions then
    raise exception 'only the client may change what they share' using errcode = '42501';
  end if;

  if new.log_for is distinct from old.log_for then
    raise exception 'only the client may allow a coach to log for them'
      using errcode = '42501';
  end if;

  if new.accepted_at is distinct from old.accepted_at then
    raise exception 'only the client may accept an invitation' using errcode = '42501';
  end if;

  if new.status is distinct from old.status
     and new.status not in ('paused', 'ended') then
    raise exception 'a coach may pause or end a link, not activate it'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- The roster, as one row per client.
--
-- `security_invoker`, which does more work here than anywhere else in the
-- schema. Every derived column below reads a table with its own policies, so
-- a coach who has not been given `workouts` sees NULL for the last session and
-- false for "training now" — not because this view checks, but because the
-- rows are not theirs to see. The roster cannot leak activity a client never
-- shared, and there is no second rule to keep in step with the first.
-- ---------------------------------------------------------------------------
create view public.roster_clients
with (security_invoker = on) as
select
  cc.coach_id,
  cc.client_id,
  cc.label_id,
  cc.permissions,
  cc.log_for,
  cc.accepted_at,
  u.full_name,
  u.avatar_url,
  (
    select max(s.finished_at)
      from public.workout_sessions s
     where s.client_id = cc.client_id and s.finished_at is not null
  ) as last_workout_at,
  -- A workout that was started and not finished. The roster's "training now".
  exists (
    select 1 from public.workout_sessions s
     where s.client_id = cc.client_id and s.finished_at is null
  ) as is_training,
  (
    select p.name
      from public.routine_instances i
      join public.program_routines r on r.id = i.program_routine_id
      join public.programs p on p.id = r.program_id
     where i.client_id = cc.client_id and i.coach_id = cc.coach_id
     order by i.order_index
     limit 1
  ) as program_name
from public.coach_clients cc
join public.users u on u.id = cc.client_id
where cc.status = 'active';

comment on view public.roster_clients is
  'One row per active client, with what the roster card shows. Obeys the caller''s own policies.';

grant select on public.roster_clients to authenticated;
