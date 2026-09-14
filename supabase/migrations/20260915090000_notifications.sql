-- ---------------------------------------------------------------------------
-- Notifications.
--
-- One table for both sides of the app, because an activity update *is* a
-- notification: a coach reading "Maya finished Upper A" and Maya reading "Sam
-- assigned you Upper A" are the same event from opposite ends. The app had two
-- screens, two shapes and two names for that, and the bell ended up opening a
-- settings form.
--
-- Three decisions worth stating up front.
--
-- Structured, not rendered. A row stores a `kind` and a small payload; the
-- words are composed on read by `notifications_feed`. Storing finished
-- sentences would mean a copy change fixes only rows written after it, and a
-- feed that says two different things about the same event depending on when
-- it happened.
--
-- Written by trigger, never by the app. Nobody may insert here: a notification
-- is a fact about something that already happened, and a client that can write
-- one can tell a coach anything. The only thing a recipient may change is
-- `read_at`, on their own row.
--
-- Silent about what you cannot see. Every trigger checks the permission that
-- governs the underlying data before it writes. A coach who cannot see a
-- client's measurements must not learn from a notification that they were
-- taken — the feed would become a side channel around the thing the whole
-- permissions model exists to enforce.
-- ---------------------------------------------------------------------------

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.users (id) on delete cascade,
  -- Who did it. NULL once they delete their account: the event still happened,
  -- and a feed that loses rows when somebody leaves is a feed that rewrites
  -- history.
  actor_id uuid references public.users (id) on delete set null,
  kind text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  -- NULL while unread. A timestamp rather than a boolean because "when did
  -- they see this" is the question that follows "did they".
  read_at timestamptz,

  -- No 'session-missed'. Nothing in Ligo is scheduled to a day, so nothing can
  -- be missed — the coach's home derives "needs a look" from silence instead,
  -- which is a state and not an event.
  constraint notifications_kind_known check (
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
      'attached',
      'detached'
    )
  ),
  constraint notifications_not_self check (actor_id is null or actor_id <> recipient_id)
);

comment on table public.notifications is
  'One feed, both sides. Written by trigger; the app may only mark rows read.';

-- The feed's only query: this person's rows, newest first.
create index notifications_recipient_idx
  on public.notifications (recipient_id, created_at desc);

-- And the dot on the bell, which asks a narrower question far more often.
create index notifications_unread_idx
  on public.notifications (recipient_id)
  where read_at is null;

alter table public.notifications enable row level security;

create policy notifications_select_own on public.notifications
  for select to authenticated
  using (recipient_id = (select auth.uid()));

create policy notifications_update_own on public.notifications
  for update to authenticated
  using (recipient_id = (select auth.uid()))
  with check (recipient_id = (select auth.uid()));

-- No insert policy: rows arrive only from the triggers below, which run as the
-- owner. No delete policy: a feed you can prune is a feed that can be made to
-- forget an access change, which is the one thing it exists to remember.

-- ---------------------------------------------------------------------------
-- Marking read is the only write, and this is what keeps it the only one.
--
-- `notifications_update_own` is row-scoped, not column-scoped, so without this
-- a recipient could PATCH their own row's `kind` or `payload` and rewrite what
-- they were told.
-- ---------------------------------------------------------------------------
create or replace function public.enforce_notification_column_rules()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user <> 'authenticated' then
    return new;
  end if;

  if new.id <> old.id
     or new.recipient_id <> old.recipient_id
     or new.actor_id is distinct from old.actor_id
     or new.kind <> old.kind
     or new.payload is distinct from old.payload
     or new.created_at <> old.created_at then
    raise exception 'only read_at may be changed' using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger notifications_column_rules
  before update on public.notifications
  for each row execute function public.enforce_notification_column_rules();

revoke all on public.notifications from anon, authenticated;
grant select, update on public.notifications to authenticated;

-- ---------------------------------------------------------------------------
-- Writing one.
--
-- Every trigger below goes through here rather than inserting directly, so
-- there is one place that knows a notification to nobody is not written and a
-- notification to yourself is not a notification.
-- ---------------------------------------------------------------------------
create or replace function public.push_notification(
  p_recipient uuid,
  p_actor uuid,
  p_kind text,
  p_payload jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_recipient is null or p_recipient = p_actor then
    return;
  end if;

  insert into public.notifications (recipient_id, actor_id, kind, payload)
  values (p_recipient, p_actor, p_kind, coalesce(p_payload, '{}'::jsonb));
end;
$$;

-- ---------------------------------------------------------------------------
-- The coach who may see a given domain of a given client, if there is one.
--
-- `has_client_permission` cannot be used here: it asks about `auth.uid()`, and
-- inside these triggers the caller is the client, not the coach. This asks the
-- same question from the other direction.
-- ---------------------------------------------------------------------------
create or replace function public.coach_who_may_see(p_client_id uuid, p_domain text)
returns uuid
language sql
security definer
stable
set search_path = ''
as $$
  select cc.coach_id
    from public.coach_clients cc
   where cc.client_id = p_client_id
     and cc.status = 'active'
     and coalesce((cc.permissions ->> p_domain)::boolean, false)
   limit 1;
$$;

comment on function public.coach_who_may_see(uuid, text) is
  'The active coach allowed to see this domain, or NULL. The trigger-side twin of has_client_permission.';

-- ---------------------------------------------------------------------------
-- A finished workout. The one event a coach opens the app for.
--
-- On the transition into finished, not on every update: a workout is finished
-- once, and a rename afterwards is not news.
-- ---------------------------------------------------------------------------
create or replace function public.notify_session_finished()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_coach uuid;
  v_sets integer;
begin
  if new.finished_at is null or old.finished_at is not null then
    return new;
  end if;

  v_coach := public.coach_who_may_see(new.client_id, 'workouts');
  if v_coach is null then
    return new;
  end if;

  select count(*) into v_sets
    from public.workout_sets ws
    join public.workout_exercises we on we.id = ws.workout_exercise_id
   where we.workout_session_id = new.id
     and ws.completed;

  perform public.push_notification(
    v_coach,
    new.client_id,
    'session-done',
    jsonb_build_object(
      'session_id', new.id,
      'title', new.title,
      'sets', v_sets,
      'minutes', greatest(0, round(extract(epoch from (new.finished_at - new.started_at)) / 60))
    )
  );

  return new;
end;
$$;

create trigger workout_sessions_notify_finished
  after update on public.workout_sessions
  for each row execute function public.notify_session_finished();

-- ---------------------------------------------------------------------------
-- A check-in, in whichever direction it was written.
--
-- A client logging one is news for their coach; a coach logging one on a
-- client's behalf is news for the client, who is entitled to know what
-- appeared on their own screen that they did not put there.
-- ---------------------------------------------------------------------------
create or replace function public.notify_check_in()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_coach uuid;
begin
  if new.logged_by = new.client_id then
    v_coach := coalesce(
      public.coach_who_may_see(new.client_id, 'monthly'),
      public.coach_who_may_see(new.client_id, 'metrics')
    );

    perform public.push_notification(
      v_coach,
      new.client_id,
      'check-in',
      jsonb_build_object('check_in_id', new.id, 'weight_kg', new.weight_kg)
    );
  else
    perform public.push_notification(
      new.client_id,
      new.logged_by,
      'check-in-reply',
      jsonb_build_object('check_in_id', new.id)
    );
  end if;

  return new;
end;
$$;

create trigger body_measurements_notify
  after insert on public.body_measurements
  for each row execute function public.notify_check_in();

-- ---------------------------------------------------------------------------
-- Asking to see something, and the answer.
--
-- Both halves matter. The ask is the moment a client decides, and the answer
-- is the coach learning what they may now do — or may no longer.
-- ---------------------------------------------------------------------------
create or replace function public.notify_access_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.push_notification(
    new.client_id,
    new.coach_id,
    'access-requested',
    jsonb_build_object('domain', new.domain, 'request_id', new.id)
  );
  return new;
end;
$$;

create trigger access_requests_notify_asked
  after insert on public.access_requests
  for each row execute function public.notify_access_request();

create or replace function public.notify_access_answered()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.answered_at is null or old.answered_at is not null then
    return new;
  end if;

  perform public.push_notification(
    new.coach_id,
    new.client_id,
    case when new.granted then 'access-granted' else 'access-revoked' end,
    jsonb_build_object('domain', new.domain)
  );
  return new;
end;
$$;

create trigger access_requests_notify_answered
  after update on public.access_requests
  for each row execute function public.notify_access_answered();

-- ---------------------------------------------------------------------------
-- Attaching and detaching — the largest access changes there are.
--
-- Both parties are told, because both parties' screens change. A detach in
-- particular is announced to whoever did not do it, which is the promise the
-- feed's footer makes.
-- ---------------------------------------------------------------------------
create or replace function public.notify_link_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
begin
  if new.status = 'active' and (tg_op = 'INSERT' or old.status <> 'active') then
    perform public.push_notification(new.coach_id, new.client_id, 'attached', '{}'::jsonb);
    perform public.push_notification(new.client_id, new.coach_id, 'attached', '{}'::jsonb);
    return new;
  end if;

  if tg_op = 'UPDATE' and old.status = 'active' and new.status <> 'active' then
    -- Told to whoever did not do it. `push_notification` drops the one where
    -- actor and recipient are the same person, so this is both lines.
    perform public.push_notification(new.coach_id, v_actor, 'detached', '{}'::jsonb);
    perform public.push_notification(new.client_id, v_actor, 'detached', '{}'::jsonb);
  end if;

  return new;
end;
$$;

create trigger coach_clients_notify_link
  after insert or update on public.coach_clients
  for each row execute function public.notify_link_changed();

-- ---------------------------------------------------------------------------
-- A routine arriving, and a change to one already assigned.
-- ---------------------------------------------------------------------------
create or replace function public.notify_routine_assigned()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.coach_id is null then
    return new;
  end if;

  perform public.push_notification(
    new.client_id,
    new.coach_id,
    'routine-assigned',
    jsonb_build_object('routine_instance_id', new.id, 'name', new.name)
  );
  return new;
end;
$$;

create trigger routine_instances_notify_assigned
  after insert on public.routine_instances
  for each row execute function public.notify_routine_assigned();

create or replace function public.notify_routine_updated()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_client uuid;
  v_coach uuid;
  v_name text;
begin
  select ri.client_id, ri.coach_id, ri.name into v_client, v_coach, v_name
    from public.routine_instances ri
   where ri.id = new.routine_instance_id;

  perform public.push_notification(
    v_client,
    v_coach,
    'routine-updated',
    jsonb_build_object('routine_instance_id', new.routine_instance_id, 'name', v_name,
                       'summary', new.summary)
  );
  return new;
end;
$$;

create trigger routine_updates_notify
  after insert on public.routine_updates
  for each row execute function public.notify_routine_updated();

-- ---------------------------------------------------------------------------
-- Two small helpers the feed leans on, kept separate so the composition below
-- reads as prose rather than as string surgery. Defined first: a `language sql`
-- body is parsed when it is created, so a function it calls must already exist.
-- ---------------------------------------------------------------------------
create or replace function public.domain_label(p_domain text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_domain
    when 'workouts' then 'workouts'
    when 'nutrition' then 'nutrition'
    when 'metrics' then 'measurements'
    when 'health' then 'health profile'
    when 'monthly' then 'check-ins'
    else 'data'
  end;
$$;

-- "Maya Andersson" → "MA". First and last, matching the app's own rule.
create or replace function public.name_initials(p_name text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when coalesce(btrim(p_name), '') = '' then '?'
    else upper(
      left(split_part(btrim(p_name), ' ', 1), 1) ||
      case
        when array_length(string_to_array(btrim(p_name), ' '), 1) > 1
          then left(split_part(btrim(p_name), ' ',
                    array_length(string_to_array(btrim(p_name), ' '), 1)), 1)
        else ''
      end
    )
  end;
$$;

-- ---------------------------------------------------------------------------
-- Reading the feed.
--
-- The words are composed here, from the kind and the payload, so a copy change
-- reaches every row ever written. So is the destination — see
-- `src/lib/notifications.ts`, which refuses anything this does not produce.
--
-- Grouping stays server-side for the reason it always did: "TODAY" depends on
-- a clock and a timezone, and the device should not be guessing at either for
-- a list it did not compose.
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
           -- Whether the person reading this is the coach in the relationship,
           -- which decides where half the rows point.
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
      when 'attached' then 'Say hello.'
      when 'detached' then 'Their data went with them. The thread stays readable.'
      else 'Open the thread to reply.'
    end as body,
    -- "2h" | "1d" | "1w". Composed here so every row in the list is stamped by
    -- the same clock — the server's — rather than by whatever the phone says.
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
        -- Everything a coach is told is about one client, and their page is
        -- where it is acted on. The same row read by a client goes nowhere in
        -- particular, so it goes to their own profile.
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

comment on function public.notifications_feed(integer) is
  'The caller own feed, words and destinations composed. security invoker: RLS decides whose rows.';

grant execute on function public.notifications_feed(integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Marking one read.
--
-- An RPC rather than a PATCH so the app never has to name a column, and so
-- "already read" is not an error — tapping a row twice is a normal thing to do
-- with a thumb.
-- ---------------------------------------------------------------------------
create or replace function public.mark_notification_read(p_id uuid)
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.notifications
     set read_at = coalesce(read_at, now())
   where id = p_id
     and recipient_id = auth.uid();
$$;

grant execute on function public.mark_notification_read(uuid) to authenticated;

create or replace function public.unread_notification_count()
returns integer
language sql
security invoker
stable
set search_path = ''
as $$
  select count(*)::integer
    from public.notifications
   where recipient_id = auth.uid()
     and read_at is null;
$$;

grant execute on function public.unread_notification_count() to authenticated;
