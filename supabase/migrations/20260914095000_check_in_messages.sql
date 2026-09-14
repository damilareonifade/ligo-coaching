-- ---------------------------------------------------------------------------
-- Saying which measurement is wrong, and what would be right.
--
-- `body_measurements_sane` does its job — a 10 cm waist is not a waist — but
-- it does it by rejecting the whole row with
--
--   new row for relation "body_measurements" violates check constraint
--   "body_measurements_sane"
--
-- which reaches the client as a toast naming a constraint they have never
-- heard of, on a form with five fields, without saying which one. The range
-- stays exactly as it was; only the telling changes.
--
-- Checked here rather than on the phone so there is one set of bounds rather
-- than two that drift, and so a coach logging on somebody's behalf gets the
-- same answer. The constraint remains underneath as the backstop — this is
-- the explanation, not the rule.
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
    raise exception 'A check-in needs at least one measurement.' using errcode = '23514';
  end if;

  -- Each named, because the form has five boxes and "one of these is wrong" is
  -- not something a person can act on.
  if p_weight_kg is not null and p_weight_kg not between 20 and 500 then
    raise exception 'Weight should be between 20 and 500 kg.' using errcode = '23514';
  end if;

  if p_waist_cm is not null and p_waist_cm not between 20 and 300 then
    raise exception 'Waist should be between 20 and 300 cm.' using errcode = '23514';
  end if;

  if p_chest_cm is not null and p_chest_cm not between 20 and 300 then
    raise exception 'Chest should be between 20 and 300 cm.' using errcode = '23514';
  end if;

  if p_hips_cm is not null and p_hips_cm not between 20 and 300 then
    raise exception 'Hips should be between 20 and 300 cm.' using errcode = '23514';
  end if;

  if p_body_fat_pct is not null and p_body_fat_pct not between 1 and 70 then
    raise exception 'Body fat should be between 1 and 70%%.' using errcode = '23514';
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
      raise exception 'That check-in is not yours to edit.' using errcode = '42501';
    end if;
  end if;

  return v_id;
end;
$$;

grant execute on function public.save_check_in(
  uuid, uuid, numeric, numeric, numeric, numeric, numeric, text) to authenticated;
