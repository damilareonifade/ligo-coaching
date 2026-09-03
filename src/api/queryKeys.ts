/** Every query key in the app. Never inline a key array at a call site. */
export const queryKeys = {
  coach: ['coach'] as const,
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
  clientChat: ['client', 'chat'] as const,
  clientCheckIns: ['client', 'check-ins'] as const,
} as const;
