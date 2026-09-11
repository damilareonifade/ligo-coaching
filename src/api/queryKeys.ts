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
  clientNutrition: {
    day: ['client', 'food', 'today'] as const,
    search: (query: string, filter: string) =>
      ['client', 'food', 'search', query, filter] as const,
  },
  clientProgress: ['client', 'progress'] as const,
  clientProfile: {
    profile: ['client', 'profile'] as const,
    notifications: ['client', 'notifications'] as const,
    integrations: ['client', 'integrations'] as const,
    data: ['client', 'data'] as const,
    health: ['client', 'health'] as const,
  },
  /** The coach's feed — one payload, already grouped. See src/api/coachActivity.ts. */
  coachActivity: ['coach', 'activity'] as const,
  /**
   * The coach's view of one client — see src/api/coachClient.ts. `live` is a
   * sibling of `review` rather than a child: watching a session refetches on
   * its own cadence, and invalidating the review after a label change must not
   * cancel a live query that is mid-flight behind it.
   */
  coachClient: {
    review: (clientId: string) => ['coach', 'client', 'review', clientId] as const,
    live: (clientId: string) => ['coach', 'client', 'live', clientId] as const,
  },
  /** The coach's own account and notification settings. */
  coachProfile: ['coach', 'profile'] as const,
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
  clientCheckIns: ['client', 'check-ins'] as const,
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
