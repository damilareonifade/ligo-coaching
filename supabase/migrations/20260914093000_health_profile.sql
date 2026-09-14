-- ---------------------------------------------------------------------------
-- The client's health profile.
--
-- Injuries, conditions, medication and allergies — the most sensitive thing
-- this app stores, and the one a coach is most likely to want and least
-- entitled to by default.
--
-- The sharing switch needs nothing new: `health` is already one of the five
-- keys in `coach_clients.permissions`, set through `set_coach_permission`, and
-- read by `has_client_permission` like every other domain. What was missing
-- was somewhere to put the entries themselves.
--
-- One table, not three. "Injuries", "Conditions" and "Medication & allergies"
-- are headings on a screen — copy, composed on the device with the notes that
-- sit under them. A table per heading would make a wording change a migration.
-- ---------------------------------------------------------------------------
create table public.health_entries (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.users (id) on delete cascade,
  -- Which card it appears under. Constrained rather than free text: the screen
  -- renders three sections and an entry filed under a fourth would vanish.
  section text not null,
  -- "Left shoulder" / "Asthma" / "Salbutamol".
  label text not null,
  -- "Impingement, cleared Feb 2026".
  value text not null default '',
  -- Only meaningful on an injury: whether it is a live constraint or one to
  -- keep an eye on. NULL everywhere else, and nothing invents one.
  status text,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint health_entries_section_known
    check (section in ('injuries', 'conditions', 'medication')),
  constraint health_entries_label_not_blank check (length(btrim(label)) > 0),
  constraint health_entries_status_known
    check (status is null or status in ('Active', 'Watch', 'Resolved')),
  -- A status on a condition or a prescription would render as a chip nobody
  -- chose the meaning of.
  constraint health_entries_status_is_for_injuries
    check (status is null or section = 'injuries')
);

comment on table public.health_entries is
  'Injuries, conditions and medication. A coach sees these only with `health`.';

create index health_entries_client_idx
  on public.health_entries (client_id, section, order_index);

create trigger health_entries_set_updated_at
  before update on public.health_entries
  for each row execute function public.set_updated_at();

alter table public.health_entries enable row level security;

-- Theirs entirely. Writing is never delegated, `log_for` included: a coach
-- entering somebody's medical history on their behalf is a different act from
-- logging a set for them, and nothing in the app asks for it.
create policy health_entries_all_own on public.health_entries
  for all to authenticated
  using (client_id = (select auth.uid()))
  with check (client_id = (select auth.uid()));

-- Read only, and only with the permission the client set themselves.
create policy health_entries_select_as_coach on public.health_entries
  for select to authenticated
  using (public.has_client_permission(client_id, 'health'));

revoke all on public.health_entries from anon, authenticated;
grant select, insert, update, delete on public.health_entries to authenticated;
