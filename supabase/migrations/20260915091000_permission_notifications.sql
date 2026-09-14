-- ---------------------------------------------------------------------------
-- Telling a coach that what they can see has changed.
--
-- The notifications migration hung access news off `access_requests`, on the
-- assumption that permissions only ever move by answering a request. They do
-- not. `set_coach_permission` writes straight to `coach_clients.permissions`
-- and only closes a request if one happened to be open — so a client hiding
-- their health profile from the Health screen changed what a coach could see
-- and told them nothing. The feed's own footer promises the opposite:
--
--   "Permission changes are always announced. You never lose access silently."
--
-- So the source of truth moves to where the truth is. `coach_clients.
-- permissions` is the column every domain policy reads; a trigger on it
-- catches every writer, including ones that do not exist yet.
--
-- The old `access_requests` trigger is dropped rather than kept alongside,
-- because the two would double up: `answer_access_request(grant => true)`
-- writes both tables, and the coach would be told twice about one decision.
-- What a request answer still owns is the one outcome the permissions column
-- cannot express — a decline, where the answer is no and nothing changes.
-- ---------------------------------------------------------------------------

drop trigger if exists access_requests_notify_answered on public.access_requests;
drop function if exists public.notify_access_answered();

alter table public.notifications drop constraint notifications_kind_known;

alter table public.notifications add constraint notifications_kind_known check (
  kind in (
    'session-done',
    'routine-assigned',
    'routine-updated',
    'check-in',
    'check-in-reply',
    'message',
    'access-requested',
    'access-granted',
    'access-revoked',
    -- Asked, and told no. Distinct from a revoke: nothing was taken away,
    -- because nothing had been given. A coach reading "Maya hid her nutrition"
    -- when she had never shared it would go looking for something that was
    -- never there.
    'access-declined',
    'attached',
    'detached'
  )
);

-- ---------------------------------------------------------------------------
-- The diff.
--
-- One notification per domain that actually moved, so turning two switches
-- sends two rows and re-saving an unchanged screen sends none.
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
  if new.permissions is not distinct from old.permissions then
    return new;
  end if;

  -- Detaching clears all five on its way out. The coach is already being told
  -- they were detached, which is the larger fact; five revocations underneath
  -- it would bury it.
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

  return new;
end;
$$;

create trigger coach_clients_notify_permissions
  after update on public.coach_clients
  for each row execute function public.notify_permissions_changed();

-- ---------------------------------------------------------------------------
-- And the answer that changes nothing.
--
-- Written by the function rather than by a trigger on `access_requests`,
-- because only the function knows the difference between "no" and "no, and
-- also turn off what you already had" — the second of which is a revoke, and
-- is already announced by the diff above.
-- ---------------------------------------------------------------------------
create or replace function public.answer_access_request(
  p_request_id uuid,
  p_grant boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_client uuid := auth.uid();
  v_request public.access_requests;
begin
  if v_client is null then
    raise exception 'you are not signed in' using errcode = '42501';
  end if;

  select r.* into v_request
    from public.access_requests r
   where r.id = p_request_id and r.client_id = v_client and r.answered_at is null;

  if not found then
    raise exception 'that request is not yours to answer' using errcode = '42501';
  end if;

  update public.access_requests
     set answered_at = now(), granted = p_grant
   where id = p_request_id;

  if p_grant then
    -- The diff on coach_clients announces this one.
    update public.coach_clients
       set permissions = permissions || jsonb_build_object(v_request.domain, true)
     where coach_id = v_request.coach_id and client_id = v_client;
  else
    perform public.push_notification(
      v_request.coach_id,
      v_client,
      'access-declined',
      jsonb_build_object('domain', v_request.domain)
    );
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- The feed learns the new kind.
-- ---------------------------------------------------------------------------
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
      when 'access-requested' then
        coalesce(split_part(r.actor_name, ' ', 1), 'Your coach') || ' asked to see your ' ||
        public.domain_label(r.payload ->> 'domain')
      when 'access-granted' then
        coalesce(split_part(r.actor_name, ' ', 1), 'Someone') || ' shared their ' ||
        public.domain_label(r.payload ->> 'domain')
      when 'access-revoked' then
        coalesce(split_part(r.actor_name, ' ', 1), 'Someone') || ' hid their ' ||
        public.domain_label(r.payload ->> 'domain')
      when 'access-declined' then
        coalesce(split_part(r.actor_name, ' ', 1), 'Someone') || ' declined to share their ' ||
        public.domain_label(r.payload ->> 'domain')
      when 'attached' then coalesce(r.actor_name, 'Someone') || ' attached'
      when 'detached' then coalesce(r.actor_name, 'Someone') || ' detached'
      else coalesce(split_part(r.actor_name, ' ', 1), 'Someone') || ' sent a message'
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
