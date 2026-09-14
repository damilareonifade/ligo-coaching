-- ---------------------------------------------------------------------------
-- Letting a coach log for you, and taking it back.
--
-- `log_for` is the sixth permission and the only one with no way to set it
-- after attaching: it was collected on the onboarding screen and then frozen.
-- It is also the most consequential of the six — the other five let a coach
-- *read*; this one lets them *write*, in the client's name, into the same
-- history the client is judged by.
--
-- Two gaps closed here. It needs a setter, and it needs to be announced: the
-- diff trigger added with the permission notifications watches the
-- `permissions` jsonb, and `log_for` is its own column, so turning it off
-- changed what a coach could do and told them nothing.
-- ---------------------------------------------------------------------------

create or replace function public.set_log_for(p_allowed boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_client uuid := auth.uid();
  v_coach uuid;
begin
  if v_client is null then
    raise exception 'you are not signed in' using errcode = '42501';
  end if;

  -- Definer, so the scoping RLS would have done is written out: this touches
  -- the caller's own link and no other.
  update public.coach_clients
     set log_for = coalesce(p_allowed, false)
   where client_id = v_client and status = 'active'
  returning coach_id into v_coach;

  if v_coach is null then
    raise exception 'you have no coach attached' using errcode = '42501';
  end if;
end;
$$;

comment on function public.set_log_for(boolean) is
  'The client alone decides whether their coach may write in their name.';

grant execute on function public.set_log_for(boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- The diff now watches both.
-- ---------------------------------------------------------------------------
create or replace function public.notify_permissions_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_domain text;
  v_was boolean;
  v_now boolean;
begin
  if new.permissions is not distinct from old.permissions
     and new.log_for is not distinct from old.log_for then
    return new;
  end if;

  -- Detaching clears all of them on its way out. The coach is already being
  -- told they were detached, which is the larger fact; six revocations
  -- underneath it would bury it.
  if new.status = 'ended' and old.status <> 'ended' then
    return new;
  end if;

  foreach v_domain in array array['workouts', 'nutrition', 'metrics', 'health', 'monthly'] loop
    v_was := coalesce((old.permissions ->> v_domain)::boolean, false);
    v_now := coalesce((new.permissions ->> v_domain)::boolean, false);

    if v_was is distinct from v_now then
      perform public.push_notification(
        new.coach_id,
        new.client_id,
        case when v_now then 'access-granted' else 'access-revoked' end,
        jsonb_build_object('domain', v_domain)
      );
    end if;
  end loop;

  if new.log_for is distinct from old.log_for then
    perform public.push_notification(
      new.coach_id,
      new.client_id,
      case when new.log_for then 'access-granted' else 'access-revoked' end,
      jsonb_build_object('domain', 'log_for')
    );
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- And it reads as a sentence rather than as a column name.
--
-- "Maya shared their logging for them" is what a generic label produces, so
-- the access kinds get their own phrasing function. Extracted rather than
-- nested inside `notifications_feed`, which is long enough already and has
-- now been rewritten twice.
-- ---------------------------------------------------------------------------
create or replace function public.access_phrase(
  p_first text,
  p_kind text,
  p_domain text
)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_domain = 'log_for' then
      case p_kind
        when 'access-granted' then p_first || ' let you log sessions for them'
        when 'access-revoked' then p_first || ' stopped you logging for them'
        when 'access-declined' then p_first || ' would rather log their own sessions'
        else p_first || ' asked about logging sessions for them'
      end
    else
      case p_kind
        when 'access-granted' then p_first || ' shared their ' || public.domain_label(p_domain)
        when 'access-revoked' then p_first || ' hid their ' || public.domain_label(p_domain)
        when 'access-declined' then
          p_first || ' declined to share their ' || public.domain_label(p_domain)
        else p_first || ' asked to see your ' || public.domain_label(p_domain)
      end
  end;
$$;

create or replace function public.notifications_feed(p_limit integer default 50)
returns table (
  id uuid,
  kind text,
  title text,
  body text,
  "when" text,
  unread boolean,
  person jsonb,
  destination jsonb,
  group_id text,
  group_title text
)
language sql
security invoker
stable
set search_path = ''
as $$
  with rows as (
    select n.*,
           u.full_name as actor_name,
           (me.role = 'coach') as reader_is_coach,
           now() - n.created_at as age
      from public.notifications n
      join public.users me on me.id = n.recipient_id
      left join public.users u on u.id = n.actor_id
     where n.recipient_id = auth.uid()
     order by n.created_at desc
     limit least(greatest(coalesce(p_limit, 50), 1), 200)
  )
  select
    r.id,
    r.kind,
    case r.kind
      when 'session-done' then
        coalesce(split_part(r.actor_name, ' ', 1), 'Someone') || ' finished ' ||
        coalesce(r.payload ->> 'title', 'a workout')
      when 'check-in' then
        coalesce(split_part(r.actor_name, ' ', 1), 'Someone') || ' logged a check-in'
      when 'check-in-reply' then
        coalesce(split_part(r.actor_name, ' ', 1), 'Your coach') || ' updated your check-in'
      when 'routine-assigned' then
        coalesce(split_part(r.actor_name, ' ', 1), 'Your coach') || ' assigned you ' ||
        coalesce(r.payload ->> 'name', 'a routine')
      when 'routine-updated' then
        coalesce(split_part(r.actor_name, ' ', 1), 'Your coach') || ' changed ' ||
        coalesce(r.payload ->> 'name', 'a routine')
      when 'attached' then coalesce(r.actor_name, 'Someone') || ' attached'
      when 'detached' then coalesce(r.actor_name, 'Someone') || ' detached'
      when 'message' then
        coalesce(split_part(r.actor_name, ' ', 1), 'Someone') || ' sent a message'
      else
        public.access_phrase(
          coalesce(split_part(r.actor_name, ' ', 1), 'Someone'),
          r.kind,
          r.payload ->> 'domain'
        )
    end as title,
    case r.kind
      when 'session-done' then
        coalesce(r.payload ->> 'sets', '0') || ' sets · ' ||
        coalesce(r.payload ->> 'minutes', '0') || ' min'
      when 'check-in' then
        coalesce((r.payload ->> 'weight_kg') || ' kg', 'Measurements updated')
      when 'check-in-reply' then 'Logged on your behalf. Open it to check.'
      when 'routine-assigned' then 'It is on your Train tab now.'
      when 'routine-updated' then
        coalesce(nullif(r.payload ->> 'summary', ''), 'Your copy is untouched until you accept it.')
      when 'access-requested' then 'Nothing opens up until you say yes.'
      when 'access-granted' then 'You can see it from their page.'
      when 'access-revoked' then 'Everything else they share is unchanged.'
      when 'access-declined' then 'Nothing changed. You can ask again later.'
      when 'attached' then 'Say hello.'
      when 'detached' then 'Their data went with them. The thread stays readable.'
      else 'Open the thread to reply.'
    end as body,
    case
      when r.age < interval '1 minute' then 'now'
      when r.age < interval '1 hour' then floor(extract(epoch from r.age) / 60)::text || 'm'
      when r.age < interval '1 day' then floor(extract(epoch from r.age) / 3600)::text || 'h'
      when r.age < interval '7 days' then floor(extract(epoch from r.age) / 86400)::text || 'd'
      else floor(extract(epoch from r.age) / 604800)::text || 'w'
    end as "when",
    (r.read_at is null) as unread,
    case
      when r.actor_id is null then null
      else jsonb_build_object('id', r.actor_id, 'name', r.actor_name,
                              'initials', public.name_initials(r.actor_name))
    end as person,
    case r.kind
      when 'detached' then null
      when 'access-requested' then jsonb_build_object('kind', 'screen', 'route', '/profile')
      when 'check-in-reply' then jsonb_build_object('kind', 'screen', 'route', '/check-ins')
      when 'routine-assigned' then jsonb_build_object('kind', 'screen', 'route', '/train')
      when 'routine-updated' then jsonb_build_object('kind', 'screen', 'route', '/train')
      when 'message' then
        case when r.reader_is_coach
          then jsonb_build_object('kind', 'screen', 'route', '/messages/' || r.actor_id)
          else jsonb_build_object('kind', 'screen', 'route', '/coach/chat')
        end
      else
        case when r.reader_is_coach and r.actor_id is not null
          then jsonb_build_object('kind', 'screen', 'route', '/student/' || r.actor_id)
          else jsonb_build_object('kind', 'screen', 'route', '/profile')
        end
    end as destination,
    case
      when r.created_at >= date_trunc('day', now()) then 'today'
      when r.created_at >= now() - interval '7 days' then 'earlier'
      else 'older'
    end as group_id,
    case
      when r.created_at >= date_trunc('day', now()) then 'TODAY'
      when r.created_at >= now() - interval '7 days' then 'EARLIER THIS WEEK'
      else 'EARLIER'
    end as group_title
  from rows r
  order by r.created_at desc;
$$;

grant execute on function public.notifications_feed(integer) to authenticated;
