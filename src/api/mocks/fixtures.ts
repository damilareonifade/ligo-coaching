import type {
  ApiActivityGroup,
  ApiChatMessage,
  ApiCheckIn,
  ApiClientChat,
  ApiCoachGroupSummary,
  ApiCoachThread,
  ApiCommunity,
  ApiCommunityBoard,
  ApiCommunityBoardSummary,
  ApiCommunityGroup,
  ApiCommunityGroupSummary,
  ApiCommunityInvite,
  ApiCommunityMember,
  ApiInboxEntry,
  BoardMetric,
  CommunityIdentity,
  ApiClientData,
  ApiClientHealth,
  ApiClientProfile,
  ApiClientProgress,
  ApiClientSession,
  ApiClientToday,
  ApiCoach,
  ApiExerciseOption,
  ApiFoodDay,
  ApiFoodResult,
  ApiIntegration,
  ApiMonthlyCheckIns,
  ApiNotificationSettings,
  ApiProgram,
  ApiProgramDetail,
  ApiProgramSummary,
  ApiRoster,
  ApiRosterClient,
  ApiRosterLabel,
  ApiSession,
  ApiSettingsGroup,
  ApiSessionSet,
  ApiStudent,
  ApiTrainOverview,
  ApiVolumePoint,
  RosterAttention,
  StudentStatus,
} from '@/api/types';
import { markActivityRead } from '@/lib/activity';
import {
  communityRowValue,
  deriveBoardStats,
  ordinal,
  resolveDisplayName,
  withRanks,
} from '@/lib/community';
import { initials } from '@/lib/format';
import { appendOwnMessage, filterInbox, withLatestPreview } from '@/lib/messages';
import { assignedLabel, filterExerciseOptions } from '@/lib/programs';
import { accessLabel, deriveRosterStats, withLabelCounts } from '@/lib/roster';
import { useAuthStore } from '@/store/authStore';

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

/** Stable per-id spread. Seeding off one character collides constantly — every
 *  id ending in the same letter drew the same chart. */
function hashId(id: string): number {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) % 100000;
  }
  return hash;
}

export function mockVolume(studentId: string): readonly ApiVolumePoint[] {
  // Deterministic per student so the chart is stable across reloads.
  const seed = hashId(studentId);
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

const mockClientProfileBase: ApiClientProfile = {
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

/**
 * Mirrors GET /client/profile. The Community row's value is read off the
 * community state rather than authored beside it — accept an invite and the
 * count on this row has already moved by the time the profile is next opened.
 *
 * It sits after Nutrition and before Account: community is about other people,
 * so it belongs next to the coach section, not filed away under settings.
 */
export function mockClientProfile(): ApiClientProfile {
  const community = mockCommunity();
  const communityGroup: ApiSettingsGroup = {
    id: 'community',
    title: 'COMMUNITY',
    rows: [
      {
        id: 'community',
        label: 'Groups & leaderboards',
        desc: 'Optional. Nothing is shared until you opt in.',
        value: communityRowValue(community),
        route: '/community',
      },
    ],
  };

  const groups = [...mockClientProfileBase.groups];
  groups.splice(2, 0, communityGroup);

  return { ...mockClientProfileBase, groups };
}

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
      from: 'them',
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
      from: 'them',
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
      from: 'them',
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

/* ------------------------------------------------------------------ *
 * Coach roster. `access` is the client's own setting mirrored back to
 * the coach — the mock never widens it, and neither does the app.
 * ------------------------------------------------------------------ */

const rosterClients: readonly ApiRosterClient[] = [
  {
    id: 'rc-maya',
    name: 'Maya Andersson',
    initials: 'MA',
    daysAgo: 0,
    when: 'now',
    meta: 'Upper/Lower · wk 6 · workouts, nutrition',
    attention: 'live',
    access: 'partial',
    labelId: 'prep',
  },
  {
    id: 'rc-priya',
    name: 'Priya Bhatt',
    initials: 'PB',
    daysAgo: 0,
    when: '2h',
    meta: 'Push/Pull · wk 3 · cut two sets short',
    attention: 'review',
    access: 'full',
    labelId: 'online',
  },
  {
    id: 'rc-tomas',
    name: 'Tomas Lindqvist',
    initials: 'TL',
    daysAgo: 0,
    when: '5h',
    meta: 'Full body · wk 9 · everything shared, can log',
    attention: 'ok',
    access: 'full',
    labelId: 'inperson',
  },
  {
    id: 'rc-sofia',
    name: 'Sofia Nilsson',
    initials: 'SN',
    daysAgo: 0,
    when: '6h',
    meta: 'Strength 5×5 · wk 12 · workouts',
    attention: 'ok',
    access: 'partial',
    labelId: 'prep',
  },
  {
    id: 'rc-hana',
    name: 'Hana Watanabe',
    initials: 'HW',
    daysAgo: 0,
    when: '7h',
    meta: 'Attached today · nutrition only',
    attention: 'new',
    access: 'min',
    labelId: 'trial',
  },
  {
    id: 'rc-rafa',
    name: 'Rafa Moreno',
    initials: 'RM',
    daysAgo: 0,
    when: '8h',
    meta: 'Upper/Lower · wk 2 · workouts, nutrition',
    attention: 'ok',
    access: 'partial',
    labelId: 'online',
  },
  {
    id: 'rc-amir',
    name: 'Amir Haddad',
    initials: 'AH',
    daysAgo: 1,
    when: '1d',
    meta: 'Hypertrophy · wk 7 · two planned days missed',
    attention: 'review',
    access: 'partial',
    labelId: 'online',
  },
  {
    id: 'rc-jenna',
    name: 'Jenna Ruiz',
    initials: 'JR',
    daysAgo: 1,
    when: '1d',
    meta: 'No program · nutrition only',
    attention: 'ok',
    access: 'min',
    labelId: 'trial',
  },
  {
    id: 'rc-ines',
    name: 'Ines Silva',
    initials: 'IS',
    daysAgo: 1,
    when: '1d',
    meta: 'Upper/Lower · wk 4 · everything shared',
    attention: 'ok',
    access: 'full',
    labelId: 'inperson',
  },
  {
    id: 'rc-lena',
    name: 'Lena Chen',
    initials: 'LC',
    daysAgo: 2,
    when: '2d',
    meta: 'Push/Pull · wk 8 · everything shared, can log',
    attention: 'ok',
    access: 'full',
    labelId: 'prep',
  },
  {
    id: 'rc-dara',
    name: 'Dara Owusu',
    initials: 'DO',
    daysAgo: 3,
    when: '3d',
    meta: 'Messaging only · nothing shared',
    attention: 'ok',
    access: 'none',
    labelId: 'online',
  },
  {
    id: 'rc-tom',
    name: 'Tom Oyelaran',
    initials: 'TO',
    daysAgo: 3,
    when: '3d',
    meta: 'Strength 5×5 · wk 1 · workouts',
    attention: 'ok',
    access: 'partial',
    labelId: 'rehab',
  },
  {
    id: 'rc-noah',
    name: 'Noah Fischer',
    initials: 'NF',
    daysAgo: 4,
    when: '4d',
    meta: 'No program · nutrition, metrics',
    attention: 'ok',
    access: 'partial',
    labelId: 'rehab',
  },
  {
    id: 'rc-elif',
    name: 'Elif Kaya',
    initials: 'EK',
    daysAgo: 5,
    when: '5d',
    meta: 'Full body · wk 5 · health profile hidden',
    attention: 'ok',
    access: 'partial',
    labelId: 'inperson',
  },
  {
    id: 'rc-kai',
    name: 'Kai Vogt',
    initials: 'KV',
    daysAgo: 9,
    when: '1w',
    meta: 'Upper/Lower · wk 3 · workouts, metrics',
    attention: 'quiet',
    access: 'partial',
    labelId: 'online',
  },
  {
    id: 'rc-grace',
    name: 'Grace Osei',
    initials: 'GO',
    daysAgo: 11,
    when: '2w',
    meta: 'No program · workouts',
    attention: 'quiet',
    access: 'min',
    labelId: 'trial',
  },
  {
    id: 'rc-marek',
    name: 'Marek Kowalski',
    initials: 'MK',
    daysAgo: 21,
    when: '3w',
    meta: 'Full body · wk 11 · workouts, metrics',
    attention: 'quiet',
    access: 'partial',
    labelId: 'rehab',
  },
];

/** Counts are filled in by `composeRoster` — authoring them would go stale. */
const initialLabels: readonly ApiRosterLabel[] = [
  { id: 'prep', name: 'Comp prep', color: 'label-violet', count: 0 },
  { id: 'rehab', name: 'Rehab', color: 'label-amber', count: 0 },
  { id: 'online', name: 'Online', color: 'label-sky', count: 0 },
  { id: 'inperson', name: 'In person', color: 'label-green', count: 0 },
  { id: 'trial', name: 'Trial', color: 'label-slate', count: 0 },
];

const INVITE_CODE = 'SAM-4KQ2';

function composeRoster(
  clients: readonly ApiRosterClient[],
  labels: readonly ApiRosterLabel[],
): ApiRoster {
  return {
    stats: deriveRosterStats(clients),
    clients,
    labels: withLabelCounts(labels, clients),
    inviteCode: INVITE_CODE,
  };
}

let rosterState: ApiRoster = composeRoster(rosterClients, initialLabels);

/**
 * Student detail for a roster row. The roster and the older student fixtures
 * are two different casts, so without this every row on the roster opened a
 * "no longer on your roster" error. A real backend has one clients table; the
 * mock derives the detail from the roster entry so the name on the row is the
 * name on the screen.
 */
export function mockStudentFromRoster(id: string): ApiStudent | null {
  const client = rosterState.clients.find((candidate) => candidate.id === id);
  if (!client) return null;

  const status: StudentStatus =
    client.attention === 'review' ? 'at-risk' : client.attention === 'quiet' ? 'inactive' : 'on-track';

  // Adherence tracks how the client is doing, not how recently they opened the
  // app — deriving it from `daysAgo` gave every client seen today the same 96%,
  // and put a reassuring number next to someone flagged for review. Anchor it
  // to `attention` and spread it deterministically so no two rows are twins.
  const base: Record<RosterAttention, number> = {
    live: 88,
    ok: 86,
    new: 72,
    review: 61,
    quiet: 48,
  };
  const adherence = Math.min(99, base[client.attention] + (hashId(client.id) % 9));

  return {
    id: client.id,
    name: client.name,
    avatarUrl: null,
    goal: client.meta.split(' · ')[0] ?? 'No program',
    programId: null,
    status,
    adherence,
    nextSessionAt: null,
    lastSessionAt: at(-client.daysAgo, 7, 30),
    note: null,
  };
}

export function mockRoster(): ApiRoster {
  return rosterState;
}

/** Mirrors POST /coach/roster/labels. A new label files nobody by itself. */
export function mockCreateLabel(label: ApiRosterLabel): void {
  rosterState = composeRoster(rosterState.clients, [...rosterState.labels, label]);
}

/** Mirrors PATCH /coach/roster/labels/:id — the name only, never the filing. */
export function mockRenameLabel(id: string, name: string): void {
  rosterState = composeRoster(
    rosterState.clients,
    rosterState.labels.map((label) => (label.id === id ? { ...label, name } : label)),
  );
}

/**
 * Mirrors DELETE /coach/roster/labels/:id. Deleting a label unfiles the
 * clients that carried it and does nothing else — nobody is detached, no
 * permission moves, which is exactly what the labels screen promises.
 */
export function mockDeleteLabel(id: string): void {
  rosterState = composeRoster(
    rosterState.clients.map((client) =>
      client.labelId === id ? { ...client, labelId: null } : client,
    ),
    rosterState.labels.filter((label) => label.id !== id),
  );
}

/* ------------------------------------------------------------------ *
 * Coach programs — the library, the editor and the exercise catalogue.
 *
 * `assignedIds` are roster ids (`rc-*`), not the older `stu-*` cast that
 * `mockPrograms` above uses: the avatars on a program card have to be
 * the same people the coach sees on the roster, or the two screens
 * disagree about who they coach. See `mockStudentFromRoster` for the
 * same reconciliation on the student detail route.
 * ------------------------------------------------------------------ */

/** Full details are the source of truth; the library is derived from them. */
const initialProgramDetails: readonly ApiProgramDetail[] = [
  {
    id: 'pg-upper-lower',
    name: 'Upper/Lower 4×',
    meta: 'Upper/Lower · 12 weeks · 4 days',
    status: 'draft',
    statusLabel: 'Draft changes',
    assignedIds: ['rc-maya', 'rc-rafa', 'rc-ines', 'rc-kai'],
    assignedLabel: assignedLabel(4),
    weeks: 12,
    hasDraftChanges: true,
    days: [
      {
        id: 'day-upper-a',
        label: 'Upper A',
        blocks: [
          {
            id: 'blk-ul-1',
            name: 'Bench press',
            scheme: '4 × 8',
            rpe: 'RPE 8',
            note: 'Elbows tucked, pause on the chest.',
          },
          { id: 'blk-ul-2', name: 'Incline DB press', scheme: '3 × 10', rpe: 'RPE 8', note: null },
          { id: 'blk-ul-3', name: 'Barbell row', scheme: '4 × 8', rpe: 'RPE 8', note: null },
          { id: 'blk-ul-4', name: 'Cable fly', scheme: '3 × 12', rpe: 'RPE 7', note: null },
        ],
      },
      {
        id: 'day-lower-a',
        label: 'Lower A',
        blocks: [
          {
            id: 'blk-ul-5',
            name: 'Back squat',
            scheme: '4 × 6',
            rpe: 'RPE 8',
            note: 'Brace before you unrack, not after.',
          },
          { id: 'blk-ul-6', name: 'Romanian deadlift', scheme: '3 × 8', rpe: 'RPE 7', note: null },
          { id: 'blk-ul-7', name: 'Leg press', scheme: '3 × 12', rpe: 'RPE 8', note: null },
          { id: 'blk-ul-8', name: 'Standing calf raise', scheme: '4 × 12', rpe: '', note: null },
        ],
      },
      {
        id: 'day-upper-b',
        label: 'Upper B',
        blocks: [
          { id: 'blk-ul-9', name: 'Overhead press', scheme: '4 × 6', rpe: 'RPE 8', note: null },
          { id: 'blk-ul-10', name: 'Weighted pull-up', scheme: '4 × 6', rpe: 'RPE 8', note: null },
          { id: 'blk-ul-11', name: 'Seated cable row', scheme: '3 × 10', rpe: 'RPE 7', note: null },
          { id: 'blk-ul-12', name: 'Lateral raise', scheme: '3 × 15', rpe: '', note: null },
        ],
      },
      {
        id: 'day-lower-b',
        label: 'Lower B',
        blocks: [
          { id: 'blk-ul-13', name: 'Front squat', scheme: '4 × 5', rpe: 'RPE 8', note: null },
          {
            id: 'blk-ul-14',
            name: 'Hip thrust',
            scheme: '3 × 10',
            rpe: 'RPE 8',
            note: 'Ribs down, finish with the glutes.',
          },
          { id: 'blk-ul-15', name: 'Walking lunge', scheme: '3 × 12', rpe: 'RPE 7', note: null },
        ],
      },
    ],
  },
  {
    id: 'pg-ppl',
    name: 'Push Pull Legs',
    meta: 'PPL · 8 weeks · 6 days',
    status: 'published',
    statusLabel: 'Published',
    assignedIds: ['rc-priya', 'rc-lena', 'rc-amir', 'rc-elif', 'rc-marek', 'rc-grace'],
    assignedLabel: assignedLabel(6),
    weeks: 8,
    hasDraftChanges: false,
    days: [
      {
        id: 'day-push-a',
        label: 'Push A',
        blocks: [
          { id: 'blk-ppl-1', name: 'Bench press', scheme: '4 × 6', rpe: 'RPE 8', note: null },
          { id: 'blk-ppl-2', name: 'Overhead press', scheme: '3 × 8', rpe: 'RPE 8', note: null },
          { id: 'blk-ppl-3', name: 'Cable fly', scheme: '3 × 12', rpe: 'RPE 7', note: null },
        ],
      },
      {
        id: 'day-pull-a',
        label: 'Pull A',
        blocks: [
          { id: 'blk-ppl-4', name: 'Weighted pull-up', scheme: '4 × 6', rpe: 'RPE 8', note: null },
          { id: 'blk-ppl-5', name: 'Barbell row', scheme: '4 × 8', rpe: 'RPE 8', note: null },
          { id: 'blk-ppl-6', name: 'Face pull', scheme: '3 × 15', rpe: '', note: null },
        ],
      },
      {
        id: 'day-legs-a',
        label: 'Legs A',
        blocks: [
          { id: 'blk-ppl-7', name: 'Back squat', scheme: '4 × 6', rpe: 'RPE 8', note: null },
          { id: 'blk-ppl-8', name: 'Romanian deadlift', scheme: '3 × 8', rpe: 'RPE 7', note: null },
          { id: 'blk-ppl-9', name: 'Leg press', scheme: '3 × 12', rpe: 'RPE 8', note: null },
        ],
      },
      {
        id: 'day-push-b',
        label: 'Push B',
        blocks: [
          { id: 'blk-ppl-10', name: 'Incline DB press', scheme: '4 × 8', rpe: 'RPE 8', note: null },
          { id: 'blk-ppl-11', name: 'Dip', scheme: '3 × 10', rpe: 'RPE 8', note: null },
          { id: 'blk-ppl-12', name: 'Lateral raise', scheme: '3 × 15', rpe: '', note: null },
        ],
      },
      {
        id: 'day-pull-b',
        label: 'Pull B',
        blocks: [
          { id: 'blk-ppl-13', name: 'Lat pulldown', scheme: '4 × 10', rpe: 'RPE 8', note: null },
          { id: 'blk-ppl-14', name: 'Seated cable row', scheme: '3 × 10', rpe: 'RPE 7', note: null },
          { id: 'blk-ppl-15', name: 'Hammer curl', scheme: '3 × 12', rpe: '', note: null },
        ],
      },
      {
        id: 'day-legs-b',
        label: 'Legs B',
        blocks: [
          { id: 'blk-ppl-16', name: 'Front squat', scheme: '4 × 5', rpe: 'RPE 8', note: null },
          { id: 'blk-ppl-17', name: 'Hip thrust', scheme: '3 × 10', rpe: 'RPE 8', note: null },
          { id: 'blk-ppl-18', name: 'Standing calf raise', scheme: '4 × 12', rpe: '', note: null },
        ],
      },
    ],
  },
  {
    id: 'pg-strength-5x5',
    name: 'Strength 5×5',
    meta: 'Full body · 10 weeks · 3 days',
    status: 'published',
    statusLabel: 'Published',
    assignedIds: ['rc-sofia', 'rc-tom', 'rc-tomas'],
    assignedLabel: assignedLabel(3),
    weeks: 10,
    hasDraftChanges: false,
    days: [
      {
        id: 'day-5x5-1',
        label: 'Day 1',
        blocks: [
          { id: 'blk-5x5-1', name: 'Back squat', scheme: '5 × 5', rpe: 'RPE 8', note: null },
          { id: 'blk-5x5-2', name: 'Bench press', scheme: '5 × 5', rpe: 'RPE 8', note: null },
          { id: 'blk-5x5-3', name: 'Barbell row', scheme: '5 × 5', rpe: 'RPE 7', note: null },
        ],
      },
      {
        id: 'day-5x5-2',
        label: 'Day 2',
        blocks: [
          { id: 'blk-5x5-4', name: 'Back squat', scheme: '5 × 5', rpe: 'RPE 8', note: null },
          { id: 'blk-5x5-5', name: 'Overhead press', scheme: '5 × 5', rpe: 'RPE 8', note: null },
          {
            id: 'blk-5x5-6',
            name: 'Deadlift',
            scheme: '1 × 5',
            rpe: 'RPE 8',
            note: 'One heavy set. Reset every rep.',
          },
        ],
      },
      {
        id: 'day-5x5-3',
        label: 'Day 3',
        blocks: [
          { id: 'blk-5x5-7', name: 'Back squat', scheme: '5 × 5', rpe: 'RPE 8', note: null },
          { id: 'blk-5x5-8', name: 'Bench press', scheme: '5 × 5', rpe: 'RPE 8', note: null },
          { id: 'blk-5x5-9', name: 'Weighted pull-up', scheme: '3 × 6', rpe: 'RPE 7', note: null },
        ],
      },
    ],
  },
  {
    id: 'pg-return',
    name: 'Return to lifting',
    meta: 'Rehab · 6 weeks · 3 days',
    status: 'archived',
    statusLabel: 'Archived',
    assignedIds: [],
    assignedLabel: assignedLabel(0),
    weeks: 6,
    hasDraftChanges: false,
    days: [
      {
        id: 'day-return-1',
        label: 'Day 1',
        blocks: [
          {
            id: 'blk-rt-1',
            name: 'Goblet squat',
            scheme: '3 × 10',
            rpe: 'RPE 6',
            note: 'Stop two reps short, every set.',
          },
          { id: 'blk-rt-2', name: 'Push-up', scheme: '3 × 8', rpe: 'RPE 6', note: null },
          { id: 'blk-rt-3', name: 'Dead bug', scheme: '3 × 10', rpe: '', note: null },
        ],
      },
      {
        id: 'day-return-2',
        label: 'Day 2',
        blocks: [
          { id: 'blk-rt-4', name: 'Split squat', scheme: '3 × 10', rpe: 'RPE 6', note: null },
          { id: 'blk-rt-5', name: 'Lat pulldown', scheme: '3 × 12', rpe: 'RPE 6', note: null },
          { id: 'blk-rt-6', name: 'Side plank', scheme: '3 × 30', rpe: '', note: null },
        ],
      },
      {
        id: 'day-return-3',
        label: 'Day 3',
        blocks: [
          { id: 'blk-rt-7', name: 'Hip thrust', scheme: '3 × 12', rpe: 'RPE 6', note: null },
          { id: 'blk-rt-8', name: 'Seated cable row', scheme: '3 × 12', rpe: 'RPE 6', note: null },
          { id: 'blk-rt-9', name: 'Farmer carry', scheme: '3 × 40', rpe: '', note: null },
        ],
      },
    ],
  },
];

let programState: readonly ApiProgramDetail[] = initialProgramDetails;

/** The library card reads the same fields the detail does — never a second copy. */
function toSummary(detail: ApiProgramDetail): ApiProgramSummary {
  return {
    id: detail.id,
    name: detail.name,
    meta: detail.meta,
    status: detail.status,
    statusLabel: detail.statusLabel,
    assignedIds: detail.assignedIds,
    assignedLabel: detail.assignedLabel,
  };
}

export function mockProgramLibrary(): readonly ApiProgramSummary[] {
  return programState.map(toSummary);
}

export function mockProgramDetail(id: string): ApiProgramDetail | null {
  return programState.find((program) => program.id === id) ?? null;
}

/**
 * Mirrors POST/PUT /coach/programs. A save never publishes — a program the
 * coach edits goes back to "Draft changes" until they send it out, which is
 * the promise the library note makes.
 */
export function mockSaveProgram(program: ApiProgramDetail): void {
  const exists = programState.some((candidate) => candidate.id === program.id);
  programState = exists
    ? programState.map((candidate) => (candidate.id === program.id ? program : candidate))
    : [program, ...programState];
}

/** Mirrors POST /coach/programs/:id/publish — the draft becomes what clients hold. */
export function mockPublishProgram(id: string): void {
  programState = programState.map((program) =>
    program.id === id
      ? { ...program, status: 'published', statusLabel: 'Published', hasDraftChanges: false }
      : program,
  );
}

const initialExerciseOptions: readonly ApiExerciseOption[] = [
  { id: 'ex-bench', name: 'Bench press', meta: 'Barbell · Chest', tag: 'Compound', group: 'Recent' },
  { id: 'ex-row', name: 'Barbell row', meta: 'Barbell · Back', tag: 'Compound', group: 'Recent' },
  {
    id: 'ex-goblet',
    name: 'Goblet squat',
    meta: 'Dumbbell · Quads',
    tag: 'Accessory',
    group: 'Recent',
  },
  {
    id: 'ex-sam-split',
    name: "Sam's split squat",
    meta: 'Dumbbell · Quads',
    tag: 'Yours',
    group: 'Recent',
  },
  {
    id: 'ex-incline',
    name: 'Incline DB press',
    meta: 'Dumbbell · Chest',
    tag: 'Compound',
    group: 'Chest',
  },
  { id: 'ex-fly', name: 'Cable fly', meta: 'Cable · Chest', tag: 'Accessory', group: 'Chest' },
  { id: 'ex-pushup', name: 'Push-up', meta: 'Bodyweight · Chest', tag: 'Accessory', group: 'Chest' },
  {
    id: 'ex-pulldown',
    name: 'Lat pulldown',
    meta: 'Cable · Back',
    tag: 'Compound',
    group: 'Back',
  },
  {
    id: 'ex-cable-row',
    name: 'Seated cable row',
    meta: 'Cable · Back',
    tag: 'Accessory',
    group: 'Back',
  },
  {
    id: 'ex-pullup',
    name: 'Weighted pull-up',
    meta: 'Bodyweight · Back',
    tag: 'Compound',
    group: 'Back',
  },
  { id: 'ex-squat', name: 'Back squat', meta: 'Barbell · Quads', tag: 'Compound', group: 'Legs' },
  {
    id: 'ex-rdl',
    name: 'Romanian deadlift',
    meta: 'Barbell · Hamstrings',
    tag: 'Compound',
    group: 'Legs',
  },
  { id: 'ex-legpress', name: 'Leg press', meta: 'Machine · Quads', tag: 'Accessory', group: 'Legs' },
  {
    id: 'ex-ohp',
    name: 'Overhead press',
    meta: 'Barbell · Shoulders',
    tag: 'Compound',
    group: 'Shoulders',
  },
  {
    id: 'ex-lateral',
    name: 'Lateral raise',
    meta: 'Dumbbell · Shoulders',
    tag: 'Accessory',
    group: 'Shoulders',
  },
];

let exerciseState: readonly ApiExerciseOption[] = initialExerciseOptions;

/** Mirrors GET /coach/exercises?q=&filter= — the app filters with the same function. */
export function mockExerciseOptions(query: string, filter: string): readonly ApiExerciseOption[] {
  return filterExerciseOptions(exerciseState, query, filter);
}

export interface MockCreateExerciseInput {
  readonly name: string;
  readonly muscle: string;
  readonly equipment: string;
}

/**
 * Mirrors POST /coach/exercises. A coach's own exercise lands at the top of
 * Recent — they built it to use it right now, so it must not be three
 * sections down behind the catalogue.
 */
export function mockCreateExercise(input: MockCreateExerciseInput): void {
  exerciseState = [
    {
      id: `ex-${Date.now()}`,
      name: input.name,
      meta: `${input.equipment} · ${input.muscle}`,
      tag: 'Yours',
      group: 'Recent',
    },
    ...exerciseState,
  ];
}

/* ------------------------------------------------------------------ *
 * Coach activity. Everything that happened across the roster, grouped
 * the way a coach reads it: what needs him now, then what he missed.
 *
 * Half of this feed is access — clients giving and taking back what he
 * can see. That is deliberate. A coach who only ever hears about
 * sessions learns nothing about the boundary he is working inside.
 * ------------------------------------------------------------------ */

const initialActivity: readonly ApiActivityGroup[] = [
  {
    id: 'today',
    title: 'TODAY',
    items: [
      {
        id: 'act-1',
        kind: 'session-done',
        clientId: 'rc-maya',
        clientName: 'Maya Andersson',
        initials: 'MA',
        title: 'Maya finished Upper A',
        body: '7 of 7 sets · 48 min · one PR on bench',
        when: '2h',
        unread: true,
      },
      {
        id: 'act-2',
        kind: 'permission-revoked',
        clientId: 'rc-elif',
        clientName: 'Elif Kaya',
        initials: 'EK',
        title: 'Elif hid her health profile',
        body: 'You can still see workouts and nutrition.',
        when: '4h',
        unread: true,
      },
      {
        id: 'act-3',
        kind: 'session-missed',
        clientId: 'rc-amir',
        clientName: 'Amir Haddad',
        initials: 'AH',
        title: 'Amir missed Push day',
        body: 'Second planned day missed this week.',
        when: '6h',
        unread: false,
      },
      {
        id: 'act-4',
        kind: 'check-in',
        clientId: 'rc-lena',
        clientName: 'Lena Chen',
        initials: 'LC',
        title: 'Lena logged August check-in',
        body: '82.4 kg · waist down 0.7 cm · note attached',
        when: '8h',
        unread: false,
      },
    ],
  },
  {
    id: 'earlier',
    title: 'EARLIER THIS WEEK',
    items: [
      {
        id: 'act-5',
        kind: 'attached',
        clientId: 'rc-hana',
        clientName: 'Hana Watanabe',
        initials: 'HW',
        title: 'Hana attached',
        body: 'She shared nutrition only.',
        when: '1d',
        unread: false,
      },
      {
        id: 'act-6',
        kind: 'permission-granted',
        clientId: 'rc-priya',
        clientName: 'Priya Bhatt',
        initials: 'PB',
        title: 'Priya granted monthly check-ins',
        body: 'Includes logging on her behalf.',
        when: '2d',
        unread: false,
      },
      {
        id: 'act-7',
        kind: 'message',
        clientId: 'rc-tomas',
        clientName: 'Tomas Lindqvist',
        initials: 'TL',
        title: 'Tomas replied',
        body: '"Shoulder felt fine on the incline work."',
        when: '3d',
        unread: false,
      },
      {
        id: 'act-8',
        kind: 'detached',
        clientId: 'rc-ben',
        clientName: 'Ben Jarvis',
        initials: 'BJ',
        title: 'Ben detached',
        body: 'His data went with him. The thread stays readable.',
        when: '4d',
        unread: false,
      },
    ],
  },
];

let activityState: readonly ApiActivityGroup[] = initialActivity;

export function mockActivity(): readonly ApiActivityGroup[] {
  return activityState;
}

/** Mirrors POST /coach/activity/:id/read. Reading is per item, never per group. */
export function mockMarkActivityRead(itemId: string): void {
  activityState = markActivityRead(activityState, itemId);
}

/* ------------------------------------------------------------------ *
 * Coach messages — the inbox and one thread per client.
 *
 * `accessLabel` is read off the roster rather than authored here. Two
 * sources of truth for what a client shares is exactly how a coach
 * ends up looking at a stale "Full access" on someone who revoked it.
 * ------------------------------------------------------------------ */

function rosterAccessLabel(clientId: string): string {
  const client = rosterState.clients.find((candidate) => candidate.id === clientId);
  // An unattached client can still have a readable thread — see `archived`.
  return client ? accessLabel[client.access] : 'Messaging only';
}

interface InboxSeed {
  readonly clientId: string;
  readonly name: string;
  readonly initials: string;
  readonly preview: string;
  readonly when: string;
  readonly unread: boolean;
}

/** Newest first — the order the coach reads, and the order a reply re-sorts to. */
const inboxSeeds: readonly InboxSeed[] = [
  {
    clientId: 'rc-maya',
    name: 'Maya Andersson',
    initials: 'MA',
    preview: 'Felt strong today — bench moved well.',
    when: '2h',
    unread: true,
  },
  {
    clientId: 'rc-priya',
    name: 'Priya Bhatt',
    initials: 'PB',
    preview: 'Can we drop the incline volume?',
    when: '5h',
    unread: true,
  },
  {
    clientId: 'rc-tomas',
    name: 'Tomas Lindqvist',
    initials: 'TL',
    preview: 'Shoulder felt fine on the incline work.',
    when: '1d',
    unread: false,
  },
  {
    clientId: 'rc-dara',
    name: 'Dara Owusu',
    initials: 'DO',
    preview: "Thanks — I'll try that warm-up.",
    when: '3d',
    unread: false,
  },
  {
    clientId: 'rc-ben',
    name: 'Ben Jarvis',
    initials: 'BJ',
    preview: 'Cheers for everything.',
    when: '1w',
    unread: false,
  },
];

let inboxState: readonly ApiInboxEntry[] = inboxSeeds.map((seed) => ({
  ...seed,
  accessLabel: rosterAccessLabel(seed.clientId),
}));

/**
 * Threads. `from: 'me'` is the coach here — the same field the client's app
 * reads as themselves. Maya's is the far side of the thread in `initialChat`:
 * the shoulder, the incline, the sleep, seen from the seat that asked.
 */
const initialThreads: readonly ApiCoachThread[] = [
  {
    clientId: 'rc-maya',
    name: 'Maya Andersson',
    initials: 'MA',
    accessLabel: rosterAccessLabel('rc-maya'),
    archived: false,
    messages: [
      { id: 'cm-maya-1', from: 'me', text: 'How did the shoulder feel on the incline work?', when: 'Mon 09:12' },
      { id: 'cm-maya-2', from: 'them', text: 'Much better. No pinch at all on the top set.', when: 'Mon 09:31' },
      {
        id: 'cm-maya-3',
        from: 'me',
        text: "I'll add a set to the incline next week and hold the bench where it is.",
        when: 'Mon 09:34',
      },
      { id: 'cm-maya-4', from: 'them', text: 'Sounds good. Sleep has been better too — 7h most nights.', when: 'Tue 21:04' },
      { id: 'cm-maya-5', from: 'me', text: "That'll be doing a lot of the work. Keep the protein where it is.", when: 'Wed 07:48' },
      { id: 'cm-maya-6', from: 'them', text: 'Felt strong today — bench moved well.', when: 'Today 16:20' },
    ],
  },
  {
    clientId: 'rc-priya',
    name: 'Priya Bhatt',
    initials: 'PB',
    accessLabel: rosterAccessLabel('rc-priya'),
    archived: false,
    messages: [
      { id: 'cm-priya-1', from: 'me', text: 'You cut two sets short on Push yesterday — anything going on?', when: 'Tue 18:02' },
      { id: 'cm-priya-2', from: 'them', text: 'Elbow was grumbling by the third incline set, so I stopped.', when: 'Tue 18:20' },
      { id: 'cm-priya-3', from: 'me', text: 'Right call. Stopping early beats training through it.', when: 'Tue 18:24' },
      { id: 'cm-priya-4', from: 'them', text: 'It settled overnight. Fine on pressing today.', when: 'Wed 08:11' },
      { id: 'cm-priya-5', from: 'me', text: "Good. Let's keep the pressing and take the pressure off the elbow elsewhere.", when: 'Wed 08:30' },
      { id: 'cm-priya-6', from: 'them', text: 'Can we drop the incline volume?', when: 'Today 13:05' },
    ],
  },
  {
    clientId: 'rc-tomas',
    name: 'Tomas Lindqvist',
    initials: 'TL',
    accessLabel: rosterAccessLabel('rc-tomas'),
    archived: false,
    messages: [
      { id: 'cm-tomas-1', from: 'me', text: 'Week 9 done. How is the shoulder holding up under the volume?', when: 'Sun 10:40' },
      { id: 'cm-tomas-2', from: 'them', text: 'Shoulder felt fine on the incline work.', when: 'Sun 11:02' },
      { id: 'cm-tomas-3', from: 'me', text: 'Then we hold the plan as written for week 10.', when: 'Sun 11:15' },
    ],
  },
  {
    clientId: 'rc-dara',
    name: 'Dara Owusu',
    initials: 'DO',
    accessLabel: rosterAccessLabel('rc-dara'),
    archived: false,
    messages: [
      { id: 'cm-dara-1', from: 'them', text: 'Knees feel cold on the first squat set. Normal?', when: 'Thu 07:30' },
      { id: 'cm-dara-2', from: 'me', text: 'Common enough. Two easy sets of 10 before you load up, and give it five minutes.', when: 'Thu 08:04' },
      { id: 'cm-dara-3', from: 'them', text: "Thanks — I'll try that warm-up.", when: 'Thu 08:12' },
    ],
  },
  {
    clientId: 'rc-ben',
    name: 'Ben Jarvis',
    initials: 'BJ',
    // Detached: off the roster, so `rosterAccessLabel` no longer resolves him.
    accessLabel: 'Detached',
    archived: true,
    messages: [
      { id: 'cm-ben-1', from: 'them', text: "I'm going to take a few months off structured training.", when: 'Mon 19:44' },
      { id: 'cm-ben-2', from: 'me', text: 'Understood. The door is open whenever you want to pick it back up.', when: 'Mon 20:01' },
      { id: 'cm-ben-3', from: 'them', text: 'Cheers for everything.', when: 'Mon 20:09' },
    ],
  },
];

let threadState: readonly ApiCoachThread[] = initialThreads;

/** Mirrors GET /coach/messages?q= — the search runs server-side. */
export function mockInbox(query: string): readonly ApiInboxEntry[] {
  return filterInbox(inboxState, query);
}

export function mockCoachThread(clientId: string): ApiCoachThread | null {
  return threadState.find((thread) => thread.clientId === clientId) ?? null;
}

/**
 * Mirrors POST /coach/messages/:clientId. The stamp and id are composed
 * server-side for real. The inbox preview moves with it: a coach who replies
 * and backs out expects to see their own words on the row.
 */
export function mockSendCoachMessage(clientId: string, text: string): void {
  const message: ApiChatMessage = { id: `cm-${Date.now()}`, from: 'me', text, when: 'now' };

  threadState = threadState.map((thread) =>
    thread.clientId === clientId ? appendOwnMessage(thread, message) : thread,
  );
  inboxState = withLatestPreview(inboxState, clientId, text);
}

/* ------------------------------------------------------------------ *
 * Community — group chats and leaderboards.
 *
 * Two seats read the same group, so the mock composes `from` at read
 * time from whoever is signed in, exactly as a real server would from
 * the token on the request. That is why this block reaches for the
 * auth store: the alternative is a second hand-authored copy of every
 * thread, and two copies of one conversation is how the coach's seat
 * ends up quietly disagreeing with the client's.
 *
 * Nothing in here records a decline beyond removing the invite. There
 * is deliberately no `declinedBy` list for a later screen to discover
 * and render — a fixture that stores the answer is a backend that can
 * leak it.
 * ------------------------------------------------------------------ */

const COACH_MEMBER_ID = 'cm-sam';
const CLIENT_MEMBER_ID = 'cm-maya';

/** Who is asking. The mock stands in for a server that reads the token. */
function viewerMemberId(): string {
  return useAuthStore.getState().user?.role === 'coach' ? COACH_MEMBER_ID : CLIENT_MEMBER_ID;
}

/** Stored side-neutrally; `from` is composed per reader on the way out. */
interface GroupMessageSeed {
  readonly id: string;
  readonly senderId: string;
  readonly senderName: string;
  readonly isCoach: boolean;
  readonly text: string;
  readonly when: string;
}

interface GroupRecord {
  readonly id: string;
  readonly name: string;
  readonly coachName: string;
  readonly members: readonly ApiCommunityMember[];
  readonly myIdentity: CommunityIdentity;
  readonly messages: readonly GroupMessageSeed[];
  /** Whether the signed-in client is in it. A coach runs all of them. */
  readonly clientIsMember: boolean;
}

const SUMMER_MEMBERS: readonly ApiCommunityMember[] = [
  { clientId: COACH_MEMBER_ID, displayName: 'Sam Okafor', initials: 'SO', isCoach: true },
  { clientId: CLIENT_MEMBER_ID, displayName: 'Maya A.', initials: 'MA', isCoach: false },
  { clientId: 'cm-priya', displayName: 'Priya B.', initials: 'PB', isCoach: false },
  { clientId: 'cm-tomas', displayName: 'Tomas L.', initials: 'TL', isCoach: false },
  { clientId: 'cm-sofia', displayName: 'Sofia N.', initials: 'SN', isCoach: false },
  { clientId: 'cm-rafa', displayName: 'Rafa M.', initials: 'RM', isCoach: false },
  { clientId: 'cm-hana', displayName: 'Hana W.', initials: 'HW', isCoach: false },
];

const WINTER_MEMBERS: readonly ApiCommunityMember[] = [
  ...SUMMER_MEMBERS,
  { clientId: 'cm-dara', displayName: 'Dara O.', initials: 'DO', isCoach: false },
];

const initialGroups: readonly GroupRecord[] = [
  {
    id: 'grp-summer',
    name: 'Summer strength group',
    coachName: 'Sam Okafor',
    members: SUMMER_MEMBERS,
    myIdentity: 'first',
    clientIsMember: true,
    messages: [
      {
        id: 'gm-summer-1',
        senderId: 'cm-tomas',
        senderName: 'Tomas L.',
        isCoach: false,
        text: 'Pulled 140 × 3 this morning. First time over 135 and it moved clean.',
        when: 'Tue 07:42',
      },
      {
        id: 'gm-summer-2',
        senderId: 'cm-priya',
        senderName: 'Priya B.',
        isCoach: false,
        text: 'That is a jump. Congratulations.',
        when: 'Tue 08:05',
      },
      {
        id: 'gm-summer-3',
        senderId: COACH_MEMBER_ID,
        senderName: 'Sam Okafor',
        isCoach: true,
        text: 'Well earned. Three weeks of paused pulls did that, not this morning.',
        when: 'Tue 08:20',
      },
      {
        id: 'gm-summer-4',
        senderId: CLIENT_MEMBER_ID,
        senderName: 'Maya A.',
        isCoach: false,
        text: 'Week 6 has felt heavy the whole way through. Is a deload coming, or do we push on?',
        when: 'Tue 18:11',
      },
      {
        id: 'gm-summer-5',
        senderId: COACH_MEMBER_ID,
        senderName: 'Sam Okafor',
        isCoach: true,
        text: 'Deload next week for everyone on the Upper/Lower block. Same lifts, two sets fewer, and keep the top set honest.',
        when: 'Tue 18:40',
      },
      {
        id: 'gm-summer-6',
        senderId: 'cm-sofia',
        senderName: 'Sofia N.',
        isCoach: false,
        text: 'Good timing. My knees have been asking for one.',
        when: 'Tue 19:02',
      },
    ],
  },
  {
    // Pending: the coach runs it, but the client is not in it until the
    // invite below is accepted on her own screen.
    id: 'grp-winter',
    name: 'Winter push',
    coachName: 'Sam Okafor',
    members: WINTER_MEMBERS,
    myIdentity: 'first',
    clientIsMember: false,
    messages: [],
  },
];

let groupState: readonly GroupRecord[] = initialGroups;

const initialBoards: readonly ApiCommunityBoard[] = [
  {
    id: 'brd-autumn',
    name: 'Autumn volume challenge',
    coachName: 'Sam Okafor',
    metricLabel: 'Total volume lifted · 1–30 Sep · updates hourly',
    windowLabel: '1–30 Sep',
    optedIn: true,
    myIdentity: 'first',
    stats: [],
    rows: [
      {
        rank: 1,
        displayName: 'Tomas L.',
        initials: 'TL',
        value: '48,920 kg',
        sub: '14 sessions',
        delta: '+1',
        isMe: false,
      },
      {
        rank: 2,
        displayName: 'Maya A.',
        initials: 'MA',
        value: '42,180 kg',
        sub: '12 sessions',
        delta: '−1',
        isMe: true,
      },
      {
        rank: 3,
        displayName: 'Priya B.',
        initials: 'PB',
        value: '39,640 kg',
        sub: '13 sessions',
        delta: '+2',
        isMe: false,
      },
      {
        rank: 4,
        displayName: 'IronFox',
        initials: 'IF',
        value: '35,010 kg',
        sub: '11 sessions',
        delta: '—',
        isMe: false,
      },
      {
        rank: 5,
        displayName: 'Sofia N.',
        initials: 'SN',
        value: '31,475 kg',
        sub: '10 sessions',
        delta: '−1',
        isMe: false,
      },
      {
        rank: 6,
        displayName: 'Hana W.',
        initials: 'HW',
        value: '24,300 kg',
        sub: '9 sessions',
        delta: '+1',
        isMe: false,
      },
    ],
    invitedNotOptedIn: 3,
    facts: [
      { label: 'Metric', value: 'Total volume lifted' },
      { label: 'Window', value: '1–30 Sep' },
      { label: 'Visible to', value: '9 invited clients' },
      { label: 'Updates', value: 'Hourly' },
    ],
  },
  {
    // Invited, not joined — so the opt-in screen is reachable, and so the
    // index has both states to show. Empty rows are the honest starting
    // point: a board has nobody on it until people put themselves on it.
    id: 'brd-consistency',
    name: 'Winter consistency ladder',
    coachName: 'Sam Okafor',
    metricLabel: 'Sessions completed · 1–31 Dec · updates hourly',
    windowLabel: '1–31 Dec',
    optedIn: false,
    myIdentity: 'first',
    stats: [],
    rows: [],
    invitedNotOptedIn: 9,
    facts: [
      { label: 'Metric', value: 'Sessions completed' },
      { label: 'Window', value: '1–31 Dec' },
      { label: 'Visible to', value: '9 invited clients' },
      { label: 'Updates', value: 'Hourly' },
    ],
  },
];

/** Stats are derived on the way in, never authored beside the rows. */
let boardState: readonly ApiCommunityBoard[] = initialBoards.map((board) => ({
  ...board,
  stats: deriveBoardStats(board.rows),
}));

/** Which boards the signed-in client was invited to. Others are invisible. */
let boardsInvitedToMe: readonly string[] = ['brd-autumn', 'brd-consistency'];

const initialInvites: readonly ApiCommunityInvite[] = [
  {
    id: 'inv-winter',
    kind: 'group',
    targetId: 'grp-winter',
    name: 'Winter push',
    coachName: 'Sam Okafor',
    summary: 'Sam Okafor is inviting you to a group chat with 6 other clients he coaches.',
    visible: [
      'Your display name and messages you send',
      'That you are coached by Sam',
      'When you are active in the group',
    ],
    hidden: [
      'Your workouts, meals and measurements',
      'Your check-ins and photos',
      'Your real name, unless you choose it',
    ],
  },
];

let inviteState: readonly ApiCommunityInvite[] = initialInvites;

function groupSummary(record: GroupRecord): ApiCommunityGroupSummary {
  const last = record.messages[record.messages.length - 1];

  return {
    id: record.id,
    name: record.name,
    coachName: record.coachName,
    memberCount: record.members.length,
    preview: last ? last.text : 'No messages yet.',
    when: last ? last.when.split(' ')[0] : '',
  };
}

function boardSummary(board: ApiCommunityBoard): ApiCommunityBoardSummary {
  const mine = board.rows.find((row) => row.isMe);

  return {
    id: board.id,
    name: board.name,
    coachName: board.coachName,
    metricLabel: board.metricLabel,
    optedIn: board.optedIn,
    standing: mine ? `${ordinal(mine.rank)} of ${board.rows.length}` : 'Open to join',
  };
}

/** Mirrors GET /community — the client's index, and only what they are in. */
export function mockCommunity(): ApiCommunity {
  return {
    invites: inviteState,
    groups: groupState.filter((record) => record.clientIsMember).map(groupSummary),
    boards: boardState
      .filter((board) => boardsInvitedToMe.includes(board.id))
      .map(boardSummary),
  };
}

/** Mirrors GET /coach/community/groups — every group this coach runs. */
export function mockCoachGroups(): readonly ApiCoachGroupSummary[] {
  return groupState.map((record) => {
    const summary = groupSummary(record);
    return {
      id: summary.id,
      name: summary.name,
      memberCount: summary.memberCount,
      preview: summary.preview,
      when: summary.when,
    };
  });
}

/**
 * Mirrors GET /community/groups/:id. `from` and the identity line are composed
 * for whoever is asking, which is why the coach can open the same thread and
 * see their own messages on their own side of it.
 */
export function mockCommunityGroup(id: string): ApiCommunityGroup | null {
  const record = groupState.find((candidate) => candidate.id === id);
  if (!record) return null;

  const viewer = viewerMemberId();
  const me = record.members.find((member) => member.clientId === viewer);

  return {
    id: record.id,
    name: record.name,
    coachName: record.coachName,
    members: record.members,
    myIdentity: viewer === COACH_MEMBER_ID ? 'real' : record.myIdentity,
    myDisplayName: me?.displayName ?? '',
    messages: record.messages.map((message) => ({
      ...message,
      from: message.senderId === viewer ? 'me' : 'them',
    })),
  };
}

export function mockCommunityBoard(id: string): ApiCommunityBoard | null {
  return boardState.find((board) => board.id === id) ?? null;
}

/** Mirrors POST /community/groups/:id/messages. */
export function mockSendGroupMessage(groupId: string, text: string): void {
  const viewer = viewerMemberId();

  groupState = groupState.map((record) => {
    if (record.id !== groupId) return record;
    const sender = record.members.find((member) => member.clientId === viewer);

    return {
      ...record,
      messages: [
        ...record.messages,
        {
          id: `gm-${Date.now()}`,
          senderId: viewer,
          senderName: sender?.displayName ?? 'You',
          isCoach: sender?.isCoach ?? false,
          text,
          when: 'now',
        },
      ],
    };
  });
}

/**
 * Mirrors POST /community/invites/:id/accept. Accepting a group invite is the
 * moment the client becomes a member — before it, the group exists but she is
 * not in it and it is not on her index.
 */
export function mockAcceptInvite(inviteId: string): void {
  const invite = inviteState.find((candidate) => candidate.id === inviteId);
  if (!invite) return;

  if (invite.kind === 'group') {
    groupState = groupState.map((record) =>
      record.id === invite.targetId ? { ...record, clientIsMember: true } : record,
    );
  } else {
    boardsInvitedToMe = boardsInvitedToMe.includes(invite.targetId)
      ? boardsInvitedToMe
      : [...boardsInvitedToMe, invite.targetId];
  }

  inviteState = inviteState.filter((candidate) => candidate.id !== inviteId);
}

/**
 * Mirrors POST /community/invites/:id/decline. The invite goes and nothing is
 * written down — no reason, no record, nothing for the coach to read later.
 */
export function mockDeclineInvite(inviteId: string): void {
  inviteState = inviteState.filter((candidate) => candidate.id !== inviteId);
}

export interface MockJoinBoardInput {
  readonly boardId: string;
  readonly identity: CommunityIdentity;
  readonly handle: string;
}

/** Mirrors POST /community/boards/:id/join. The row is created here, not before. */
export function mockJoinBoard({ boardId, identity, handle }: MockJoinBoardInput): void {
  const displayName = resolveDisplayName(identity, mockClientProfileBase.name, handle);

  boardState = boardState.map((board) => {
    if (board.id !== boardId || board.optedIn) return board;

    const rows = withRanks([
      ...board.rows,
      {
        rank: board.rows.length + 1,
        displayName,
        initials: initials(displayName),
        // Nothing logged in this window yet — a joined board with an invented
        // total would be the app putting words in a client's training log.
        value: '0',
        sub: 'No sessions in this window yet',
        delta: '—',
        isMe: true,
      },
    ]);

    return {
      ...board,
      optedIn: true,
      myIdentity: identity,
      rows,
      stats: deriveBoardStats(rows),
      invitedNotOptedIn: Math.max(0, board.invitedNotOptedIn - 1),
    };
  });
}

/** Mirrors DELETE /community/boards/:id/me — the row goes, the history stays. */
export function mockLeaveBoard(boardId: string): void {
  boardState = boardState.map((board) => {
    if (board.id !== boardId) return board;

    const rows = withRanks(board.rows.filter((row) => !row.isMe));

    return {
      ...board,
      optedIn: false,
      rows,
      stats: deriveBoardStats(rows),
      invitedNotOptedIn: board.invitedNotOptedIn + 1,
    };
  });
}

/** Mirrors DELETE /community/groups/:id/me. */
export function mockLeaveGroup(groupId: string): void {
  groupState = groupState.map((record) =>
    record.id === groupId
      ? {
          ...record,
          clientIsMember: false,
          members: record.members.filter((member) => member.clientId !== CLIENT_MEMBER_ID),
        }
      : record,
  );
}

export interface MockCreateGroupInput {
  readonly name: string;
  readonly clientIds: readonly string[];
}

/**
 * Mirrors POST /coach/community/groups. The coach's own row appears; every
 * invited client is absent until they accept on their own screen, so a group
 * created here starts with exactly one member.
 */
export function mockCreateGroup({ name, clientIds }: MockCreateGroupInput): void {
  const coach: ApiCommunityMember = {
    clientId: COACH_MEMBER_ID,
    displayName: 'Sam Okafor',
    initials: 'SO',
    isCoach: true,
  };

  groupState = [
    ...groupState,
    {
      id: `grp-${Date.now()}`,
      name: name.trim(),
      coachName: 'Sam Okafor',
      members: [coach],
      myIdentity: 'first',
      clientIsMember: false,
      messages: [],
    },
  ];

  // The invited ids are deliberately not stored on the group. Who was asked is
  // the coach's business; who is in it is everybody's, and only the second is
  // ever rendered.
  void clientIds;
}

export interface MockCreateBoardInput {
  readonly name: string;
  readonly metric: BoardMetric;
  readonly windowLabel: string;
  readonly metricLabel: string;
  readonly clientIds: readonly string[];
}

/** Mirrors POST /coach/community/boards. Starts empty, by design. */
export function mockCreateBoard(input: MockCreateBoardInput): void {
  boardState = [
    ...boardState,
    {
      id: `brd-${Date.now()}`,
      name: input.name.trim(),
      coachName: 'Sam Okafor',
      metricLabel: input.metricLabel,
      windowLabel: input.windowLabel,
      optedIn: false,
      myIdentity: 'first',
      stats: [],
      rows: [],
      invitedNotOptedIn: input.clientIds.length,
      facts: [
        { label: 'Metric', value: input.metricLabel.split(' · ')[0] },
        { label: 'Window', value: input.windowLabel },
        { label: 'Visible to', value: `${input.clientIds.length} invited clients` },
        { label: 'Updates', value: 'Hourly' },
      ],
    },
  ];
}
