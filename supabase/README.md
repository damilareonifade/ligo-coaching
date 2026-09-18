# Database

The schema lives in `migrations/`, applied in filename order. Nothing in the
app creates or alters tables — see **Why the app cannot migrate** below.

## Layout

| Table | Purpose |
|---|---|
| `public.users` | Profile mirror of `auth.users`. Created by trigger on signup. Holds `role`, which decides which half of the app renders. |
| `public.sessions` | App-level device sessions — which devices are signed in, when each was last seen, where to push. Not a copy of `auth.sessions`. |
| `public.cache` | Per-user key/value cache with an optional TTL. Never a source of truth. |
| `public.password_reset_requests` | Audit trail and rate-limit ledger for resets. **No tokens** — GoTrue owns those. |
| `public.coach_clients` | Roster membership. The authority on which coach may read which client. |
| `public.coach_code_lookups` | Every invite code tried and by whom. Rate-limit ledger; nobody reads it through the API. |
| `public.access_requests` | A coach asking a client to share a domain. A question, never a grant. |
| `public.coach_profiles` | Gym, bio and specialties. A coach's public face — shown to anyone holding their code. |
| `public.health_entries` | Injuries, conditions and medication. The client's alone to write; a coach reads them only with `health`. |
| `public.client_profiles` | Goals, experience and sessions per week. Their coach sees it only with `workouts`. |
| `public.roster_labels` | A coach's own filing. Private to them — a client never sees they were filed under "Prep". |
| `public.coach_live_sessions` *(view)* | Clients with a workout open right now, and whether this coach may change it. |
| `public.roster_clients` *(view)* | One row per active client with what the roster card shows. `security_invoker`, so training activity appears only where the client shared it. |
| `public.body_measurements` | One row per logging moment — weight and measurements, every column nullable. Check-ins will read these rather than copy them. |
| `public.threads` | One conversation. Two members when direct, many when it belongs to a group. |
| `public.thread_members` | Who is in a thread, and how far each of them has read. |
| `public.messages` | One turn in a conversation. Never edited, never deleted. |
| `public.groups` | A named conversation belonging to whoever made it. Joined with a code. |
| `public.group_invites` | A question put to somebody. Answering it is the only thing that adds them. |
| `public.board_members` | Who has agreed to appear on a group's ranking. Being in the group is not enough. |

### Coach ↔ client

One direction of travel: **the coach publishes a code, the client enters it, and
the client decides what is shared.** There is deliberately no way for a coach to
look someone up — an "invite by email" box is an account checker.

`users.invite_code` is issued by trigger the moment an account becomes a coach
(which is not always at signup — a Google account picks its role a screen
later) and is never client-writable: `enforce_user_column_rules` refuses a
change, and `regenerate_invite_code` rolls it as the owner. Everyone already
attached stays attached, because the code is a door, not the relationship.

`coach_clients.permissions` carries **five** keys — `workouts`, `nutrition`,
`metrics`, `health`, `monthly` — the same words the coach's request button and
the client's switches use. Before this they were three, and the review screen
could ask for two domains the client had no screen to grant.

Detaching sets `status = 'ended'` rather than deleting: `invited_at` and
`accepted_at` are the history a re-attach is judged against, and the delete
policy stays with the client for a genuine erasure.

### Messaging

One spine for every conversation. A coach↔client thread and a community group
chat are the same thing with a different number of people in it — which the app
has always assumed, since every message it renders carries `from: 'me' | 'them'`
and is "side-neutral on purpose. One thread is rendered from two seats."
Building them separately would mean writing membership, unread counts, ordering
and realtime twice.

Threads are not opened by the app. `sync_direct_thread` opens one when
`coach_clients` goes `active` and closes it when the pair part, because that
table is already the authority on who may talk to whom and a second authority
is a second thing to disagree. Re-attaching reopens the same thread rather than
starting a clean one: the history is what makes a returning client a returning
client.

**Detaching closes a thread; it does not end it.** `src/lib/detach.ts` promises,
on the screen where the client decides, that "history stays readable, but
nothing new can be sent" — so the select policies do not mention `closed_at` and
the insert policy does. Verified both ways in checks 188–189.

`is_thread_member` is `security definer` and that is load-bearing: a policy on
`messages` that read `thread_members` directly would hit that table's own
membership-shaped RLS and Postgres would report "infinite recursion detected in
policy" from a query that looks nothing like the cause.

Messages arrive without being asked for: `public.messages` is in the
`supabase_realtime` publication, and the app subscribes to INSERT. Postgres
Changes rather than Broadcast, because it runs every event through RLS — so
`messages_select_in_my_threads` decides who *hears* about a message exactly as
it decides who may read one, instead of that rule having a second
implementation in JavaScript where nothing tests it. Its ceiling is subscriber
count rather than write rate (Supabase suggests Broadcast past ~3,000 on the
same rows); a coach has forty clients.

Messages themselves are read straight off the table — `messages_select_in_my_threads`
already answers "may I read this", and a function wrapping that would be a second
copy of a rule already written down. `my_threads` exists for everything *around*
them, and is `security definer` for one reason: a client may read their coach's
`users` row only through `is_linked_to`, which requires `status = 'active'`.
Detaching ends that — and a detached thread is exactly the one whose history has
to stay readable, since a history attributed to nobody is not readable. The
function authorizes on `thread_members` instead, which is the caller's own row.
Check 193 holds it.

Messages carry no update or delete grant at all. A message somebody has already
read is a thing that was said, and an app where it can be rewritten afterwards
is one where neither person can rely on what is on the screen.

#### Groups

A group is a thread with a name, an owner and more than two people in it, so it
reuses the spine entirely — `threads.kind` becomes `'group'`,
`thread_members.role` starts meaning something, and `groups` carries only what a
direct thread has no use for.

**It belongs to whoever made it, not to a coach.** Clients form them with other
clients, coaches with their clients, clients with a coach. Nine app-side types
still carry a `coachName` and three screens make promises with it ("X stays your
coach"); that is a front-end correction, not a schema one.

**Detaching removes nobody from any group.** `coach_clients` says who may read
whose training; membership here says who is in a conversation. Check 208.

There are two doors and they are not alternatives. A **code** reaches the people
you cannot name — a client's training partners appear in no list this app can
show them — and an **invitation** reaches the people you can, arriving on their
screen instead of over WhatsApp. `invite_to_group` only accepts somebody
`is_linked_to` the caller, and that is the account-checker guard rather than a
courtesy: without it the function takes a list of user ids and reports which
ones exist. Ids that fail are skipped silently for the same reason.

Nothing adds a member except their own answer. `src/api/community.ts` states the
rule in its own header — "there is no endpoint in this module through which a
coach can add a person to anything" — and the schema now holds it.

Joining is by code, because there is no list to pick from: a coach has a roster,
a client has nobody they can enumerate, and a box that looked somebody up by
email would be the account checker this schema refuses elsewhere. The code is
rate-limited on the same ledger as coach codes — one budget for all code
guessing.

`join_group` returns **NULL** for an unknown code rather than raising, and that
is load-bearing: raising aborts the function, which rolls back the ledger row it
just wrote, so every wrong guess would erase its own evidence and the rate limit
would count nothing. `lookup_coach` returns empty for the same reason.

Display names are resolved in SQL and not in the app, and that is the whole
reason `my_groups`, `group_members` and `group_messages` exist rather than the
app reading the tables. `resolveDisplayName` takes the real name as an
argument; doing that against a server would mean sending every member's real
name to every other member's phone so each phone could decide to render a
handle instead. Somebody who picked "Ironsmith" precisely so that no part of
their real name is shown would have shipped it to the whole group. Check 212.

#### Leaderboards

Every group has one and nobody is on it until they say so — two decisions, kept
apart. Joining a group is choosing to talk to people; appearing on its board is
publishing what you lifted to those same people, which the app asks for in its
own words. So `board_members` is its own table with its own identity: somebody
may be "Maya A." in the conversation and a handle on the ranking.

Leaving a board is the member's own, by policy, and not an admin's. An admin can
remove somebody from the conversation; taking them off a ranking they opted into
is a different act and is not on offer.

`board_standings` returns **numbers**, not strings. "42,180 kg" depends on
whether the reader has chosen kilograms or pounds, and formatting server-side
would hand every reader the same unit. Ranks are dense, so a tie is a tie.

PRs are derived, because there is nothing stored to count: `workout_sets.is_pr`
was dropped in `20260913104000` — "it was written by nothing" — so a PR is a set
that beat everything the same person had done on the same lift before it, which
is what `personal_records` already assumes.

The last admin leaving deletes the group. A group nobody can rename, admit to or
remove from is not a group, it is a room with a jammed door — `would_orphan_group`
is what the warning before it is built on.

### Training

Program → Routines → Exercises on the coach's side; a copy of each routine on
the client's. Assignment **copies** rather than points, which is what makes
"change it for this one client" expressible and what keeps a client's edit out
of everybody else's copy.

| Table | Purpose |
|---|---|
| `public.exercises` | Exercise catalogue. NULL `owner_id` is the shared library everyone reads; a set one is a coach's own. |
| `public.programs` | A coach's template. Never held by a client. `version` bumps on publish. |
| `public.program_routines` | One session inside a program. Ordering only — never a day of the week. |
| `public.program_blocks` | One prescribed exercise. `scheme` is display text ("4 × 8"); the set count is read back out of it. |
| `public.routine_instances` | **The copy a client holds.** NULL `program_routine_id` means they built it themselves — one table serves both. |
| `public.routine_blocks` | That copy's exercises. Either side may edit them; neither edit reaches anyone else. |
| `public.routine_updates` | A coach's published change, **proposed** to one holder. Nothing moves until they answer. |
| `public.routine_update_blocks` | What that proposal would make the routine. |
| `public.workout_sessions` | A workout. NULL `finished_at` means it has not been done: it counts for nothing and advances no rotation. |
| `public.workout_exercises` | What was actually done. `coach_note` and `own_note` are separate columns so writing one never erases the other. |
| `public.workout_sets` | One set. Load and reps stay separate so a PR on either remains comparable. |
| `public.routine_instance_progress` *(view)* | `routine_instances` plus `last_completed_at`, derived from finished workouts. `security_invoker`, so it is not a way round RLS. |

Nothing is scheduled to a day. A program is a rotation the client works through
at their own pace — so a missed session moves nothing, nothing is ever late,
and "what next" is answered by whichever routine has gone longest without being
done (`nextInRotation` in `src/lib/rotation.ts`).

### Functions the app calls

`security definer` where a caller has to reach rows their own policies do not —
those check their own authorization first, against `coach_clients`.
`security invoker` where the policies already say who may do it, and the
function exists only so that many rows land together or not at all.

| Function | Does |
|---|---|
| `assign_program(program, clients[])` | Gives each client their own copy of every routine. Idempotent. |
| `unassign_program(program, clients[])` | Takes those copies back, and whatever the client changed on them. |
| `publish_program(program)` | Bumps the version and **asks** every holder. Never overwrites anyone. |
| `decide_routine_update(instance, accept)` | The client's answer, and the only thing that moves their copy. |
| `save_program(…)` | Creates or rewrites a program, routines and exercises. Routines match by **position**, so a rename keeps the row every copy is linked through. |
| `save_routine(…)` | The same for a routine the client holds. |
| `save_client_routine(…)` | A coach rewriting a copy **they** assigned. Separate from `save_routine` because the authorization differs both ways: a client may edit anything they hold, a coach only what they handed over. |
| `start_workout(instance?, title?)` | Opens a workout from a routine, or an empty one. |
| `add_session_exercise(…)` | Adds a lift and its opening sets to a running workout. |
| `weekly_progress(client)` | Sessions finished since Monday, and the target: the coach's program, else the client's own answer, else 3. Monday-based to match `startOfWeek`. |
| `has_client_permission(client, domain)` | The one answer to "may this coach see that". Read by every training policy. |
| `is_thread_member(thread)` | Whether the caller is in a conversation. `security definer`, to keep the message policies out of RLS recursion. |
| `is_thread_open(thread)` | False once a thread is closed. Reads ignore it; writes do not. |
| `my_threads()` | Every thread the caller is in, with the other side named, what they share, and the unread mark. `security definer` — see below. |
| `mark_thread_read(thread)` | Moves the caller's read mark to the database's clock, not the phone's. |
| `create_group(name, identity, handle?)` | A group, its thread and its first admin, in one statement. |
| `join_group(code, identity, handle?)` | Joins by code. **NULL means no such code** — raising would roll back the ledger row. |
| `is_group_admin(group)` | Whether the caller runs this group. |
| `set_group_admin(group, user, bool)` | Promotes or demotes. Standing yourself down goes through `leave_group`. |
| `remove_group_member(group, user)` | Marks them left. Their messages stay. |
| `would_orphan_group(group)` | Whether leaving would delete it — what the warning is built on. |
| `leave_group(group)` | Leaves, and returns true if that deleted the group. |
| `community_display_name(identity, name, handle)` | How somebody is named in one group. **Resolved here so the real name never leaves.** |
| `my_groups()` | Every group the caller is in, with names already resolved and the unread mark. |
| `group_members(group)` | Members of one group. Empty to an outsider rather than an error. |
| `group_messages(group)` | One group's turns, each named through the sender's own choice. |
| `invite_to_group(group, users[])` | Asks people you are **linked to**. Adds nobody. |
| `respond_to_group_invite(invite, accept, identity, handle?)` | Answering. Accepting is what adds the member. |
| `my_group_invites()` | Unanswered questions for the caller. |
| `group_invited_not_joined(group)` | How many were asked and are not in. A count only. |
| `join_board(group, identity, handle?)` | Agrees to appear on the ranking, under a name chosen for it alone. |
| `board_standings(group)` | The ranking. Values are **numbers** — the unit is the reader's to choose. |
| `board_not_opted_in(group)` | How many of the group are not on it. A count only. |
| `client_stats(client)` | Sessions finished, the current unbroken week streak, and PRs. |
| `client_weekly_history(client, weeks)` | One row per week in the window, empty weeks included — a chart that drops them tells the opposite of the truth. |
| `monthly_check_ins(client, months)` | One row per month, the latest in each. A check-in **is** a `body_measurements` row — no separate table. |
| `save_check_in(…)` | Adds or rewrites one. RLS decides whether the caller may; a coach needs `log_for`. |
| `personal_records(client, limit)` | Best completed set per lift. Heaviest wins, reps break the tie. Replaced a `workout_sets.is_pr` column that nothing ever wrote. |
| `volume_history(client, weeks)` | Load times reps per week, completed sets only. |
| `enforce_workout_set_column_rules()` *(trigger)* | Keeps a coach to the load and the reps on a live set, refuses a set already done, and signs what they changed in `updated_by`. |
| `can_log_for(client)` | Whether this coach may write on a client's behalf — the `log_for` switch, which is a different question from seeing. |
| `lookup_coach(code)` | Resolves an invite code to a name, photo and client count. Signed-in callers only, rate-limited, and **returns no rows** for a miss — raising would roll back the ledger row the limit counts. |
| `attach_coach(coach, …)` | The client attaching, with exactly the permissions they chose. One coach at a time. |
| `detach_coach()` | Ends the link and zeroes what was shared. |
| `regenerate_invite_code()` | Rolls the code. Nobody already attached is affected. |
| `request_access(client, domain)` | A coach asking. Idempotent while open; refuses a domain already shared. |
| `answer_access_request(request, grant)` | The client's answer. Granting flips the permission in the same transaction. |
| `set_coach_permission(domain, shared)` | The switch, either way, and it closes any open ask for the same domain. |

Onboarding writes both profile tables and stamps `users.onboarded_at`, which
the tab layout reads as a gate. Before that column was read, nothing held
anyone in the flow — and because this project requires email confirmation,
signup returns no session and the route into onboarding was never taken at all.

Behaviour is covered by `supabase/verify/01_checks.sql` — 231 checks, run with
`./scripts/verify-schema.sh` against a throwaway local Postgres.

Two things a Laravel-shaped starter schema would include are deliberately
absent:

- **A password-reset token table.** GoTrue already issues, hashes, expires and
  single-uses reset tokens. A second store would be a worse copy whose failure
  mode is a link that still works after the real one was spent. The app calls
  `resetPasswordForEmail`; the ledger only records that it happened.
- **A `migrations` table.** The Supabase CLI keeps its own ledger in
  `supabase_migrations.schema_migrations`, which is not exposed through the
  Data API. Adding one in `public` would put migration state within reach of
  the anon key.

## Applying migrations

Requires the CLI and either the database password or an access token — neither
of which is in this repo, and neither of which the app ships with.

```sh
npx supabase link --project-ref kwqcmnhnjpldtialcwks   # once, interactive
npx supabase db push                                   # applies pending migrations
npx supabase migration list                            # local vs remote state
```

New migration:

```sh
npx supabase migration new add_programs
./scripts/verify-schema.sh      # applies to a throwaway local Postgres and asserts behaviour
./scripts/gen-types.sh          # regenerates src/api/database.types.ts
```

`scripts/verify-schema.sh` exists because `supabase db reset` needs the Docker
daemon; it only needs a running Postgres, and it never touches the remote
project. The checks it runs are in `verify/01_checks.sql`, and the stand-in for
Supabase's own objects (`auth.users`, `auth.uid()`, the API roles) is in
`verify/00_stub_supabase.sql`.

## Why the app cannot migrate

The publishable key in `.env` can only assume `anon` and `authenticated`.
Neither role:

- **owns any object** — so `ALTER`/`DROP` on these tables is refused;
- **holds `CREATE` on `public`** — revoked explicitly in the first migration,
  so no new tables either;
- **has more than the listed grants** — each migration revokes the broad
  defaults Supabase hands out and grants back only what the app performs.
  A missing RLS policy therefore fails closed instead of open.

`verify/01_checks.sql` asserts this: a signed-in user attempting
`create table` gets `permission denied for schema public`.

Migrations run as the table owner, through the CLI, from a machine holding
credentials that never enter the bundle.

## Scalability notes

- **Index shape follows the query.** Composite primary keys on `cache`
  (`user_id, key`) and `coach_clients` (`coach_id, client_id`) *are* the
  lookup index, so those reads need no second structure.
- **Partial indexes where the predicate is the point** — `users_coach_idx`
  carries only coaches, `sessions_push_idx` only live rows with a push token,
  `coach_clients_client_active_idx` only active links. They stay small as the
  table grows because most rows never qualify.
- **`(select auth.uid())`, not `auth.uid()`, in every policy.** Wrapped in a
  scalar subquery, Postgres hoists the call into an InitPlan and evaluates it
  once per statement instead of once per candidate row.
- **Nothing grows without bound.** `purge_expired_cache()` and
  `purge_old_password_reset_requests()` reclaim their tables. Schedule them
  once pg_cron is enabled (Dashboard → Database → Extensions):

  ```sql
  select cron.schedule('purge-cache', '*/15 * * * *', 'select public.purge_expired_cache()');
  select cron.schedule('purge-resets', '0 4 * * *',  'select public.purge_old_password_reset_requests()');
  ```

  Both are operator-only: execute is revoked from `anon` and `authenticated`,
  because a client that could sweep the cache could evict every user's rows.
- **Timestamps are `timestamptz`** throughout, and every mutable table has a
  trigger maintaining `updated_at` (or `last_seen_at`) rather than trusting
  the client's clock.
