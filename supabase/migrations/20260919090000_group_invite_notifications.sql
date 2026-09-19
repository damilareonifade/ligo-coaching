-- ---------------------------------------------------------------------------
-- Telling somebody they were invited.
--
-- `invite_to_group` wrote a row and stopped. The row is read by exactly one
-- function, `my_group_invites`, which is read by exactly one screen — the
-- Community index, which a client reaches through Profile. So an invitation
-- arrived silently and waited to be stumbled upon: no bell, no dot, nothing on
-- any screen the person was likely to open. The comment at the top of
-- `20260918097000_group_invites.sql` claims an invite "arrives on their screen
-- instead of over WhatsApp", and that was the half of it that was not true.
--
-- Everything needed already existed: eight triggers, a bell in `ScreenHeader`
-- with an unread dot, and `push_notification` to write through. This adds the
-- ninth kind.
--
-- Deliberately only the asking. Answering is not notified back to the inviter:
-- `GROUP_INVITE_NOTE` promises "you are told who accepted, never who declined
-- and why", and a notification per answer cannot keep that promise — a silence
-- that arrives at a predictable moment is itself an answer. Who accepted shows
-- up as a member, which is the telling the promise actually describes.
-- ---------------------------------------------------------------------------
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
    'access-declined',
    'attached',
    'detached',
    -- Asked into a group. Not a membership: `respond_to_group_invite` is
    -- still the only thing that makes one, and it needs an answer first.
    'group-invite'
  )
);

-- ---------------------------------------------------------------------------
-- The trigger.
--
-- On insert only. An invitation being answered updates the same row, and an
-- update firing this would tell somebody they had been invited at the moment
-- they declined.
--
-- The group's name is copied into the payload rather than joined at read time,
-- because a notification says what happened when it happened: a group renamed
-- next month should not rewrite the sentence somebody was shown last month.
-- ---------------------------------------------------------------------------
create or replace function public.notify_group_invite()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_group_name text;
begin
  select g.name into v_group_name from public.groups g where g.id = new.group_id;

  perform public.push_notification(
    new.invitee_id,
    new.invited_by,
    'group-invite',
    jsonb_build_object(
      'invite_id', new.id,
      'group_id', new.group_id,
      'group_name', v_group_name
    )
  );

  return new;
end;
$$;

create trigger group_invites_notify
  after insert on public.group_invites
  for each row execute function public.notify_group_invite();

-- ---------------------------------------------------------------------------
-- The feed learns the new kind.
--
-- Recreated whole rather than patched: `notifications_feed` composes every
-- sentence in one `case`, so there is no way to add one without restating it.
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
      -- The inviter by their real name, which is not a leak: `invite_to_group`
      -- only accepts people the caller is `is_linked_to`, so these two already
      -- know each other off the roster. A group *handle* belongs to a group's
      -- thread; this sentence is about the person who asked.
      when 'group-invite' then
        coalesce(split_part(r.actor_name, ' ', 1), 'Someone') || ' invited you to ' ||
        coalesce(r.payload ->> 'group_name', 'a group')
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
      -- The same promise the invite screen makes, in the place somebody sees
      -- first: being asked is not being added.
      when 'group-invite' then 'You are not in it until you say yes.'
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
      -- Straight to the decision, not to the list holding it. Tapping a
      -- notification for an invitation already answered is safe: that screen
      -- reads the pending list and says the invitation is no longer open.
      when 'group-invite' then
        jsonb_build_object('kind', 'screen', 'route',
                           '/community/invite/' || (r.payload ->> 'invite_id'))
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
