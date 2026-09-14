/** Every query key in the app. Never inline a key array at a call site. */
export const queryKeys = {
  coach: ['coach'] as const,
  /** The signed-in user's own row in `public.users`. */
  profile: ['profile'] as const,
  /** Devices signed in to this account — see `public.sessions`. */
  deviceSessions: {
    all: ['device-sessions'] as const,
  },
  students: {
    all: ['students'] as const,
    detail: (id: string) => ['students', id] as const,
    volume: (id: string) => ['students', id, 'volume'] as const,
  },
  /** The coach's roster, its labels and its KPIs — one payload, one key. */
  roster: ['coach', 'roster'] as const,
  sessions: {
    today: ['sessions', 'today'] as const,
    forStudent: (studentId: string) => ['sessions', 'student', studentId] as const,
  },
  programs: {
    all: ['programs'] as const,
    detail: (id: string) => ['programs', id] as const,
  },
  /**
   * The coach's own library and editor — see src/api/coachPrograms.ts.
   * `library` and `detail` are deliberately siblings rather than nested:
   * invalidating the library must not cancel an open program's detail query.
   */
  coachPrograms: {
    library: ['coach', 'programs', 'library'] as const,
    detail: (id: string) => ['coach', 'programs', 'detail', id] as const,
    /** Who a publish would reach — see `usePublishImpactQuery`. */
    publishImpact: (id: string) => ['coach', 'programs', 'publish-impact', id] as const,
    /** Prefix for every search/filter combination at once. */
    exercisesAll: ['coach', 'exercises'] as const,
    exercises: (query: string, filter: string) =>
      ['coach', 'exercises', query, filter] as const,
  },
  clientTraining: {
    today: ['client', 'today'] as const,
    train: ['client', 'train'] as const,
    session: (sessionId: string) => ['client', 'sessions', sessionId] as const,
  },
  /**
   * The client's own routines. The list itself lives on the Train overview —
   * saving one invalidates `clientTraining.train`, not a key here.
   */
  clientRoutines: {
    detail: (routineId: string) => ['client', 'routines', routineId] as const,
  },
  clientNutrition: {
    day: ['client', 'food', 'today'] as const,
    search: (query: string, filter: string) =>
      ['client', 'food', 'search', query, filter] as const,
  },
  clientProgress: ['client', 'progress'] as const,
  clientProfile: {
    profile: ['client', 'profile'] as const,
    /** The switches, not the feed — see `notifications` below. */
    notificationSettings: ['client', 'notification-settings'] as const,
    /** What the coach may see and do — the six switches, live off the link. */
    sharePermissions: ['client', 'share-permissions'] as const,
    integrations: ['client', 'integrations'] as const,
    data: ['client', 'data'] as const,
    health: ['client', 'health'] as const,
    /** What a coach has asked to see and the client has not answered. */
    accessRequests: ['client', 'access-requests'] as const,
  },
  /**
   * The notification feed — one payload, already grouped. Keyed by audience
   * rather than shared: a coach who signs out and a client who signs in on the
   * same phone must not be handed each other's feed out of the cache.
   */
  notifications: (audience: 'coach' | 'client') => ['notifications', audience] as const,
  /**
   * The coach's view of one client — see src/api/coachClient.ts. `live` is a
   * sibling of `review` rather than a child: watching a session refetches on
   * its own cadence, and invalidating the review after a label change must not
   * cancel a live query that is mid-flight behind it.
   */
  coachClient: {
    review: (clientId: string) => ['coach', 'client', 'review', clientId] as const,
    live: (clientId: string) => ['coach', 'client', 'live', clientId] as const,
    /** The copies this client holds — see `ApiRoutineInstance`. */
    routines: (clientId: string) => ['coach', 'client', 'routines', clientId] as const,
  },
  /** Who is on the gym floor, and who wants a look — see src/api/coachHome.ts. */
  coachHome: ['coach', 'home'] as const,
  /** The coach's shareable code — one source for all three screens showing it. */
  coachInviteCode: ['coach', 'invite-code'] as const,
  /** The coach's own account and notification settings. */
  coachProfile: ['coach', 'profile'] as const,
  /**
   * The three fields behind that account — gym, bio, specialties — as the
   * editor needs them. A sibling of `coachProfile` rather than a child:
   * saving the form invalidates the settings screen, and nesting would make
   * that invalidation cancel the form's own refetch mid-save.
   */
  coachProfileForm: ['coach', 'profile-form'] as const,
  /**
   * The coach's inbox and threads — see src/api/coachMessages.ts. `inboxAll` is
   * the prefix over every search variant, so invalidating it refreshes the list
   * whatever is typed in the box. `thread` is deliberately a sibling of it, not
   * a child: sending a message invalidates the inbox and must not cancel the
   * open thread's own query while its optimistic bubble is on screen.
   */
  coachMessages: {
    inboxAll: ['coach', 'messages', 'inbox'] as const,
    inbox: (query: string) => ['coach', 'messages', 'inbox', query] as const,
    thread: (clientId: string) => ['coach', 'messages', 'thread', clientId] as const,
  },
  clientChat: ['client', 'chat'] as const,
  /**
   * Check-ins, keyed by whose. A coach reading a client's must not share a
   * cache entry with their own — `undefined` is the caller's own.
   */
  clientCheckIns: (clientId?: string) =>
    ['client', 'check-ins', clientId ?? 'me'] as const,
  /**
   * Community — see src/api/community.ts. `overview` is the client's index;
   * `group` and `board` are deliberately siblings of it, not children, for the
   * same reason the coach's threads sit beside their inbox: sending a group
   * message invalidates the overview's preview line and must not cancel the
   * open thread while its optimistic bubble is on screen.
   *
   * `coachGroups` is the coach's own list of groups they run, which is a
   * different question from "what am I a member of" and so a different key.
   */
  community: {
    overview: ['community'] as const,
    group: (id: string) => ['community', 'group', id] as const,
    board: (id: string) => ['community', 'board', id] as const,
    coachGroups: ['coach', 'community', 'groups'] as const,
  },
} as const;
