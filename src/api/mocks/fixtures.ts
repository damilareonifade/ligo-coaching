import type {
  ApiAccessRequest,
  ApiCoachHome,
  ApiNotificationGroup,
  ApiChatMessage,
  ApiCheckIn,
  ApiExerciseFilterOption,
  ApiExercisePreview,
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
  ApiClientReview,
  ApiCoachNotification,
  ApiCoachProfile,
  ApiCoachProfileForm,
  ApiLiveExercise,
  ApiLiveSession,
  ApiReviewDomain,
  ApiReviewDomainRow,
  ApiReviewSession,
  RosterAccess,
  ApiClientProgress,
  ApiClientSession,
  ApiClientToday,
  ApiExerciseOption,
  ApiFoodDay,
  ApiFoodResult,
  ApiIntegration,
  ApiMonthlyCheckIns,
  ApiNotificationSettings,
  ApiProgramBlock,
  ApiProgramDetail,
  ApiProgramSummary,
  ApiRoster,
  ApiRosterClient,
  ApiRosterLabel,
  ApiRoutineInstance,
  ApiWeeklyProgress,
  ApiSettingsGroup,
  ApiSharePermissionsDetail,
  ApiSessionExercise,
  ApiSessionSet,
  ApiTrainOverview,
  RosterAttention,
  ShareDomain,
} from '@/api/types';
import { markNotificationRead } from '@/lib/notifications';
import { coachHeadline, toggleNotification } from '@/lib/coachProfile';
import {
  communityRowValue,
  deriveBoardStats,
  ordinal,
  resolveDisplayName,
  withRanks,
} from '@/lib/community';
import { initials } from '@/lib/format';
import { appendOwnMessage, filterInbox, withLatestPreview } from '@/lib/messages';
import {
  assignedLabel,
  filterExerciseOptions,
  parseScheme,
  type ExerciseFilter,
} from '@/lib/programs';
import { hasFeature } from '@/lib/features';
import { countThisWeek, summariseRoutines } from '@/lib/rotation';
import { accessRequestBody, accessRequestTitle } from '@/lib/sharing';
import { accessLabel, withLabelCounts } from '@/lib/roster';
import { useAuthStore } from '@/store/authStore';


/* ------------------------------------------------------------------ *
 * Client-side training fixtures. Copy is verbatim from the "Ligo
 * Client App" design canvas — do not paraphrase it here.
 * ------------------------------------------------------------------ */

const clientTodayBase: ApiClientToday = {
  plan: {
    id: 'plan-upper-a',
    title: 'Upper A · Push focus',
    meta: '5 exercises · last done 4 days ago',
    source: 'From Sam',
    exerciseCount: 5,
  },
  // Present in the fixture and gated at the read below, so the offline build
  // exercises both shapes: the card with food on, and no card with it off.
  nutrition: {
    calories: { consumed: 1840, target: 2600, unit: 'kcal' },
    protein: { consumed: 126, target: 185, unit: 'g' },
  },
  coach: {
    id: 'coach-sam',
    name: 'Sam Okafor',
    initials: 'SO',
    line1: 'Sam Okafor',
    line2: 'Sees workouts and nutrition',
    permissionLabel: 'Partial access',
  },
  week: { done: 0, target: 4 },
};

/**
 * Held in a variable rather than exported as a const because detaching a coach
 * has to actually take effect: `mockDetachCoach` sets `coach` to null here and
 * the Today screen's coach card is gone on the next read. Training alone is a
 * state the app already models, so detaching returns the client to it rather
 * than to a special "detached" mode.
 */
let clientTodayState: ApiClientToday = clientTodayBase;

export function mockClientToday(): ApiClientToday {
  return {
    ...clientTodayState,
    // The week is counted, not stored: it has to agree with the Train tab and
    // with what the coach sees, and three copies of a count will not.
    week: mockWeeklyProgress(MOCK_CLIENT_ID),
    // The offline build honours the flag too, so a screenshot taken with food
    // off is the screen a person with food off actually gets.
    nutrition: hasFeature('food') ? clientTodayState.nutrition : null,
  };
}

/**
 * The routines list, mutable because the client can now add to it. A coach's
 * routine sits in the same list as one the client built — the `owner` field is
 * what separates "run this" from "run or rewrite this".
 */
/**
 * Instances the coach has assigned to this client. Seeded rather than derived
 * so the Train tab reads exactly as it did before instances existed — the
 * store is the new thing, not the data on screen.
 *
 * `templateId` points at a real program in `initialProgramDetails`, so a
 * publish has something to propose against once that work lands.
 */
/** The signed-in client in the mocks — instances are held per person. */
const MOCK_CLIENT_ID = 'client-maya';

/** Whose name appears on a routine the fixtures say came from a coach. */
const MOCK_COACH_NAME = 'Sam';

const routineInstanceStore = new Map<string, ApiRoutineInstance>([
  [
    'rou-1',
    {
      id: 'rou-1',
      templateId: 'pg-upper-lower',
      clientId: MOCK_CLIENT_ID,
      orderIndex: 0,
      lastCompletedAt: null,
      name: 'Upper/Lower 4×',
      note: 'Four days a week. Week 6 of 12 — two more at this volume, then a deload.',
      baseVersion: 1,
      diverged: false,
      pendingUpdate: null,
      blocks: [
        { id: 'blk-ul-a1', name: 'Bench press', scheme: '4 × 8', rpe: 'RPE 8', targetKg: 82.5, note: 'pause 1s on chest' },
        { id: 'blk-ul-a2', name: 'Incline DB press', scheme: '3 × 10', rpe: '', targetKg: 30, note: null },
        { id: 'blk-ul-a3', name: 'Cable fly', scheme: '3 × 12', rpe: '', targetKg: 12.5, note: null },
      ],
    },
  ],
  [
    'rou-4',
    {
      id: 'rou-4',
      templateId: 'pg-return',
      clientId: MOCK_CLIENT_ID,
      orderIndex: 1,
      lastCompletedAt: null,
      name: 'Deload week',
      note: 'One easy week. Keep the bar moving, leave three reps in the tank.',
      baseVersion: 1,
      diverged: false,
      pendingUpdate: null,
      blocks: [
        { id: 'blk-dl-1', name: 'Back squat', scheme: '3 × 5', rpe: '', targetKg: 60, note: null },
        { id: 'blk-dl-2', name: 'Bench press', scheme: '3 × 5', rpe: '', targetKg: 60, note: null },
      ],
    },
  ],
]);

export function mockRoutineInstances(): readonly ApiRoutineInstance[] {
  // Stamped from the log on the way out: stored and derived copies of "when
  // was this last done" would eventually disagree.
  return [...routineInstanceStore.values()].map((instance) => ({
    ...instance,
    lastCompletedAt: lastCompletedFor(instance.id),
  }));
}

export function mockRoutineInstance(instanceId: string): ApiRoutineInstance | null {
  const instance = routineInstanceStore.get(instanceId);
  return instance ? { ...instance, lastCompletedAt: lastCompletedFor(instance.id) } : null;
}

/**
 * The copies one client holds, for the coach's view of them.
 *
 * Everything in the mocks belongs to the one seeded client, so an unknown id
 * would return nothing and read as a bug rather than an empty roster — this
 * falls back to that client instead.
 */
export function mockRoutinesForClient(clientId: string): readonly ApiRoutineInstance[] {
  const wanted = routineInstanceStore.size > 0 ? clientId : '';
  const held = [...routineInstanceStore.values()].filter(
    (instance) => instance.clientId === wanted,
  );
  return held.length > 0
    ? held
    : [...routineInstanceStore.values()].filter(
        (instance) => instance.clientId === MOCK_CLIENT_ID,
      );
}

/**
 * Mirrors POST /coach/programs/:id/assign — one instance per client per day.
 *
 * The copy is the whole point: nothing here points back at the template
 * except `templateId`, so a later edit on either side moves only this row.
 * A multi-day program yields one instance per day, because an instance is a
 * single session — the same rule `BuilderKind` already states.
 */
export function mockAssignProgram(
  programId: string,
  clientIds: readonly string[],
): readonly ApiRoutineInstance[] {
  const template = mockProgramDetail(programId);
  if (!template) return [];

  const created: ApiRoutineInstance[] = [];

  for (const clientId of clientIds) {
    for (const routine of template.routines) {
      const id = `rou-${programId}-${routine.id}-${clientId}`;
      const instance: ApiRoutineInstance = {
        id,
        templateId: template.id,
        clientId,
        // Position in the cycle — ordering only, never a day of the week.
        orderIndex: template.routines.indexOf(routine),
        lastCompletedAt: null,
        name: template.routines.length > 1 ? `${template.name} · ${routine.name}` : template.name,
        note: template.note,
        // Copied, not shared: editing one must never reach another.
        blocks: routine.blocks.map((block) => ({ ...block })),
        baseVersion: 1,
        diverged: false,
        pendingUpdate: null,
      };
      routineInstanceStore.set(id, instance);
      created.push(instance);
    }
  }

  return created;
}

/**
 * The client's own routines — instances with nothing behind them. They live in
 * the same store as the copies of a coach's, because that is what they are:
 * one model, so one editor and one set of endpoints serve both.
 */
const ownRoutineSeeds: readonly ApiRoutineInstance[] = [
  {
    id: 'rou-2',
    templateId: null,
    clientId: MOCK_CLIENT_ID,
    orderIndex: 0,
    lastCompletedAt: null,
    name: 'Push Pull Legs',
    note: 'Push day. Start light if the shoulder is talking.',
    baseVersion: null,
    diverged: false,
    pendingUpdate: null,
    blocks: [
      { id: 'blk-ppl-1', name: 'Bench press', scheme: '4 × 8', rpe: 'RPE 8', targetKg: 62.5, note: null },
      { id: 'blk-ppl-2', name: 'Overhead press', scheme: '3 × 10', rpe: '', targetKg: 40, note: null },
      { id: 'blk-ppl-3', name: 'Triceps pushdown', scheme: '3 × 12', rpe: '', targetKg: null, note: null },
    ],
  },
  {
    id: 'rou-3',
    templateId: null,
    clientId: MOCK_CLIENT_ID,
    orderIndex: 1,
    lastCompletedAt: null,
    name: 'Full body 3×',
    note: null,
    baseVersion: null,
    diverged: false,
    pendingUpdate: null,
    blocks: [
      { id: 'blk-fb-1', name: 'Back squat', scheme: '5 × 5', rpe: 'RPE 7', note: null },
      { id: 'blk-fb-2', name: 'Bench press', scheme: '5 × 5', rpe: '', note: null },
      { id: 'blk-fb-3', name: 'Barbell row', scheme: '5 × 5', rpe: '', note: null },
    ],
  },
];

for (const seed of ownRoutineSeeds) {
  routineInstanceStore.set(seed.id, seed);
}

/** Mirrors POST/PATCH /client/routines — an id means an edit. */
export function mockSaveRoutineInstance(instance: ApiRoutineInstance): void {
  routineInstanceStore.set(instance.id, instance);
}

/**
 * Mirrors DELETE /coach/programs/:id/assign — takes the copies back.
 *
 * Unlike a client removing their own, this destroys work they may have done
 * on it, which is why the screen that calls it asks first.
 */
export function mockUnassignProgram(
  programId: string,
  clientIds: readonly string[],
): number {
  let removed = 0;

  for (const [id, instance] of routineInstanceStore) {
    if (instance.templateId !== programId) continue;
    if (!clientIds.includes(instance.clientId)) continue;
    routineInstanceStore.delete(id);
    removed += 1;
  }

  return removed;
}

/** The clients currently holding a copy of this template. */
export function mockProgramHolders(programId: string): readonly string[] {
  return [
    ...new Set(
      [...routineInstanceStore.values()]
        .filter((instance) => instance.templateId === programId)
        .map((instance) => instance.clientId),
    ),
  ];
}

/** Who holds a template, and how many of them have changed their copy. */
export interface MockPublishImpact {
  readonly holders: number;
  readonly changed: number;
}

export function mockPublishImpact(templateId: string): MockPublishImpact {
  const held = [...routineInstanceStore.values()].filter(
    (instance) => instance.templateId === templateId,
  );

  return { holders: held.length, changed: held.filter((instance) => instance.diverged).length };
}

/** "Bench press, Cable fly" — the lifts whose prescription moved. */
function changeSummary(
  before: readonly ApiProgramBlock[],
  after: readonly ApiProgramBlock[],
): string {
  const names = after
    .filter((block) => {
      const old = before.find((candidate) => candidate.name === block.name);
      return !old || old.scheme !== block.scheme || (old.targetKg ?? null) !== (block.targetKg ?? null);
    })
    .map((block) => block.name);

  const added = after.length - before.length;
  if (names.length === 0) return added > 0 ? `${added} exercise(s) added` : 'Small changes';
  return names.slice(0, 3).join(', ');
}

/**
 * Mirrors POST /coach/programs/:id/publish.
 *
 * A publish proposes; it never overwrites. Every holder gets a pending update
 * on their own copy and decides for themselves — including holders who have
 * changed nothing, because a copy that still matches is still theirs.
 */
export function mockProposeUpdate(templateId: string): number {
  const template = mockProgramDetail(templateId);
  if (!template) return 0;

  const proposedAt = new Date().toISOString();
  let proposed = 0;

  for (const [id, instance] of routineInstanceStore) {
    if (instance.templateId !== templateId) continue;

    // A multi-day program gives each instance its own day; match on the day
    // whose blocks this copy came from, falling back to the first.
    const routine =
      template.routines.find((candidate) => instance.id.includes(candidate.id)) ??
      template.routines[0];
    if (!routine) continue;

    routineInstanceStore.set(id, {
      ...instance,
      pendingUpdate: {
        templateVersion: (instance.baseVersion ?? 0) + 1,
        proposedAt,
        summary: changeSummary(instance.blocks, routine.blocks),
        blocks: routine.blocks.map((block) => ({ ...block })),
      },
    });
    proposed += 1;
  }

  return proposed;
}

/** The client took it: the copy becomes the proposal, and matches again. */
export function mockAcceptUpdate(instanceId: string): void {
  const instance = routineInstanceStore.get(instanceId);
  if (!instance?.pendingUpdate) return;

  routineInstanceStore.set(instanceId, {
    ...instance,
    blocks: instance.pendingUpdate.blocks,
    baseVersion: instance.pendingUpdate.templateVersion,
    diverged: false,
    pendingUpdate: null,
  });
}

/**
 * The client kept theirs. The copy is untouched and stays behind the template
 * — declining is a decision, not a deferral, so nothing lingers.
 */
export function mockDeclineUpdate(instanceId: string): void {
  const instance = routineInstanceStore.get(instanceId);
  if (!instance?.pendingUpdate) return;

  routineInstanceStore.set(instanceId, { ...instance, pendingUpdate: null, diverged: true });
}

export function mockDeleteRoutineInstance(instanceId: string): void {
  routineInstanceStore.delete(instanceId);
}

/**
 * Mirrors DELETE /client/routines. The client's own only — a copy of the
 * coach's is still the coach's routine, and removing it is a different act
 * with different consequences.
 */
export function mockDeleteOwnRoutines(): void {
  for (const [id, instance] of routineInstanceStore) {
    if (instance.templateId === null) routineInstanceStore.delete(id);
  }
}

/**
 * A function rather than a constant now: the routines list changes while the
 * app runs, and a frozen object would hand back yesterday's list after a save.
 */
export function mockTrainOverview(): ApiTrainOverview {
  const held = mockRoutineInstances().filter(
    (instance) => instance.clientId === MOCK_CLIENT_ID,
  );
  return {
    routines: summariseRoutines(held, () => MOCK_COACH_NAME),
    week: mockWeeklyProgress(MOCK_CLIENT_ID),
  };
}

/**
 * The mock "server" keeps its sessions, so a logged set survives the
 * invalidate-and-refetch that follows an optimistic update. Without this,
 * every refetch would hand back a pristine session and un-tick the set.
 */
const mockSessionStore = new Map<string, ApiClientSession>();

/**
 * An empty workout is a session with no plan behind it. The emptiness rides in
 * the id because this store is in-memory: after a reload the session is rebuilt
 * from its id alone, and a quick workout must not come back as someone's push
 * day. The real endpoint carries `planId: null` instead and needs no such trick.
 */
const EMPTY_SESSION_PREFIX = 'ses-empty';

/** `ses-rou-3-1757…` — the routine a session came from, kept for the same reason. */
const ROUTINE_SESSION_RE = /^ses-(rou-[A-Za-z0-9]+)-\d+$/;

/**
 * What a workout was started from, encoded in its id. The real endpoint takes
 * `planId` in the request body and needs none of this.
 */
export function mockStartSessionId(planId: string | null): string {
  if (planId === null) return `${EMPTY_SESSION_PREFIX}-${Date.now()}`;
  return `ses-${planId}-${Date.now()}`;
}

/**
 * Sets from a routine block: "4 × 8" becomes four sets of eight, loaded at the
 * block's target weight. A block with no target opens at zero for the lifter
 * to fill in — which is also the right answer for a bodyweight movement.
 */
function setsFromBlock(block: ApiProgramBlock): readonly ApiSessionSet[] {
  const { sets, reps } = parseScheme(block.scheme);

  return Array.from({ length: sets }, (_unused, index) => ({
    n: index + 1,
    weightKg: block.targetKg ?? 0,
    reps,
    completed: false,
  }));
}

function buildRoutineSession(
  sessionId: string,
  routine: ApiRoutineInstance,
): ApiClientSession {
  return {
    id: sessionId,
    title: routine.name,
    startedAt: new Date().toISOString(),
    exercises: routine.blocks.map((block) => ({
      id: block.id,
      name: block.name,
      // A routine is the client's own, so any cue on it is theirs.
      coachNote: null,
      ownNote: block.note,
      sets: setsFromBlock(block),
    })),
  };
}

function buildClientSession(sessionId: string): ApiClientSession {
  if (sessionId.startsWith(EMPTY_SESSION_PREFIX)) {
    return {
      id: sessionId,
      title: 'Quick workout',
      startedAt: new Date().toISOString(),
      exercises: [],
    };
  }

  const routineId = ROUTINE_SESSION_RE.exec(sessionId)?.[1];
  const routine = routineId ? routineInstanceStore.get(routineId) : undefined;
  if (routine) return buildRoutineSession(sessionId, routine);

  return {
    id: sessionId,
    title: 'Upper A',
    startedAt: new Date().toISOString(),
    exercises: [
      {
        id: 'cex-bench',
        name: 'Bench press',
        coachNote: 'pause 1s on chest',
        ownNote: null,
        sets: [
          { n: 1, weightKg: 82.5, reps: 8, completed: true },
          { n: 2, weightKg: 82.5, reps: 8, completed: true },
          { n: 3, weightKg: 82.5, reps: 6, completed: false },
        ],
      },
      {
        id: 'cex-incline',
        name: 'Incline dumbbell press',
        coachNote: null,
        ownNote: 'elbows tucked',
        sets: [
          { n: 1, weightKg: 30, reps: 10, completed: false },
          { n: 2, weightKg: 30, reps: 10, completed: false },
        ],
      },
      {
        id: 'cex-fly',
        name: 'Cable lateral raise',
        coachNote: null,
        ownNote: null,
        sets: [
          { n: 1, weightKg: 12.5, reps: 15, completed: false },
          { n: 2, weightKg: 12.5, reps: 15, completed: false },
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

/**
 * Mirrors POST /client/sessions/:id/sets against the in-memory session. An
 * upsert, because writing set 3 and adding a set 4 are the same request.
 */
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
        ? {
            ...exercise,
            sets: exercise.sets.some((s) => s.n === set.n)
              ? exercise.sets.map((s) => (s.n === set.n ? set : s))
              : [...exercise.sets, set],
          }
        : exercise,
    ),
  });
}

/** Mirrors PATCH /client/sessions/:id. */
export function mockRenameClientSession(sessionId: string, title: string): void {
  const session = mockClientSession(sessionId);
  mockSessionStore.set(sessionId, { ...session, title });
}

/** Mirrors PATCH /client/sessions/:id/exercises/:exerciseId — own note only. */
export function mockSetExerciseNote(
  sessionId: string,
  exerciseId: string,
  note: string | null,
): void {
  const session = mockClientSession(sessionId);
  mockSessionStore.set(sessionId, {
    ...session,
    exercises: session.exercises.map((exercise) =>
      exercise.id === exerciseId ? { ...exercise, ownNote: note } : exercise,
    ),
  });
}

/** Mirrors POST /client/sessions/:id/exercises. */
export function mockAddSessionExercise(
  sessionId: string,
  exercise: ApiSessionExercise,
): void {
  const session = mockClientSession(sessionId);
  mockSessionStore.set(sessionId, {
    ...session,
    exercises: [...session.exercises, exercise],
  });
}

/**
 * Every finished workout, newest last. One source for both the rotation's
 * ordering and the weekly count — two derived numbers that must never
 * disagree about what happened.
 */
const completionLog: { instanceId: string; clientId: string; at: string }[] = [];

/** How much this client has trained this week, against their program's target. */
export function mockWeeklyProgress(clientId: string): ApiWeeklyProgress {
  const held = mockRoutinesForClient(clientId);
  const template = held.find((instance) => instance.templateId !== null)?.templateId ?? '';

  return {
    done: countThisWeek(mockCompletionsFor(clientId)),
    target: mockProgramDetail(template)?.sessionsPerWeek ?? DEFAULT_WEEKLY_TARGET,
  };
}

/** What a client with no assigned program is measured against. */
const DEFAULT_WEEKLY_TARGET = 3;

export function mockCompletionsFor(clientId: string): readonly string[] {
  return completionLog.filter((entry) => entry.clientId === clientId).map((entry) => entry.at);
}

function lastCompletedFor(instanceId: string): string | null {
  const entries = completionLog.filter((entry) => entry.instanceId === instanceId);
  return entries.length > 0 ? entries[entries.length - 1].at : null;
}

/** Mirrors POST /client/sessions/:id/finish — the session is no longer live. */
export function mockFinishClientSession(sessionId: string): void {
  const routineId = ROUTINE_SESSION_RE.exec(sessionId)?.[1];
  const instance = routineId ? routineInstanceStore.get(routineId) : undefined;

  // The only thing that moves the rotation on. A workout nobody finished has
  // not been done, so it does not count and does not advance anything.
  if (instance) {
    completionLog.push({
      instanceId: instance.id,
      clientId: instance.clientId,
      at: new Date().toISOString(),
    });
  }

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

const clientProgressBase: ApiClientProgress = {
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
  // Overwritten from `clientTodayState` in `mockClientProfile` so a detach
  // reaches both screens at once; there is only ever one attachment.
  coach: clientTodayBase.coach,
  coachRows: [
    {
      id: 'permissions',
      label: 'Permissions',
      desc: 'What Sam can see and log',
      value: '3 of 5',
      route: '/profile/permissions',
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
        // Notifications and Integrations sit behind their flags in
        // `buildProfileGroups`; the fixture follows, so a mocked run shows the
        // same profile a live one does.
        ...(hasFeature('notifications')
          ? [
              {
                id: 'notifications',
                label: 'Notification settings',
                desc: 'What buzzes and when',
                route: '/profile/notifications',
              },
            ]
          : []),
        ...(hasFeature('integrations')
          ? [
              {
                id: 'integrations',
                label: 'Integrations',
                desc: 'Connected apps and devices',
                value: '3 connected',
                route: '/profile/integrations',
              },
            ]
          : []),
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

  // The coach comes off the one attachment, not off this fixture, so detaching
  // empties the section here and on Today together. With no coach the rows go
  // too: permissions, check-in sharing and "detach" are all about somebody, and
  // there is nobody to point them at.
  const coach = clientTodayState.coach;

  return {
    ...mockClientProfileBase,
    coach,
    coachRows: coach ? mockClientProfileBase.coachRows : [],
    groups,
  };
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

/** Mirrors an entry being added. Offline, the section list is the same. */
export function mockAddHealthEntry(
  section: string,
  label: string,
  value: string,
  status: string | null,
): void {
  healthState = {
    ...healthState,
    sections: healthState.sections.map((entry) =>
      entry.id === section
        ? {
            ...entry,
            rows: [
              ...entry.rows,
              { id: `he-${Date.now()}`, label, value, chip: status ?? undefined },
            ],
          }
        : entry,
    ),
  };
}

/** Removing one removes it — the health profile is not an archive. */
export function mockRemoveHealthEntry(entryId: string): void {
  healthState = {
    ...healthState,
    sections: healthState.sections.map((entry) => ({
      ...entry,
      rows: entry.rows.filter((row) => row.id !== entryId),
    })),
  };
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
 * Access requests, offline.
 *
 * Two of them waiting, because one is a happy path and two is what the
 * screen actually has to lay out. They are the domains Maya has not
 * shared — asking for something already granted is refused server-side,
 * so a fixture that did it would be teaching the wrong shape.
 * ------------------------------------------------------------------ */

let accessRequestState: readonly ApiAccessRequest[] = [
  {
    id: 'req-health',
    coachName: 'Sam',
    domain: 'health',
    title: accessRequestTitle('Sam', 'health'),
    body: accessRequestBody('health'),
    when: '2h',
  },
  {
    id: 'req-monthly',
    coachName: 'Sam',
    domain: 'monthly',
    title: accessRequestTitle('Sam', 'monthly'),
    body: accessRequestBody('monthly'),
    when: '3d',
  },
];

/**
 * Mirrors regenerate_invite_code. The prefix survives a roll — it is the
 * coach's name, not part of the secret — so the code still reads as theirs.
 */
export function mockRegenerateInviteCode(): string {
  const chars = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let suffix = '';
  for (let index = 0; index < 4; index += 1) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${INVITE_CODE.split('-')[0]}-${suffix}`;
}

/* ------------------------------------------------------------------ *
 * Onboarding answers, offline. Kept in module state so a test or a
 * mocked run can read back what the flow saved, which is the whole
 * thing that was missing: the real flow discarded all of it.
 * ------------------------------------------------------------------ */

let coachProfileState: { gym: string; bio: string; specialties: readonly string[] } | null = null;
let clientProfileState: {
  goals: readonly string[];
  experience: string;
  sessionsPerWeek: number;
} | null = null;

export function mockSaveCoachProfile(input: {
  gym: string;
  bio: string;
  specialties: readonly string[];
}): void {
  coachProfileState = { ...input };
}

/**
 * What the editor opens on. Falls back to the fixture coach rather than an
 * empty form, so a mocked run shows a filled profile the first time — the
 * screen is about changing something that exists.
 */
export function mockCoachProfileForm(): ApiCoachProfileForm {
  return {
    name: 'Sam Okafor',
    gym: coachProfileState?.gym ?? 'Ironworks Berlin',
    bio: coachProfileState?.bio ?? 'Barbell strength, ten years on the floor.',
    specialties: coachProfileState?.specialties ?? ['Strength', 'Hypertrophy'],
  };
}

export function mockSaveClientProfile(input: {
  goals: readonly string[];
  experience: string;
  sessionsPerWeek: number;
}): void {
  clientProfileState = { ...input };
}

export function mockCoachProfileAnswers(): typeof coachProfileState {
  return coachProfileState;
}

export function mockClientProfileAnswers(): typeof clientProfileState {
  return clientProfileState;
}

/**
 * Progress, offline. The weight series is mutable so logging one from the card
 * actually moves the chart — the whole point of adding that action was that
 * the card could otherwise never have anything in it.
 */
let loggedWeights: readonly number[] = [];

export function mockClientProgress(): ApiClientProgress {
  if (loggedWeights.length === 0) return clientProgressBase;

  const series = [
    ...clientProgressBase.bodyWeightSeries,
    ...loggedWeights.map((kg) => ({ label: '', kg })),
  ];

  return {
    ...clientProgressBase,
    bodyWeightKg: series[series.length - 1].kg,
    bodyWeightSeries: series,
  };
}

export function mockLogBodyWeight(kg: number): void {
  loggedWeights = [...loggedWeights, kg];
}

/** Mirrors the coach changing a set the client has not reached yet. */
export function mockAdjustLiveSet(setId: string, weightKg: number, reps: number): void {
  liveAdjustments = { ...liveAdjustments, [setId]: { weightKg, reps } };
}

let liveAdjustments: Record<string, { weightKg: number; reps: number }> = {};

/**
 * The coach's home, offline. Built from the roster fixture so the two agree:
 * whoever is `live` there is training here, and the exceptions are the same
 * exceptions.
 */
export function mockCoachHome(): ApiCoachHome {
  const clients = rosterState.clients;

  return {
    training: clients
      .filter((client) => client.attention === 'live')
      .map((client) => ({
        clientId: client.id,
        name: client.name,
        initials: client.initials,
        meta: 'Upper A · 24 min in',
        progress: '6 of 14 sets',
      })),
    needsALook: clients.filter(
      (client) => client.attention === 'review' || client.attention === 'quiet',
    ),
    rosterCount: clients.length,
  };
}

export function mockAccessRequests(): readonly ApiAccessRequest[] {
  return accessRequestState;
}

/** Either answer removes the card; granting is the only one that shares. */
export function mockAnswerAccessRequest(requestId: string, grant: boolean): void {
  const request = accessRequestState.find((entry) => entry.id === requestId);
  accessRequestState = accessRequestState.filter((entry) => entry.id !== requestId);
  if (request && grant) mockSetSharePermission(request.domain, true);
}

/**
 * What the coach may see and do, offline. Held as real state rather than
 * derived, because the Permissions screen is six switches reading it back —
 * a mock that always answers the same thing would make every toggle look
 * broken.
 */
let sharePermissionsState: ApiSharePermissionsDetail = {
  coachName: 'Sam Okafor',
  permissions: {
    workouts: true,
    nutrition: true,
    metrics: false,
    health: false,
    monthly: true,
  },
  logFor: false,
};

export function mockSharePermissions(): ApiSharePermissionsDetail {
  return sharePermissionsState;
}

export function mockSetLogFor(allowed: boolean): void {
  sharePermissionsState = { ...sharePermissionsState, logFor: allowed };
}

/**
 * Mirrors set_coach_permission: the switch, and the open question it answers.
 * Turning something off closes the ask too — a coach left waiting on a
 * question the client has already answered with the switch would ask again.
 */
export function mockSetSharePermission(domain: ShareDomain, shared: boolean): void {
  accessRequestState = accessRequestState.filter((entry) => entry.domain !== domain);
  sharePermissionsState = {
    ...sharePermissionsState,
    permissions: { ...sharePermissionsState.permissions, [domain]: shared },
  };

  const coach = clientTodayState.coach;
  if (coach) {
    clientTodayState = {
      ...clientTodayState,
      coach: { ...coach, permissionLabel: shared ? 'Shared' : coach.permissionLabel },
    };
  }
}

/**
 * Mirrors DELETE /client/coach — the client's side of the relationship, ended.
 *
 * Three things move and one deliberately does not. The attachment goes, which
 * takes the coach card off Today and the coach section off the profile. The
 * thread archives rather than deleting: the history was the client's half of a
 * conversation and stays readable, but the composer is gone. And nothing else
 * is touched — no session, meal, measurement or photo — because "you keep
 * everything" is the sentence on the sheet, and this is where it either holds
 * or quietly does not.
 */
export function mockDetachCoach(): void {
  clientTodayState = { ...clientTodayState, coach: null };
  chatState = { ...chatState, archived: true };

  // "The thread closes" has to be true from both seats, or the coach goes on
  // typing into a conversation the client has already ended. Maya is the
  // client this app is signed in as and `rc-maya` is her row on the roster —
  // one relationship, two views of it.
  threadState = threadState.map((thread) =>
    thread.clientId === 'rc-maya' ? { ...thread, archived: true } : thread,
  );

  // The check-in toggle is named after a coach; with none attached it has
  // nobody to point at, and an empty `coachName` is how that is already
  // modelled (see `ApiMonthlyCheckIns`).
  checkInState = { ...checkInState, coachName: '', coachCanEdit: false };
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
  return { clients, labels: withLabelCounts(labels, clients) };
}

let rosterState: ApiRoster = composeRoster(rosterClients, initialLabels);


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

/**
 * Mirrors PUT /coach/roster/clients/:id/label. Filing is written to the roster
 * itself rather than to a review-shaped copy, so the chip the coach taps on the
 * review and the group the row sits in back on the roster cannot disagree.
 */
export function mockSetClientLabel(clientId: string, labelId: string | null): void {
  rosterState = composeRoster(
    rosterState.clients.map((client) =>
      client.id === clientId ? { ...client, labelId } : client,
    ),
    rosterState.labels,
  );
}

/* ------------------------------------------------------------------ *
 * The coach's review of one client.
 *
 * Maya's review is authored, verbatim from the design. Everyone else's
 * is derived from their roster row — and specifically from `access`,
 * which is the client's own setting mirrored back. Deriving it there
 * rather than authoring seventeen reviews means there is no second
 * place where a client's sharing is written down, and so no second
 * place for it to be written down wrongly.
 *
 * `rows` are attached only to granted domains. Not hidden on a
 * granted flag, not blanked by a component — simply not built. The
 * payload for an ungranted domain has nowhere to put a number.
 * ------------------------------------------------------------------ */

/** Domains the coach has asked about, per client. Asking is not access. */
const accessRequests = new Map<string, ReadonlySet<ApiReviewDomain['id']>>();

const MAYA_DOMAINS: readonly ApiReviewDomain[] = [
  {
    id: 'nutrition',
    title: 'Nutrition',
    access: 'granted',
    rows: [
      { label: 'Today', value: '1,840 / 2,600 kcal' },
      { label: 'Protein', value: '126 / 185 g' },
      { label: '7-day average', value: '2,180 kcal' },
    ],
    note: 'Maya shares nutrition. This can be withdrawn at any time.',
  },
  {
    id: 'metrics',
    title: 'Metrics',
    access: 'granted',
    rows: [
      { label: 'Body weight', value: '82.4 kg' },
      { label: 'Waist', value: '78 cm' },
      { label: 'Trend', value: '−1.8 kg since June' },
    ],
    note: 'Shared with you. Photos are not included.',
  },
  {
    id: 'health',
    title: 'Health profile',
    access: 'not-granted',
    rows: [],
    note: 'Maya has not shared a health profile. You will not see injuries, conditions or medication unless they do.',
  },
  {
    id: 'monthly',
    title: 'Monthly check-ins',
    access: 'not-granted',
    rows: [],
    note: 'Check-ins are their own permission, and include logging on their behalf.',
  },
];

const MAYA_SESSIONS: readonly ApiReviewSession[] = [
  { id: 'rs-upper-a', name: 'Upper A', meta: '7 of 7 sets · 48 min · 1 PR', tag: 'Done' },
  { id: 'rs-lower-a', name: 'Lower A', meta: '6 of 6 sets · 52 min', tag: 'Done' },
  { id: 'rs-upper-b', name: 'Upper B', meta: 'Planned today', tag: 'Today' },
];

/** Eight weeks, trending up — the shape the design shows for Maya. */
const MAYA_BARS: readonly { label: string; value: number }[] = [
  { label: 'W1', value: 71 },
  { label: 'W2', value: 78 },
  { label: 'W3', value: 74 },
  { label: 'W4', value: 83 },
  { label: 'W5', value: 86 },
  { label: 'W6', value: 84 },
  { label: 'W7', value: 91 },
  { label: 'W8', value: 92 },
];

/**
 * What each level of `access` actually grants, domain by domain. The client
 * set one word on their own screen; this is the only place that word is turned
 * into four answers, so widening one of them is a visible edit here rather
 * than a quiet default somewhere downstream.
 */
const GRANTS: Record<RosterAccess, readonly ApiReviewDomain['id'][]> = {
  full: ['nutrition', 'metrics', 'health', 'monthly'],
  partial: ['nutrition', 'metrics'],
  min: ['metrics'],
  none: [],
};

const DOMAIN_TITLES: Record<ApiReviewDomain['id'], string> = {
  nutrition: 'Nutrition',
  metrics: 'Metrics',
  health: 'Health profile',
  monthly: 'Monthly check-ins',
};

function grantedNote(id: ApiReviewDomain['id'], name: string): string {
  switch (id) {
    case 'nutrition':
      return `${name} shares nutrition. This can be withdrawn at any time.`;
    case 'metrics':
      return 'Shared with you. Photos are not included.';
    case 'health':
      return 'Shared with you, including injuries, conditions and medication.';
    case 'monthly':
    default:
      return 'Shared with you. This permission includes logging on their behalf.';
  }
}

function withheldNote(id: ApiReviewDomain['id'], name: string): string {
  switch (id) {
    case 'nutrition':
      return `${name} has not shared nutrition. You will not see meals or targets unless they do.`;
    case 'metrics':
      return `${name} has not shared metrics. Body weight and measurements stay private.`;
    case 'health':
      return `${name} has not shared a health profile. You will not see injuries, conditions or medication unless they do.`;
    case 'monthly':
    default:
      return 'Check-ins are their own permission, and include logging on their behalf.';
  }
}

/**
 * Derived rows for a granted domain. Deterministic from the client id, exactly
 * as `mockStudentFromRoster` derives adherence — two clients should not read as
 * twins, and a refetch should not shuffle the numbers under the coach.
 */
function derivedRows(
  id: ApiReviewDomain['id'],
  seed: number,
): readonly ApiReviewDomainRow[] {
  switch (id) {
    case 'nutrition':
      return [
        { label: 'Today', value: `${1_600 + (seed % 9) * 60} / ${2_200 + (seed % 5) * 100} kcal` },
        { label: 'Protein', value: `${110 + (seed % 7) * 5} / ${160 + (seed % 4) * 10} g` },
        { label: '7-day average', value: `${2_000 + (seed % 6) * 50} kcal` },
      ];
    case 'metrics':
      return [
        { label: 'Body weight', value: `${68 + (seed % 22)}.${seed % 10} kg` },
        { label: 'Waist', value: `${74 + (seed % 12)} cm` },
        { label: 'Trend', value: `−${1 + (seed % 3)}.${seed % 10} kg since June` },
      ];
    case 'health':
      return [
        { label: 'Injuries', value: seed % 2 === 0 ? 'None noted' : 'Left shoulder, 2024' },
        { label: 'Conditions', value: 'None noted' },
        { label: 'Medication', value: 'None noted' },
      ];
    case 'monthly':
    default:
      return [
        { label: 'Last check-in', value: `${['May', 'Jun', 'Jul', 'Aug'][seed % 4]} 2026` },
        { label: 'Logged', value: `${2 + (seed % 4)} months` },
        { label: 'You can log', value: 'Yes' },
      ];
  }
}

function reviewDomains(client: ApiRosterClient): readonly ApiReviewDomain[] {
  if (client.id === 'rc-maya') return MAYA_DOMAINS;

  const seed = hashId(client.id);
  const granted = new Set(GRANTS[client.access]);
  const name = client.name.split(' ')[0] ?? client.name;

  return (['nutrition', 'metrics', 'health', 'monthly'] as const).map((id) => {
    if (granted.has(id)) {
      return {
        id,
        title: DOMAIN_TITLES[id],
        access: 'granted' as const,
        rows: derivedRows(id, seed),
        note: grantedNote(id, name),
      };
    }

    return {
      id,
      title: DOMAIN_TITLES[id],
      access: 'not-granted' as const,
      // Nothing to put here. The shape has no room for a value the client
      // did not share, which is the point of building it this way.
      rows: [],
      note: withheldNote(id, name),
    };
  });
}

function reviewSessions(client: ApiRosterClient): readonly ApiReviewSession[] {
  if (client.id === 'rc-maya') return MAYA_SESSIONS;

  const seed = hashId(client.id);
  const program = client.meta.split(' · ')[0] ?? 'Session';
  const missed = client.attention === 'review' || client.attention === 'quiet';

  return [
    {
      id: `rs-${client.id}-1`,
      name: `${program} A`,
      meta: `${5 + (seed % 3)} of ${5 + (seed % 3)} sets · ${44 + (seed % 12)} min`,
      tag: 'Done',
    },
    {
      id: `rs-${client.id}-2`,
      name: `${program} B`,
      meta: missed ? 'Not logged' : `${6 + (seed % 2)} of ${6 + (seed % 2)} sets · ${48 + (seed % 9)} min`,
      tag: missed ? 'Missed' : 'Done',
    },
    {
      id: `rs-${client.id}-3`,
      name: `${program} C`,
      meta: 'Planned today',
      tag: 'Today',
    },
  ];
}

function reviewBars(client: ApiRosterClient): readonly { label: string; value: number }[] {
  if (client.id === 'rc-maya') return MAYA_BARS;

  const seed = hashId(client.id);
  return Array.from({ length: 8 }, (_value, index) => ({
    label: `W${index + 1}`,
    value: 55 + index * 4 + ((seed + index * 7) % 11),
  }));
}

/** The same anchor `mockStudentFromRoster` uses, so the two never disagree. */
const ADHERENCE_BASE: Record<RosterAttention, number> = {
  live: 88,
  ok: 86,
  new: 72,
  review: 61,
  quiet: 48,
};

/** Mirrors GET /coach/clients/:id/review. */
export function mockClientReview(clientId: string): ApiClientReview | null {
  const client = rosterState.clients.find((candidate) => candidate.id === clientId);
  if (!client) return null;

  const isMaya = client.id === 'rc-maya';
  const requested = accessRequests.get(clientId);
  const domains = reviewDomains(client).map((domain) =>
    requested?.has(domain.id) && domain.access === 'not-granted'
      ? { ...domain, access: 'requested' as const }
      : domain,
  );

  const parts = client.meta.split(' · ');
  const week = (parts[1] ?? '').replace('wk ', 'week ');
  const adherence = isMaya
    ? 92
    : Math.min(99, ADHERENCE_BASE[client.attention] + (hashId(client.id) % 9));

  return {
    clientId: client.id,
    name: client.name,
    initials: client.initials,
    programLine: isMaya
      ? 'Upper/Lower · week 6 of 12'
      : [parts[0], week].filter((part) => part.length > 0).join(' · '),
    labelId: client.labelId,
    adherence: `${adherence}% adherence`,
    adherenceBars: reviewBars(client),
    domains,
    sessions: reviewSessions(client),
    // Only one client trains at a time in the mock, and it is the one the
    // roster already flags `live`. Two sources would eventually disagree.
    // The fixtures grant it, so the offline build exercises the path where a
    // coach can open a client's check-ins rather than only the read-only one.
    canLogFor: true,
    isTraining: client.attention === 'live',
  };
}

/**
 * Mirrors POST /coach/clients/:id/access-requests.
 *
 * It records that the coach asked, and that is the whole effect. Nothing about
 * what they can see moves — the domain goes from "not shared" to "requested",
 * which is a note about the coach's own behaviour sitting where a value would
 * be if the client had said yes.
 */
export function mockRequestAccess(clientId: string, domainId: ApiReviewDomain['id']): void {
  const current = accessRequests.get(clientId) ?? new Set<ApiReviewDomain['id']>();
  accessRequests.set(clientId, new Set([...current, domainId]));
}

/* ------------------------------------------------------------------ *
 * The live session, watched from the coach's seat.
 * ------------------------------------------------------------------ */

const mayaLiveExercises: readonly ApiLiveExercise[] = [
  {
    id: 'lex-bench',
    name: 'Bench press',
    note: '4 × 8 · 2 min rest',
    progress: '2 of 4',
    sets: [
      { id: 'ls-1-60', n: 1, weightKg: 60, reps: 8, completed: true, changedByCoach: false },
      { id: 'ls-2-62.5', n: 2, weightKg: 62.5, reps: 8, completed: true, changedByCoach: false },
      { id: 'ls-3-62.5', n: 3, weightKg: 62.5, reps: 8, completed: false, changedByCoach: false },
      { id: 'ls-4-62.5', n: 4, weightKg: 62.5, reps: 8, completed: false, changedByCoach: false },
    ],
  },
  {
    id: 'lex-incline',
    name: 'Incline DB press',
    note: '3 × 10 · 90 s rest',
    progress: '0 of 3',
    sets: [
      { id: 'ls-1-22.5', n: 1, weightKg: 22.5, reps: 10, completed: false, changedByCoach: false },
      { id: 'ls-2-22.5', n: 2, weightKg: 22.5, reps: 10, completed: false, changedByCoach: false },
      { id: 'ls-3-22.5', n: 3, weightKg: 22.5, reps: 10, completed: false, changedByCoach: false },
    ],
  },
  {
    id: 'lex-fly',
    name: 'Cable fly',
    note: '3 × 12 · 60 s rest',
    progress: '0 of 3',
    sets: [
      { id: 'ls-1-15', n: 1, weightKg: 15, reps: 12, completed: false, changedByCoach: false },
      { id: 'ls-2-15', n: 2, weightKg: 15, reps: 12, completed: false, changedByCoach: false },
      { id: 'ls-3-15', n: 3, weightKg: 15, reps: 12, completed: false, changedByCoach: false },
    ],
  },
];

/**
 * Mirrors GET /coach/clients/:id/live. Null for anyone not training, which is
 * the honest answer — the screen has an ended state for exactly this, rather
 * than a stale session left on screen as though it were still running.
 */
export function mockLiveSession(clientId: string): ApiLiveSession | null {
  const client = rosterState.clients.find((candidate) => candidate.id === clientId);
  if (!client || client.attention !== 'live') return null;

  return {
    clientId: client.id,
    clientName: client.name,
    title: 'Upper A · Push focus',
    // Mid-session on every read, so the elapsed clock has something to count.
    startedAt: new Date(Date.now() - 24 * 60_000).toISOString(),
    // Maya's fixture has log_for on, so the offline build exercises the
    // editable path rather than only the read-only one.
    canEdit: true,
    notice:
      'You can change the load and reps on sets Maya has not done yet. Ticking them off stays hers.',
    exercises: mayaLiveExercises.map((exercise) => ({
      ...exercise,
      sets: exercise.sets.map((set) => {
        const adjusted = liveAdjustments[set.id];
        return adjusted ? { ...set, ...adjusted, changedByCoach: true } : set;
      }),
    })),
  };
}

/* ------------------------------------------------------------------ *
 * The coach's own settings.
 * ------------------------------------------------------------------ */

const initialCoachNotifications: readonly ApiCoachNotification[] = [
  {
    id: 'session-completed',
    label: 'Session completed',
    desc: 'When a client finishes a workout',
    enabled: true,
    locked: false,
  },
  {
    id: 'missed-session',
    label: 'Missed session',
    desc: 'When a planned day is missed',
    enabled: true,
    locked: false,
  },
  {
    id: 'new-message',
    label: 'New message',
    desc: 'When a client messages you',
    enabled: true,
    locked: false,
  },
  {
    // The one that cannot be silenced. A coach who muted this could go on
    // acting as though they still had access a client took back this morning.
    id: 'permission-changed',
    label: 'Permission changed',
    desc: 'When a client grants or withdraws access',
    enabled: true,
    locked: true,
  },
  {
    id: 'client-attached',
    label: 'Client attached',
    desc: 'When someone joins with your code',
    enabled: true,
    locked: false,
  },
];

let coachNotificationState: readonly ApiCoachNotification[] = initialCoachNotifications;

/**
 * Mirrors GET /coach/profile. The headline's client count and the Labels row's
 * value are both read off the roster rather than authored here, so neither can
 * go stale behind a label the coach just deleted.
 */
export function mockCoachProfile(): ApiCoachProfile {
  const groups: readonly ApiSettingsGroup[] = [
    {
      id: 'coaching',
      title: 'COACHING',
      rows: [
        {
          id: 'invite-code',
          label: 'Invite code',
          desc: 'Share it to take on a client',
          value: INVITE_CODE,
        },
        {
          id: 'labels',
          label: 'Labels',
          desc: 'Organise your roster',
          value: `${rosterState.labels.length}`,
          route: '/roster/labels',
        },
      ],
    },
    {
      id: 'account',
      title: 'ACCOUNT',
      rows: [
        {
          id: 'profile',
          label: 'Profile',
          desc: 'Gym, bio and specialties — what a client reads before attaching',
          route: '/coach/profile',
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
  ];

  return {
    name: 'Sam Okafor',
    headline: coachHeadline('Strength coach · Berlin', rosterState.clients.length),
    inviteCode: INVITE_CODE,
    notifications: coachNotificationState,
    groups,
  };
}

/**
 * Mirrors POST /coach/notifications. The refusal is the shared predicate, not
 * a check written twice — a locked row that arrives here is left exactly as it
 * was, so a caller that skipped the UI gets the same answer the switch does.
 */
export function mockToggleCoachNotification(id: string, enabled: boolean): void {
  coachNotificationState = toggleNotification(coachNotificationState, id, enabled);
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
    note: 'Upper/Lower split. Four days a week, eight weeks.',
    meta: 'Upper/Lower · 12 weeks · 4 days',
    status: 'draft',
    statusLabel: 'Draft changes',
    assignedIds: ['rc-maya', 'rc-rafa', 'rc-ines', 'rc-kai'],
    assignedLabel: assignedLabel(4),
    weeks: 12,
    sessionsPerWeek: 4,
    hasDraftChanges: true,
    routines: [
      {
        id: 'day-upper-a',
        name: 'Upper A',
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
        name: 'Lower A',
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
        name: 'Upper B',
        blocks: [
          { id: 'blk-ul-9', name: 'Overhead press', scheme: '4 × 6', rpe: 'RPE 8', note: null },
          { id: 'blk-ul-10', name: 'Weighted pull-up', scheme: '4 × 6', rpe: 'RPE 8', note: null },
          { id: 'blk-ul-11', name: 'Seated cable row', scheme: '3 × 10', rpe: 'RPE 7', note: null },
          { id: 'blk-ul-12', name: 'Lateral raise', scheme: '3 × 15', rpe: '', note: null },
        ],
      },
      {
        id: 'day-lower-b',
        name: 'Lower B',
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
    note: null,
    meta: 'PPL · 8 weeks · 6 days',
    status: 'published',
    statusLabel: 'Published',
    assignedIds: ['rc-priya', 'rc-lena', 'rc-amir', 'rc-elif', 'rc-marek', 'rc-grace'],
    assignedLabel: assignedLabel(6),
    weeks: 8,
    sessionsPerWeek: 4,
    hasDraftChanges: false,
    routines: [
      {
        id: 'day-push-a',
        name: 'Push A',
        blocks: [
          { id: 'blk-ppl-1', name: 'Bench press', scheme: '4 × 6', rpe: 'RPE 8', note: null },
          { id: 'blk-ppl-2', name: 'Overhead press', scheme: '3 × 8', rpe: 'RPE 8', note: null },
          { id: 'blk-ppl-3', name: 'Cable fly', scheme: '3 × 12', rpe: 'RPE 7', note: null },
        ],
      },
      {
        id: 'day-pull-a',
        name: 'Pull A',
        blocks: [
          { id: 'blk-ppl-4', name: 'Weighted pull-up', scheme: '4 × 6', rpe: 'RPE 8', note: null },
          { id: 'blk-ppl-5', name: 'Barbell row', scheme: '4 × 8', rpe: 'RPE 8', note: null },
          { id: 'blk-ppl-6', name: 'Face pull', scheme: '3 × 15', rpe: '', note: null },
        ],
      },
      {
        id: 'day-legs-a',
        name: 'Legs A',
        blocks: [
          { id: 'blk-ppl-7', name: 'Back squat', scheme: '4 × 6', rpe: 'RPE 8', note: null },
          { id: 'blk-ppl-8', name: 'Romanian deadlift', scheme: '3 × 8', rpe: 'RPE 7', note: null },
          { id: 'blk-ppl-9', name: 'Leg press', scheme: '3 × 12', rpe: 'RPE 8', note: null },
        ],
      },
      {
        id: 'day-push-b',
        name: 'Push B',
        blocks: [
          { id: 'blk-ppl-10', name: 'Incline DB press', scheme: '4 × 8', rpe: 'RPE 8', note: null },
          { id: 'blk-ppl-11', name: 'Dip', scheme: '3 × 10', rpe: 'RPE 8', note: null },
          { id: 'blk-ppl-12', name: 'Lateral raise', scheme: '3 × 15', rpe: '', note: null },
        ],
      },
      {
        id: 'day-pull-b',
        name: 'Pull B',
        blocks: [
          { id: 'blk-ppl-13', name: 'Lat pulldown', scheme: '4 × 10', rpe: 'RPE 8', note: null },
          { id: 'blk-ppl-14', name: 'Seated cable row', scheme: '3 × 10', rpe: 'RPE 7', note: null },
          { id: 'blk-ppl-15', name: 'Hammer curl', scheme: '3 × 12', rpe: '', note: null },
        ],
      },
      {
        id: 'day-legs-b',
        name: 'Legs B',
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
    note: null,
    meta: 'Full body · 10 weeks · 3 days',
    status: 'published',
    statusLabel: 'Published',
    assignedIds: ['rc-sofia', 'rc-tom', 'rc-tomas'],
    assignedLabel: assignedLabel(3),
    weeks: 10,
    sessionsPerWeek: 4,
    hasDraftChanges: false,
    routines: [
      {
        id: 'day-5x5-1',
        name: 'Day 1',
        blocks: [
          { id: 'blk-5x5-1', name: 'Back squat', scheme: '5 × 5', rpe: 'RPE 8', note: null },
          { id: 'blk-5x5-2', name: 'Bench press', scheme: '5 × 5', rpe: 'RPE 8', note: null },
          { id: 'blk-5x5-3', name: 'Barbell row', scheme: '5 × 5', rpe: 'RPE 7', note: null },
        ],
      },
      {
        id: 'day-5x5-2',
        name: 'Day 2',
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
        name: 'Day 3',
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
    note: null,
    meta: 'Rehab · 6 weeks · 3 days',
    status: 'archived',
    statusLabel: 'Archived',
    assignedIds: [],
    assignedLabel: assignedLabel(0),
    weeks: 6,
    sessionsPerWeek: 4,
    hasDraftChanges: false,
    routines: [
      {
        id: 'day-return-1',
        name: 'Day 1',
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
        name: 'Day 2',
        blocks: [
          { id: 'blk-rt-4', name: 'Split squat', scheme: '3 × 10', rpe: 'RPE 6', note: null },
          { id: 'blk-rt-5', name: 'Lat pulldown', scheme: '3 × 12', rpe: 'RPE 6', note: null },
          { id: 'blk-rt-6', name: 'Side plank', scheme: '3 × 30', rpe: '', note: null },
        ],
      },
      {
        id: 'day-return-3',
        name: 'Day 3',
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
/** The handful the mocked catalogue actually contains. */
export function mockExerciseFilterOptions(): readonly ApiExerciseFilterOption[] {
  const seen = new Map<string, number>();
  for (const option of exerciseState) {
    for (const part of option.meta.split(' · ')) {
      const key = part.trim();
      if (key.length > 0) seen.set(key, (seen.get(key) ?? 0) + 1);
    }
  }

  return [...seen.entries()].map(([label, count], index) => ({
    // Equipment is written first in `meta` ("Dumbbell · Chest"), so odd
    // positions are muscles. Good enough for a fixture; the real one asks the
    // database which is which.
    kind: index % 2 === 0 ? ('equipment' as const) : ('body_part' as const),
    value: label,
    label,
    count,
  }));
}

export function mockExerciseOptions(
  query: string,
  filter: ExerciseFilter,
): readonly ApiExerciseOption[] {
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

/* ------------------------------------------------------------------ *
 * The feed, from both ends of the same week.
 *
 * The coach's rows and Maya's rows describe overlapping events on
 * purpose: Sam assigns Upper A and Maya finishes it, Sam asks for
 * check-ins and Priya grants them. One table, two readings.
 * ------------------------------------------------------------------ */

const coachNotifications: readonly ApiNotificationGroup[] = [
  {
    id: 'today',
    title: 'TODAY',
    items: [
      {
        id: 'n-c1',
        kind: 'session-done',
        person: { id: 'rc-maya', name: 'Maya Andersson', initials: 'MA' },
        title: 'Maya finished Upper A',
        body: '7 of 7 sets · 48 min · one PR on bench',
        when: '2h',
        unread: true,
        destination: { kind: 'screen', route: '/student/rc-maya' },
      },
      {
        id: 'n-c2',
        kind: 'access-revoked',
        person: { id: 'rc-elif', name: 'Elif Kaya', initials: 'EK' },
        title: 'Elif hid her health profile',
        body: 'You can still see workouts and nutrition.',
        when: '4h',
        unread: true,
        destination: { kind: 'screen', route: '/student/rc-elif' },
      },
      {
        id: 'n-c4',
        kind: 'check-in',
        person: { id: 'rc-lena', name: 'Lena Chen', initials: 'LC' },
        title: 'Lena logged August check-in',
        body: '82.4 kg · waist down 0.7 cm · note attached',
        when: '8h',
        unread: false,
        destination: { kind: 'screen', route: '/student/rc-lena' },
      },
    ],
  },
  {
    id: 'earlier',
    title: 'EARLIER THIS WEEK',
    items: [
      {
        id: 'n-c5',
        kind: 'attached',
        person: { id: 'rc-hana', name: 'Hana Watanabe', initials: 'HW' },
        title: 'Hana attached',
        body: 'She shared nutrition only.',
        when: '1d',
        unread: false,
        destination: { kind: 'screen', route: '/student/rc-hana' },
      },
      {
        id: 'n-c6',
        kind: 'access-granted',
        person: { id: 'rc-priya', name: 'Priya Bhatt', initials: 'PB' },
        title: 'Priya granted monthly check-ins',
        body: 'Includes logging on her behalf.',
        when: '2d',
        unread: false,
        destination: { kind: 'screen', route: '/student/rc-priya' },
      },
      {
        id: 'n-c7',
        kind: 'message',
        person: { id: 'rc-tomas', name: 'Tomas Lindqvist', initials: 'TL' },
        title: 'Tomas replied',
        body: '"Shoulder felt fine on the incline work."',
        when: '3d',
        unread: false,
        destination: { kind: 'screen', route: '/messages/rc-tomas' },
      },
      {
        id: 'n-c8',
        kind: 'detached',
        person: { id: 'rc-ben', name: 'Ben Jarvis', initials: 'BJ' },
        title: 'Ben detached',
        body: 'His data went with him. The thread stays readable.',
        when: '4d',
        unread: false,
        // Nowhere to go: the client is gone, so there is no page to open.
        destination: null,
      },
      {
        id: 'n-c9',
        kind: 'message',
        person: null,
        title: 'What detaching does to your data',
        body: 'A short guide, since Ben is the second this month.',
        when: '4d',
        unread: false,
        // Opens inside Ligo — the reader is mid-triage and coming back.
        destination: { kind: 'web', url: 'https://ligo.app/help/detaching' },
      },
    ],
  },
];

const COACH_PERSON = { id: 'coach-sam', name: 'Sam Okafor', initials: 'SO' } as const;

const clientNotifications: readonly ApiNotificationGroup[] = [
  {
    id: 'today',
    title: 'TODAY',
    items: [
      {
        id: 'n-m1',
        kind: 'routine-assigned',
        person: COACH_PERSON,
        title: 'Sam assigned you Upper A',
        body: 'Push focus · 5 exercises. It is on your Train tab now.',
        when: '2h',
        unread: true,
        destination: { kind: 'screen', route: '/train' },
      },
      {
        id: 'n-m2',
        kind: 'access-requested',
        person: COACH_PERSON,
        title: 'Sam asked to see your check-ins',
        body: 'Weight, measurements and the notes you write with them.',
        when: '5h',
        unread: true,
        destination: { kind: 'screen', route: '/profile' },
      },
    ],
  },
  {
    id: 'earlier',
    title: 'EARLIER THIS WEEK',
    items: [
      {
        id: 'n-m3',
        kind: 'check-in-reply',
        person: COACH_PERSON,
        title: 'Sam replied to your June check-in',
        body: '"Waist down 2cm and bench up — that is the plan working."',
        when: '3d',
        unread: false,
        destination: { kind: 'screen', route: '/check-ins' },
      },
      {
        id: 'n-m4',
        kind: 'routine-updated',
        person: COACH_PERSON,
        title: 'Sam changed Lower B',
        body: 'Your copy is untouched until you accept it.',
        when: '5d',
        unread: false,
        destination: { kind: 'screen', route: '/train' },
      },
      {
        id: 'n-m5',
        kind: 'message',
        person: COACH_PERSON,
        title: 'Sam booked you in for Saturday',
        body: 'Ironworks Lagos, 09:00. Opens in your calendar.',
        when: '5d',
        unread: false,
        // Leaves Ligo on purpose: the calendar owns this, not us.
        destination: { kind: 'external', url: 'https://cal.ligo.app/e/sat-0900' },
      },
    ],
  },
];

let notificationFeeds: Record<'coach' | 'client', readonly ApiNotificationGroup[]> = {
  coach: coachNotifications,
  client: clientNotifications,
};

/**
 * A catalogue entry, offline. Only the handful of names the other fixtures
 * use — the point is that the preview screen has something to draw, not that
 * 1,400 exercises exist here too.
 */
const exercisePreviews: Readonly<Record<string, ApiExercisePreview>> = {
  'bench press': {
    id: 'wx-0025',
    externalId: '0025',
    name: 'Barbell bench press',
    gifUrl: 'https://cdn.workoutxapp.com/gifs/0025.gif',
    bodyPart: 'chest',
    target: 'pectorals',
    equipment: 'barbell',
    secondaryMuscles: ['triceps', 'shoulders'],
    instructions: [
      'Lie back on a flat bench holding the bar at shoulder width.',
      'Lower the bar to the middle of your chest, elbows at about 45 degrees.',
      'Press back up until your arms are straight, without locking hard.',
    ],
    difficulty: 'intermediate',
  },
  'incline dumbbell press': {
    id: 'wx-0314',
    externalId: '0314',
    name: 'Incline dumbbell press',
    gifUrl: 'https://cdn.workoutxapp.com/gifs/0314.gif',
    bodyPart: 'chest',
    target: 'pectorals',
    equipment: 'dumbbell',
    secondaryMuscles: ['shoulders', 'triceps'],
    instructions: [
      'Set the bench to about 30 degrees and sit back with a dumbbell in each hand.',
      'Press both dumbbells up until your arms are straight.',
      'Lower under control until you feel a stretch across the chest.',
    ],
    difficulty: 'beginner',
  },
};

/** `null` for anything invented — the screen says so rather than inventing back. */
export function mockExercisePreview(name: string): ApiExercisePreview | null {
  return exercisePreviews[name.trim().toLowerCase()] ?? null;
}

export function mockNotifications(
  audience: 'coach' | 'client',
): readonly ApiNotificationGroup[] {
  return notificationFeeds[audience];
}

/**
 * Reading is per item, never per group — and the id is looked for in both
 * feeds rather than taking an audience, because the mutation that calls this
 * knows an id and nothing else.
 */
export function mockMarkNotificationRead(id: string): void {
  notificationFeeds = {
    coach: markNotificationRead(notificationFeeds.coach, id),
    client: markNotificationRead(notificationFeeds.client, id),
  };
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
