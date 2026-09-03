import type {
  ApiCheckIn,
  ApiClientChat,
  ApiClientData,
  ApiClientHealth,
  ApiClientProfile,
  ApiClientProgress,
  ApiClientSession,
  ApiClientToday,
  ApiCoach,
  ApiFoodDay,
  ApiFoodResult,
  ApiIntegration,
  ApiMonthlyCheckIns,
  ApiNotificationSettings,
  ApiProgram,
  ApiSession,
  ApiSessionSet,
  ApiStudent,
  ApiTrainOverview,
  ApiVolumePoint,
} from '@/api/types';

/** Dates are generated relative to now so the demo always reads as "today". */
const now = new Date();

function at(dayOffset: number, hour: number, minute = 0): string {
  const d = new Date(now);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export const mockCoach: ApiCoach = {
  id: 'coach-1',
  name: 'Damilare A.',
  email: 'damilare@ligo.app',
  gymName: 'Ironworks Lagos',
  avatarUrl: null,
};

export const mockPrograms: readonly ApiProgram[] = [
  {
    id: 'prog-1',
    name: 'Base Strength',
    focus: 'Compound strength, 3x/week',
    weeks: 8,
    assignedStudentIds: ['stu-1', 'stu-4'],
    exercises: [
      {
        id: 'ex-1',
        name: 'Back Squat',
        sets: 5,
        reps: 5,
        targetWeightKg: 80,
        restSeconds: 180,
        cue: 'Knees track over mid-foot — no collapse on the way up.',
      },
      {
        id: 'ex-2',
        name: 'Bench Press',
        sets: 4,
        reps: 6,
        targetWeightKg: 60,
        restSeconds: 150,
        cue: 'Shoulder blades pinned to the bench before the bar moves.',
      },
      {
        id: 'ex-3',
        name: 'Romanian Deadlift',
        sets: 3,
        reps: 8,
        targetWeightKg: 70,
        restSeconds: 120,
        cue: 'Hinge from the hips, ribs down.',
      },
    ],
  },
  {
    id: 'prog-2',
    name: 'Conditioning Block',
    focus: 'Work capacity, 4x/week',
    weeks: 6,
    assignedStudentIds: ['stu-2', 'stu-5'],
    exercises: [
      {
        id: 'ex-4',
        name: 'Kettlebell Swing',
        sets: 5,
        reps: 15,
        targetWeightKg: 24,
        restSeconds: 60,
        cue: 'Snap the hips — the arms are just rope.',
      },
      {
        id: 'ex-5',
        name: 'Rower Intervals',
        sets: 6,
        reps: 250,
        targetWeightKg: 0,
        restSeconds: 90,
        cue: 'Legs, then back, then arms. Reverse on the return.',
      },
    ],
  },
  {
    id: 'prog-3',
    name: 'Return to Lifting',
    focus: 'Post-injury rebuild, 2x/week',
    weeks: 10,
    assignedStudentIds: ['stu-3'],
    exercises: [
      {
        id: 'ex-6',
        name: 'Goblet Squat',
        sets: 3,
        reps: 10,
        targetWeightKg: 16,
        restSeconds: 90,
        cue: 'Stop the set the moment depth changes.',
      },
      {
        id: 'ex-7',
        name: 'Split Squat',
        sets: 3,
        reps: 8,
        targetWeightKg: 12,
        restSeconds: 90,
        cue: 'Front shin vertical, weight through the whole foot.',
      },
    ],
  },
];

export const mockStudents: readonly ApiStudent[] = [
  {
    id: 'stu-1',
    name: 'Ada Bello',
    avatarUrl: null,
    goal: 'First bodyweight squat',
    programId: 'prog-1',
    status: 'on-track',
    adherence: 92,
    nextSessionAt: at(0, 7, 30),
    lastSessionAt: at(-2, 7, 30),
    note: 'Squat depth improved — hold the load for another week.',
  },
  {
    id: 'stu-2',
    name: 'Tunde Okafor',
    avatarUrl: null,
    goal: 'Drop 6kg before December',
    programId: 'prog-2',
    status: 'on-track',
    adherence: 84,
    nextSessionAt: at(0, 9, 0),
    lastSessionAt: at(-1, 9, 0),
    note: null,
  },
  {
    id: 'stu-3',
    name: 'Ngozi Eze',
    avatarUrl: null,
    goal: 'Rebuild after knee surgery',
    programId: 'prog-3',
    status: 'at-risk',
    adherence: 48,
    nextSessionAt: at(0, 17, 0),
    lastSessionAt: at(-9, 17, 0),
    note: 'Missed two sessions. Check in before loading the split squat.',
  },
  {
    id: 'stu-4',
    name: 'Samuel Idris',
    avatarUrl: null,
    goal: '120kg deadlift',
    programId: 'prog-1',
    status: 'on-track',
    adherence: 96,
    nextSessionAt: at(1, 6, 30),
    lastSessionAt: at(0, 6, 30),
    note: null,
  },
  {
    id: 'stu-5',
    name: 'Chiamaka Nwosu',
    avatarUrl: null,
    goal: 'Run 10k under 55 minutes',
    programId: 'prog-2',
    status: 'at-risk',
    adherence: 61,
    nextSessionAt: at(2, 18, 0),
    lastSessionAt: at(-6, 18, 0),
    note: 'Travelling for work — move sessions to mornings.',
  },
  {
    id: 'stu-6',
    name: 'Kelechi Obi',
    avatarUrl: null,
    goal: 'General fitness',
    programId: null,
    status: 'inactive',
    adherence: 12,
    nextSessionAt: null,
    lastSessionAt: at(-34, 8, 0),
    note: 'Membership lapsed. Needs a new program before returning.',
  },
];

export const mockSessions: readonly ApiSession[] = [
  {
    id: 'ses-1',
    studentId: 'stu-1',
    studentName: 'Ada Bello',
    programId: 'prog-1',
    programName: 'Base Strength',
    scheduledAt: at(0, 7, 30),
    status: 'completed',
    completedSets: 12,
    totalSets: 12,
  },
  {
    id: 'ses-2',
    studentId: 'stu-2',
    studentName: 'Tunde Okafor',
    programId: 'prog-2',
    programName: 'Conditioning Block',
    scheduledAt: at(0, 9, 0),
    status: 'scheduled',
    completedSets: 4,
    totalSets: 11,
  },
  {
    id: 'ses-3',
    studentId: 'stu-3',
    studentName: 'Ngozi Eze',
    programId: 'prog-3',
    programName: 'Return to Lifting',
    scheduledAt: at(0, 17, 0),
    status: 'scheduled',
    completedSets: 0,
    totalSets: 6,
  },
  {
    id: 'ses-4',
    studentId: 'stu-4',
    studentName: 'Samuel Idris',
    programId: 'prog-1',
    programName: 'Base Strength',
    scheduledAt: at(1, 6, 30),
    status: 'scheduled',
    completedSets: 0,
    totalSets: 12,
  },
];

/* ------------------------------------------------------------------ *
 * Client-side training fixtures. Copy is verbatim from the "Ligo
 * Client App" design canvas — do not paraphrase it here.
 * ------------------------------------------------------------------ */

export const mockClientToday: ApiClientToday = {
  plan: {
    id: 'plan-upper-a',
    title: 'Upper A · Push focus',
    meta: '5 exercises · ~48 min · last done 4 days ago',
    source: 'From Sam',
    exerciseCount: 5,
  },
  calories: { consumed: 1840, target: 2600, unit: 'kcal' },
  protein: { consumed: 126, target: 185, unit: 'g' },
  coach: {
    id: 'coach-sam',
    name: 'Sam Okafor',
    initials: 'SO',
    line1: 'Sam Okafor',
    line2: 'Sees workouts and nutrition',
    permissionLabel: 'Partial access',
  },
  week: [
    { day: 'MON', title: 'Upper A', meta: '5 exercises · 48 min', tag: 'Done' },
    { day: 'TUE', title: 'Lower A', meta: '6 exercises · 52 min', tag: 'Done' },
    { day: 'WED', title: 'Rest', meta: '—', tag: 'Rest' },
    { day: 'THU', title: 'Upper B', meta: '5 exercises · 46 min', tag: 'Today' },
    { day: 'FRI', title: 'Lower B', meta: '6 exercises · 50 min', tag: 'Planned' },
  ],
};

export const mockTrainOverview: ApiTrainOverview = {
  nextUp: mockClientToday.plan,
  nextUpPreview: [
    { name: 'Bench press', scheme: '4 × 8' },
    { name: 'Incline DB press', scheme: '3 × 10' },
    { name: 'Cable fly', scheme: '3 × 12' },
  ],
  routines: [
    { id: 'rou-1', name: 'Upper/Lower 4×', meta: '4 days · 8 weeks', chip: 'Active' },
    { id: 'rou-2', name: 'Push Pull Legs', meta: '6 days · ongoing', chip: 'Saved' },
    { id: 'rou-3', name: 'Full body 3×', meta: '3 days · 6 weeks', chip: 'Saved' },
    { id: 'rou-4', name: 'Deload week', meta: '4 days · 1 week', chip: 'Saved' },
  ],
  program: {
    title: 'Upper/Lower 4×',
    week: 'wk 6 / 12',
    currentWeek: 6,
    totalWeeks: 12,
    note: 'Two more weeks at this volume, then a deload.',
  },
};

/**
 * The mock "server" keeps its sessions, so a logged set survives the
 * invalidate-and-refetch that follows an optimistic update. Without this,
 * every refetch would hand back a pristine session and un-tick the set.
 */
const mockSessionStore = new Map<string, ApiClientSession>();

function buildClientSession(sessionId: string): ApiClientSession {
  return {
    id: sessionId,
    title: 'Upper A · Push focus',
    startedAt: new Date().toISOString(),
    exercises: [
      {
        id: 'cex-bench',
        name: 'Bench press',
        note: '4 × 8 · 2 min rest',
        sets: [
          { n: 1, weightKg: 60, reps: 8, completed: true, isPr: false },
          { n: 2, weightKg: 62.5, reps: 8, completed: true, isPr: true },
          { n: 3, weightKg: 62.5, reps: 8, completed: false, isPr: false },
          { n: 4, weightKg: 62.5, reps: 8, completed: false, isPr: false },
        ],
      },
      {
        id: 'cex-incline',
        name: 'Incline DB press',
        note: '3 × 10 · 90s rest',
        sets: [
          { n: 1, weightKg: 24, reps: 10, completed: false, isPr: false },
          { n: 2, weightKg: 24, reps: 10, completed: false, isPr: false },
          { n: 3, weightKg: 24, reps: 10, completed: false, isPr: false },
        ],
      },
      {
        id: 'cex-fly',
        name: 'Cable fly',
        note: '3 × 12 · 60s rest',
        sets: [
          { n: 1, weightKg: 15, reps: 12, completed: false, isPr: false },
          { n: 2, weightKg: 15, reps: 12, completed: false, isPr: false },
          { n: 3, weightKg: 15, reps: 12, completed: false, isPr: false },
        ],
      },
    ],
  };
}

export function mockClientSession(sessionId: string): ApiClientSession {
  const existing = mockSessionStore.get(sessionId);
  if (existing) return existing;

  const created = buildClientSession(sessionId);
  mockSessionStore.set(sessionId, created);
  return created;
}

/** Mirrors POST /client/sessions/:id/sets against the in-memory session. */
export function mockApplyClientSet(
  sessionId: string,
  exerciseId: string,
  set: ApiSessionSet,
): void {
  const session = mockClientSession(sessionId);
  mockSessionStore.set(sessionId, {
    ...session,
    exercises: session.exercises.map((exercise) =>
      exercise.id === exerciseId
        ? { ...exercise, sets: exercise.sets.map((s) => (s.n === set.n ? set : s)) }
        : exercise,
    ),
  });
}

/** Mirrors POST /client/sessions/:id/finish — the session is no longer live. */
export function mockFinishClientSession(sessionId: string): void {
  mockSessionStore.delete(sessionId);
}

export function mockVolume(studentId: string): readonly ApiVolumePoint[] {
  // Deterministic per student so the chart is stable across reloads.
  const seed = studentId.charCodeAt(studentId.length - 1);
  return Array.from({ length: 8 }, (_, index) => {
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - (7 - index) * 7);
    return {
      weekStart: weekStart.toISOString(),
      volumeKg: 2400 + ((seed * (index + 3)) % 9) * 220 + index * 130,
    };
  });
}

/* ------------------------------------------------------------------ *
 * Client nutrition
 * ------------------------------------------------------------------ */

const initialFoodDay: ApiFoodDay = {
  kcalConsumed: 1840,
  kcalTarget: 2600,
  macros: [
    { label: 'Protein', consumed: 126, target: 185, unit: 'g' },
    { label: 'Carbs', consumed: 198, target: 280, unit: 'g' },
    { label: 'Fat', consumed: 54, target: 78, unit: 'g' },
  ],
  logged: [
    {
      id: 'log-1',
      name: 'Greek yoghurt & berries',
      meta: '220 g · breakfast',
      kcal: 180,
      loggedBy: 'you',
    },
    {
      id: 'log-2',
      name: 'Chicken, rice, greens',
      meta: '480 g · lunch',
      kcal: 640,
      loggedBy: 'you',
    },
    {
      id: 'log-3',
      name: 'Whey shake',
      meta: '1 scoop · post-workout',
      kcal: 120,
      loggedBy: 'coach',
    },
  ],
  quickAdd: [
    { id: 'quick-1', name: 'Greek yoghurt', meta: '170 g', kcal: 100 },
    { id: 'quick-2', name: 'Banana', meta: '1 medium', kcal: 105 },
    { id: 'quick-3', name: 'Whey shake', meta: '1 scoop', kcal: 120 },
    { id: 'quick-4', name: 'Chicken breast', meta: '150 g', kcal: 248 },
  ],
};

/**
 * The mock "server" keeps the day it has been handed, so a food logged
 * optimistically survives the invalidate-and-refetch that follows. Without
 * this, every refetch would hand back a pristine day and drop the entry.
 */
let foodDayState: ApiFoodDay = initialFoodDay;

export function mockFoodDay(): ApiFoodDay {
  return foodDayState;
}

export interface MockFoodLogInput {
  readonly foodId: string;
  readonly name: string;
  readonly kcal: number;
  /** Serving line for the logged row; the real API composes this server-side. */
  readonly meta?: string;
}

/** Mirrors POST /client/food/log. */
export function mockLogFood({ foodId, name, kcal, meta }: MockFoodLogInput): void {
  foodDayState = {
    ...foodDayState,
    kcalConsumed: foodDayState.kcalConsumed + kcal,
    logged: [
      ...foodDayState.logged,
      {
        id: `log-${foodId}-${Date.now()}`,
        name,
        meta: meta ?? '1 serving · just now',
        kcal,
        loggedBy: 'you',
      },
    ],
  };
}

export interface MockCreateFoodInput {
  readonly name: string;
  readonly brand: string;
  readonly servingLabel: string;
  readonly kcal: number;
  readonly protein: number;
  readonly carbs: number;
  readonly fat: number;
  readonly save: boolean;
}

/**
 * Mirrors POST /client/food. A custom food always lands on today; `save` also
 * parks it in quick-add, which is what "save to my foods" means on the phone.
 */
export function mockCreateFood(input: MockCreateFoodInput): void {
  const serving = input.servingLabel.trim().length > 0 ? input.servingLabel : '1 serving';
  const id = `custom-${Date.now()}`;

  mockLogFood({ foodId: id, name: input.name, kcal: input.kcal, meta: `${serving} · just now` });

  if (input.save) {
    foodDayState = {
      ...foodDayState,
      quickAdd: [...foodDayState.quickAdd, { id, name: input.name, meta: serving, kcal: input.kcal }],
    };
  }
}

const mockFoodResults: readonly ApiFoodResult[] = [
  {
    id: 'food-1',
    name: 'Chicken breast, raw',
    meta: '100 g · 31 g protein',
    kcal: 165,
    source: 'Verified',
  },
  {
    id: 'food-2',
    name: 'Chicken breast, grilled',
    meta: '100 g · 32 g protein',
    kcal: 177,
    source: 'Verified',
  },
  {
    id: 'food-3',
    name: 'Chicken thigh, skinless',
    meta: '100 g · 24 g protein',
    kcal: 209,
    source: 'Verified',
  },
  {
    id: 'food-4',
    name: 'My chicken & rice',
    meta: '480 g · meal',
    kcal: 640,
    source: 'Your foods',
  },
];

/**
 * Mirrors GET /client/food/search. Matching on the name is what makes the
 * "no match" path reachable in the mock app — type something the fixtures do
 * not carry and you get the create-a-food card.
 */
export function mockFoodSearch(query: string, filter: string): readonly ApiFoodResult[] {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) return [];

  const matches = mockFoodResults.filter((result) => result.name.toLowerCase().includes(needle));

  if (filter === 'yours') return matches.filter((result) => result.source === 'Your foods');
  // The fixtures carry no timestamps, so "recent" stands in as the top matches.
  if (filter === 'recent') return matches.slice(0, 2);
  return matches;
}

/* ------------------------------------------------------------------ *
 * Client progress
 * ------------------------------------------------------------------ */

export const mockClientProgress: ApiClientProgress = {
  weeklyVolumeKg: 42180,
  volumeChangePct: 8.4,
  volumeBars: [
    { label: 'W1', volumeKg: 31200 },
    { label: 'W2', volumeKg: 33500 },
    { label: 'W3', volumeKg: 32100 },
    { label: 'W4', volumeKg: 36400 },
    { label: 'W5', volumeKg: 35800 },
    { label: 'W6', volumeKg: 38900 },
    { label: 'W7', volumeKg: 40100 },
    { label: 'W8', volumeKg: 42180 },
  ],
  personalRecords: [
    { id: 'pr-1', name: 'Bench press', value: '92.5 kg × 3', when: '6 days ago' },
    { id: 'pr-2', name: 'Back squat', value: '140 kg × 2', when: '3 weeks ago' },
    { id: 'pr-3', name: 'Deadlift', value: '180 kg × 1', when: '5 weeks ago' },
  ],
  bodyWeightKg: 82.4,
  bodyWeightSeries: [
    { label: 'MAR', kg: 84.2 },
    { label: '', kg: 83.8 },
    { label: 'APR', kg: 84.0 },
    { label: '', kg: 83.1 },
    { label: 'MAY', kg: 82.9 },
    { label: '', kg: 82.6 },
    { label: '', kg: 82.5 },
    { label: 'JUN', kg: 82.4 },
  ],
  monthlyChip: '3 logged',
  monthly: [
    { id: 'mon-1', label: 'August 2026', weight: '82.4 kg', delta: '−0.7', by: 'you' },
    { id: 'mon-2', label: 'July 2026', weight: '83.1 kg', delta: '−1.1', by: 'coach' },
    { id: 'mon-3', label: 'June 2026', weight: '84.2 kg', delta: '—', by: 'you' },
  ],
  monthlyNote:
    'Waist down two months running with weight nearly flat — that is recomposition, not a stall.',
};

/* ------------------------------------------------------------------ *
 * Client profile
 * ------------------------------------------------------------------ */

export const mockClientProfile: ApiClientProfile = {
  name: 'Maya Andersson',
  email: 'maya@example.com',
  memberSince: 'since Mar 2025',
  stats: [
    { label: 'SESSIONS', value: '142' },
    { label: 'WEEK STREAK', value: '18' },
    { label: 'PRS', value: '36' },
  ],
  // The same coach the client's Today screen shows — one attachment, one shape.
  coach: mockClientToday.coach,
  coachRows: [
    {
      id: 'permissions',
      label: 'Permissions',
      desc: 'What Sam can see and log',
      value: '3 of 5',
      route: '/onboarding/coach-permissions',
    },
    {
      id: 'check-ins',
      label: 'Monthly check-ins',
      desc: 'Shared reviews and measurements',
      value: '3 logged',
      route: '/check-ins',
    },
    {
      id: 'detach',
      label: 'Detach coach',
      desc: 'Ends access immediately. Your data stays.',
      danger: true,
    },
  ],
  groups: [
    {
      id: 'training',
      title: 'TRAINING',
      rows: [
        { id: 'units', label: 'Units', desc: 'Weight and measurements', value: 'kg · cm' },
        { id: 'rest-timer', label: 'Rest timer', desc: 'Auto-start between sets', value: 'On' },
        { id: 'plates', label: 'Plates', desc: 'Available in your gym', value: '20, 15, 10, 5, 2.5' },
      ],
    },
    {
      id: 'nutrition',
      title: 'NUTRITION',
      rows: [
        { id: 'targets', label: 'Targets', desc: 'Calories and macros', value: '2,600 kcal' },
        { id: 'meal-reminders', label: 'Meal reminders', desc: 'Nudges to log', value: 'Off' },
      ],
    },
    {
      id: 'account',
      title: 'ACCOUNT',
      rows: [
        {
          id: 'health',
          label: 'Health profile',
          desc: 'Injuries, conditions, medication',
          route: '/profile/health',
        },
        {
          id: 'notifications',
          label: 'Notifications',
          desc: 'What buzzes and when',
          route: '/profile/notifications',
        },
        {
          id: 'integrations',
          label: 'Integrations',
          desc: 'Connected apps and devices',
          value: '3 connected',
          route: '/profile/integrations',
        },
        {
          id: 'data',
          label: 'Data & privacy',
          desc: 'Export, import, delete',
          route: '/profile/data',
        },
      ],
    },
    {
      id: 'support',
      title: 'SUPPORT',
      rows: [
        { id: 'help', label: 'Help centre', desc: 'Guides and answers' },
        { id: 'sign-out', label: 'Sign out', desc: '', danger: true },
      ],
    },
  ],
  version: 'Ligo 2.4.0 · your profile works with no coach, no subscription and no export fee.',
};

const initialNotifications: ApiNotificationSettings = {
  groups: [
    {
      id: 'training',
      title: 'TRAINING',
      note: 'Reminders fire on the days your plan expects a session.',
      rows: [
        {
          id: 'workout-reminder',
          label: 'Workout reminder',
          desc: '30 min before a planned session',
          enabled: true,
        },
        { id: 'rest-timer', label: 'Rest timer', desc: "Sound when a set's rest ends", enabled: true },
        {
          id: 'weekly-summary',
          label: 'Weekly summary',
          desc: 'Volume and adherence, Sunday evening',
          enabled: true,
        },
      ],
    },
    {
      id: 'coach',
      title: 'COACH',
      note: 'A coach can never turn these on for you.',
      rows: [
        { id: 'coach-message', label: 'Coach message', desc: 'When Sam sends a message', enabled: true },
        {
          id: 'coach-logged',
          label: 'Coach logged for me',
          desc: 'When Sam adds a set or meal',
          enabled: true,
        },
        {
          id: 'coach-viewed',
          label: 'Coach viewed my data',
          desc: 'Each time Sam opens your profile',
          enabled: false,
        },
        {
          id: 'access-request',
          label: 'Access request',
          desc: 'When Sam asks for more access',
          enabled: true,
        },
      ],
    },
    {
      id: 'nutrition',
      title: 'NUTRITION',
      note: 'Off by default. Nothing nags you about food.',
      rows: [
        { id: 'meal-reminders', label: 'Meal reminders', desc: 'Breakfast, lunch, dinner', enabled: false },
      ],
    },
  ],
  quietHours: '22:00 – 07:00',
};

/**
 * As with the food day: the mock "server" keeps what it was handed, so an
 * optimistic toggle survives the invalidate-and-refetch that follows it.
 */
let notificationState: ApiNotificationSettings = initialNotifications;

export function mockNotificationSettings(): ApiNotificationSettings {
  return notificationState;
}

/** Mirrors POST /client/notifications — one toggle, addressed by group + row. */
export function mockToggleNotification(groupId: string, rowId: string, enabled: boolean): void {
  notificationState = {
    ...notificationState,
    groups: notificationState.groups.map((group) =>
      group.id === groupId
        ? {
            ...group,
            rows: group.rows.map((row) => (row.id === rowId ? { ...row, enabled } : row)),
          }
        : group,
    ),
  };
}

const initialIntegrations: readonly ApiIntegration[] = [
  {
    id: 'apple-health',
    name: 'Apple Health',
    desc: 'Steps, weight, workouts',
    mark: 'AH',
    connected: true,
    status: 'Connected',
    flows: [
      { label: 'Read', active: true },
      { label: 'Write', active: true },
    ],
  },
  {
    id: 'garmin',
    name: 'Garmin',
    desc: 'Sessions and heart rate',
    mark: 'GA',
    connected: true,
    status: 'Connected',
    flows: [
      { label: 'Read', active: true },
      { label: 'Write', active: false },
    ],
  },
  {
    id: 'whoop',
    name: 'Whoop',
    desc: 'Recovery and sleep',
    mark: 'WH',
    connected: false,
    status: 'Not connected',
    flows: [
      { label: 'Read', active: false },
      { label: 'Write', active: false },
    ],
  },
  {
    id: 'strava',
    name: 'Strava',
    desc: 'Runs and rides',
    mark: 'ST',
    connected: false,
    status: 'Not connected',
    flows: [
      { label: 'Read', active: false },
      { label: 'Write', active: false },
    ],
  },
  {
    id: 'smart-scale',
    name: 'Smart scale',
    desc: 'Body weight and composition',
    mark: 'SC',
    connected: true,
    status: 'Connected',
    flows: [
      { label: 'Read', active: true },
      { label: 'Write', active: false },
    ],
  },
];

let integrationState: readonly ApiIntegration[] = initialIntegrations;

export function mockIntegrations(): readonly ApiIntegration[] {
  return integrationState;
}

/**
 * Mirrors POST /client/integrations. Disconnecting drops every flow with it —
 * an app that cannot reach the account cannot still be reading from it.
 */
export function mockToggleIntegration(id: string, connected: boolean): void {
  integrationState = integrationState.map((integration) =>
    integration.id === id
      ? {
          ...integration,
          connected,
          status: connected ? 'Connected' : 'Not connected',
          flows: connected
            ? integration.flows.map((flow) => ({ ...flow, active: flow.label === 'Read' }))
            : integration.flows.map((flow) => ({ ...flow, active: false })),
        }
      : integration,
  );
}

export const mockClientData: ApiClientData = {
  counts: [
    { label: 'SESSIONS', value: '142' },
    { label: 'SETS', value: '3,180' },
    { label: 'MEALS', value: '1,024' },
    { label: 'MEASUREMENTS', value: '86' },
    { label: 'PHOTOS', value: '12' },
    { label: 'PROGRAMS', value: '9' },
  ],
  lastExport: 'Last export: 12 Jul 2026',
  importSources: [
    { id: 'strong', name: 'Strong', meta: 'Sessions and sets', mark: 'ST' },
    { id: 'hevy', name: 'Hevy', meta: 'Sessions and sets', mark: 'HE' },
    { id: 'mfp', name: 'MyFitnessPal', meta: 'Meals and foods', mark: 'MF' },
    { id: 'apple-health', name: 'Apple Health', meta: 'Weight and steps', mark: 'AH' },
  ],
  access: [
    { id: 'you', label: 'You', chip: 'Full control', tone: 'violet' },
    { id: 'coach', label: 'Sam Okafor', chip: '3 of 5 areas', tone: 'violet' },
    { id: 'staff', label: 'Ligo staff', chip: 'No access', tone: 'neutral' },
  ],
};

const initialHealth: ApiClientHealth = {
  sharedWithCoach: true,
  shareNote:
    'Sam can see your health profile. Turn this off and it is hidden immediately — nothing is deleted.',
  sections: [
    {
      id: 'injuries',
      title: 'INJURIES & LIMITATIONS',
      note: 'Shown to a coach before they write you a program.',
      rows: [
        {
          id: 'shoulder',
          label: 'Left shoulder',
          value: 'Impingement, cleared Feb 2026',
          chip: 'Active',
        },
        {
          id: 'back',
          label: 'Lower back',
          value: 'Disc bulge 2023, no flare since',
          chip: 'Watch',
        },
      ],
    },
    {
      id: 'conditions',
      title: 'CONDITIONS',
      note: 'Only what you enter. Ligo never infers a condition.',
      rows: [{ id: 'asthma', label: 'Asthma', value: 'Exercise-induced, inhaler pre-session' }],
    },
    {
      id: 'medication',
      title: 'MEDICATION & ALLERGIES',
      note: 'Kept for your own record. A coach sees it only with health sharing on.',
      rows: [
        { id: 'salbutamol', label: 'Salbutamol', value: 'As needed' },
        { id: 'allergies', label: 'Allergies', value: 'Peanuts' },
      ],
    },
  ],
};

let healthState: ApiClientHealth = initialHealth;

export function mockClientHealth(): ApiClientHealth {
  return healthState;
}

/** Mirrors POST /client/health/share — visibility only; nothing is deleted. */
export function mockToggleHealthShare(shared: boolean): void {
  healthState = { ...healthState, sharedWithCoach: shared };
}

/* ------------------------------------------------------------------ *
 * Coach chat
 * ------------------------------------------------------------------ */

const initialChat: ApiClientChat = {
  coachName: 'Sam Okafor',
  coachInitials: 'SO',
  context: 'Strength coach · replies most days',
  chipLabel: 'Partial access',
  archived: false,
  // Oldest first — the thread reads top to bottom, newest at the bottom.
  messages: [
    {
      id: 'msg-1',
      from: 'coach',
      text: 'How did the shoulder feel on the incline work?',
      when: 'Mon 09:12',
    },
    {
      id: 'msg-2',
      from: 'me',
      text: 'Much better. No pinch at all on the top set.',
      when: 'Mon 09:31',
    },
    {
      id: 'msg-3',
      from: 'coach',
      text: "I'll add a set to the incline next week and hold the bench where it is.",
      when: 'Mon 09:34',
    },
    {
      id: 'msg-4',
      from: 'me',
      text: 'Sounds good. Sleep has been better too — 7h most nights.',
      when: 'Tue 21:04',
    },
    {
      id: 'msg-5',
      from: 'coach',
      text: "That'll be doing a lot of the work. Keep the protein where it is.",
      when: 'Wed 07:48',
    },
  ],
};

/**
 * As with the food day: the mock "server" keeps what it has been handed, so a
 * message sent optimistically survives the invalidate-and-refetch that follows.
 */
let chatState: ApiClientChat = initialChat;

export function mockClientChat(): ApiClientChat {
  return chatState;
}

/** Mirrors POST /client/chat. The stamp is composed server-side for real. */
export function mockSendMessage(text: string): void {
  chatState = {
    ...chatState,
    messages: [
      ...chatState.messages,
      { id: `msg-${Date.now()}`, from: 'me', text, when: 'now' },
    ],
  };
}

/* ------------------------------------------------------------------ *
 * Monthly check-ins
 * ------------------------------------------------------------------ */

const initialCheckIns: ApiMonthlyCheckIns = {
  stats: [
    { label: 'Latest weight', value: '82.4 kg' },
    { label: 'Since June', value: '−1.8 kg' },
    { label: 'Logged', value: '3' },
  ],
  coachCanEdit: true,
  coachName: 'Sam',
  note: 'Monthly check-ins are their own permission. Turning the toggle off hides them from Sam immediately and stops him logging on your behalf — nothing is deleted.',
  // Newest month first.
  entries: [
    {
      id: 'chk-aug-2026',
      label: 'August 2026',
      weightKg: '82.4',
      delta: '−0.7',
      cells: [
        { label: 'Waist', value: '78 cm' },
        { label: 'Chest', value: '104 cm' },
        { label: 'Hips', value: '96 cm' },
        { label: 'Body fat', value: '16.8%' },
      ],
      note: 'Sleep back to 7h. Waist down again with weight flat — recomposition, not a stall.',
      by: 'you',
      byLine: 'Logged by you · 3 Aug',
      photos: 3,
    },
    {
      id: 'chk-jul-2026',
      label: 'July 2026',
      weightKg: '83.1',
      delta: '−1.1',
      cells: [
        { label: 'Waist', value: '79 cm' },
        { label: 'Chest', value: '103 cm' },
        { label: 'Hips', value: '96 cm' },
        { label: 'Body fat', value: '17.4%' },
      ],
      note: 'Travel week mid-month, two sessions missed. Protein held at 150 g.',
      by: 'coach',
      byLine: 'Logged by Sam · 2 Jul',
      photos: 2,
    },
    {
      id: 'chk-jun-2026',
      label: 'June 2026',
      weightKg: '84.2',
      delta: '—',
      cells: [
        { label: 'Waist', value: '80.5 cm' },
        { label: 'Chest', value: '103 cm' },
        { label: 'Hips', value: '97 cm' },
        { label: 'Body fat', value: '18.1%' },
      ],
      note: 'Baseline check-in at the start of Upper/Lower.',
      by: 'you',
      byLine: 'Logged by you · 1 Jun',
      photos: 2,
    },
  ],
};

let checkInState: ApiMonthlyCheckIns = initialCheckIns;

export function mockCheckIns(): ApiMonthlyCheckIns {
  return checkInState;
}

/**
 * Mirrors POST/PUT /client/check-ins. The caller hands over a fully composed
 * entry — the label, delta and byLine are the server's job for real, and
 * composing them in one place keeps the optimistic row and the refetched row
 * identical. "Logged" restates the count so the stat row stays honest.
 */
export function mockSaveCheckIn(entry: ApiCheckIn): void {
  const existing = checkInState.entries.some((current) => current.id === entry.id);
  const entries = existing
    ? checkInState.entries.map((current) => (current.id === entry.id ? entry : current))
    : [entry, ...checkInState.entries];

  checkInState = {
    ...checkInState,
    entries,
    stats: checkInState.stats.map((stat) =>
      stat.label === 'Logged' ? { ...stat, value: `${entries.length}` } : stat,
    ),
  };
}

/** Mirrors POST /client/check-ins/coach-edit — write access only, not visibility. */
export function mockToggleCoachEdit(enabled: boolean): void {
  checkInState = { ...checkInState, coachCanEdit: enabled };
}
