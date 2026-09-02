import type {
  ApiCoach,
  ApiProgram,
  ApiSession,
  ApiStudent,
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
