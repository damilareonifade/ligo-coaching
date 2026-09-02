/** Every query key in the app. Never inline a key array at a call site. */
export const queryKeys = {
  coach: ['coach'] as const,
  students: {
    all: ['students'] as const,
    detail: (id: string) => ['students', id] as const,
    volume: (id: string) => ['students', id, 'volume'] as const,
  },
  sessions: {
    today: ['sessions', 'today'] as const,
    forStudent: (studentId: string) => ['sessions', 'student', studentId] as const,
  },
  programs: {
    all: ['programs'] as const,
    detail: (id: string) => ['programs', id] as const,
  },
} as const;
