-- ---------------------------------------------------------------------------
-- Monthly check-ins.
--
-- No new table. A check-in *is* a `body_measurements` row — a weight, a set of
-- measurements, a note and who wrote it — which is the shape that table was
-- given when Progress was built, for exactly this.
--
-- "Monthly" is a grouping, not a rule. Nobody is stopped from weighing
-- themselves twice in a month; the check-in for a month is simply the most
-- recent row in it. That keeps one place recording a waist measurement instead
-- of two that eventually disagree, and it means a weight logged from the
-- Progress card and a full check-in are the same fact written once.
--
-- Two permissions meet here and they are not the same one:
--
--   `metrics` — the coach may see weight and measurements.
--   `monthly` — the coach may see the check-in view, notes included, and log
--               one on the client's behalf.
--
-- Either grants a read of the underlying row, because it is one row. The
-- screen's toggle sets `monthly`, and says so.
-- ---------------------------------------------------------------------------
create or replace function public.monthly_check_ins(
  p_client_id uuid,
  p_months integer default 12
)
returns table (
  id uuid,
  month_start timestamptz,
  measured_at timestamptz,
  weight_kg numeric,
  waist_cm numeric,
  chest_cm numeric,
  hips_cm numeric,
  body_fat_pct numeric,
  note text,
  logged_by_client boolean
)
language sql
security definer
stable
set search_path = ''
as $$
  -- `distinct on` with the month first takes one row per month, and the
  -- ordering inside it decides which: the most recent. A month where somebody
  -- weighed in twice shows the later reading rather than two cards with the
  -- same heading.
  select distinct on (date_trunc('month', m.measured_at))
    m.id,
    date_trunc('month', m.measured_at) as month_start,
    m.measured_at,
    m.weight_kg,
    m.waist_cm,
    m.chest_cm,
    m.hips_cm,
    m.body_fat_pct,
    m.note,
    (m.logged_by = m.client_id) as logged_by_client
  from public.body_measurements m
  where m.client_id = p_client_id
    and m.measured_at > now() - (least(greatest(coalesce(p_months, 12), 1), 60) * interval '1 month')
    and (
      p_client_id = auth.uid()
      or public.has_client_permission(p_client_id, 'monthly')
      or public.has_client_permission(p_client_id, 'metrics')
    )
  order by date_trunc('month', m.measured_at) desc, m.measured_at desc;
$$;

comment on function public.monthly_check_ins(uuid, integer) is
  'One row per month, the latest in each. A check-in is a body_measurements row.';

grant execute on function public.monthly_check_ins(uuid, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- And the coach reads them under either permission, because it is one row.
--
-- The policy asked for `metrics` alone, so a client who shared check-ins but
-- not measurements would have shared nothing — the toggle on the check-ins
-- screen would have been a switch that did not reach the rows it described.
-- ---------------------------------------------------------------------------
drop policy body_measurements_select_as_coach on public.body_measurements;

create policy body_measurements_select_as_coach on public.body_measurements
  for select to authenticated
  using (
    public.has_client_permission(client_id, 'metrics')
    or public.has_client_permission(client_id, 'monthly')
  );

-- ---------------------------------------------------------------------------
-- Writing one.
--
-- A month is addressed by its own row: editing passes the id, adding passes
-- none. A coach may do either for a client who turned on `log_for`, and the
-- row records which of them wrote it — the client is entitled to know what on
-- their own screen they did not put there.
-- ---------------------------------------------------------------------------
create or replace function public.save_check_in(
  p_client_id uuid,
  p_check_in_id uuid default null,
  p_weight_kg numeric default null,
  p_waist_cm numeric default null,
  p_chest_cm numeric default null,
  p_hips_cm numeric default null,
  p_body_fat_pct numeric default null,
  p_note text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_id uuid := p_check_in_id;
begin
  if v_actor is null then
    raise exception 'you are not signed in' using errcode = '42501';
  end if;

  if p_weight_kg is null and p_waist_cm is null and p_chest_cm is null
     and p_hips_cm is null and p_body_fat_pct is null then
    raise exception 'a check-in needs at least one measurement' using errcode = '23514';
  end if;

  if v_id is null then
    -- RLS decides whether this is allowed: the client's own policy, or the
    -- coach one that requires `log_for`.
    insert into public.body_measurements
      (client_id, weight_kg, waist_cm, chest_cm, hips_cm, body_fat_pct, note, logged_by)
    values (p_client_id, p_weight_kg, p_waist_cm, p_chest_cm, p_hips_cm,
            p_body_fat_pct, nullif(btrim(p_note), ''), v_actor)
    returning id into v_id;
  else
    update public.body_measurements
       set weight_kg = p_weight_kg,
           waist_cm = p_waist_cm,
           chest_cm = p_chest_cm,
           hips_cm = p_hips_cm,
           body_fat_pct = p_body_fat_pct,
           note = nullif(btrim(p_note), ''),
           -- Re-stamped: whoever last changed it is who it now says wrote it.
           logged_by = v_actor
     where id = v_id and client_id = p_client_id;

    if not found then
      raise exception 'that check-in is not yours to edit' using errcode = '42501';
    end if;
  end if;

  return v_id;
end;
$$;

comment on function public.save_check_in(uuid, uuid, numeric, numeric, numeric, numeric, numeric, text) is
  'Adds or rewrites one check-in. RLS decides whether the caller may.';

grant execute on function public.save_check_in(
  uuid, uuid, numeric, numeric, numeric, numeric, numeric, text) to authenticated;

-- ---------------------------------------------------------------------------
-- A coach updating one needs the same `log_for` that lets them add one.
--
-- `body_measurements` had an insert policy for a coach but no update policy,
-- so a coach could write a check-in and then not correct a typo in it.
-- ---------------------------------------------------------------------------
create policy body_measurements_update_as_coach on public.body_measurements
  for update to authenticated
  using (public.can_log_for(client_id))
  with check (public.can_log_for(client_id) and logged_by = (select auth.uid()));
