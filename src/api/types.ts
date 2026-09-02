export type StudentStatus = 'on-track' | 'at-risk' | 'inactive';
export type SessionStatus = 'scheduled' | 'completed' | 'missed';

export interface ApiCoach {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly gymName: string;
  readonly avatarUrl: string | null;
}

export interface ApiStudent {
  readonly id: string;
  readonly name: string;
  readonly avatarUrl: string | null;
  readonly goal: string;
  readonly programId: string | null;
  readonly status: StudentStatus;
  /** Share of assigned sessions completed, 0–100. */
  readonly adherence: number;
  readonly nextSessionAt: string | null;
  readonly lastSessionAt: string | null;
  readonly note: string | null;
}

export interface ApiExercise {
  readonly id: string;
  readonly name: string;
  readonly sets: number;
  readonly reps: number;
  readonly targetWeightKg: number;
  readonly restSeconds: number;
  /** The one thing the coach wants the student to remember on this lift. */
  readonly cue: string | null;
}

export interface ApiProgram {
  readonly id: string;
  readonly name: string;
  readonly focus: string;
  readonly weeks: number;
  readonly exercises: readonly ApiExercise[];
  readonly assignedStudentIds: readonly string[];
}

export interface ApiSession {
  readonly id: string;
  readonly studentId: string;
  readonly studentName: string;
  readonly programId: string;
  readonly programName: string;
  readonly scheduledAt: string;
  readonly status: SessionStatus;
  readonly completedSets: number;
  readonly totalSets: number;
}

export interface ApiVolumePoint {
  readonly weekStart: string;
  readonly volumeKg: number;
}

export interface ApiSetLog {
  readonly exerciseId: string;
  readonly setIndex: number;
  readonly reps: number;
  readonly weightKg: number;
}

export interface ApiAuthResult {
  readonly token: string;
  readonly coach: ApiCoach;
}
