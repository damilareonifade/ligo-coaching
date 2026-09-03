export type StudentStatus = 'on-track' | 'at-risk' | 'inactive';
export type SessionStatus = 'scheduled' | 'completed' | 'missed';

export interface ApiCoach {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly gymName: string;
  readonly avatarUrl: string | null;
}

export type UserRole = 'client' | 'coach';

export interface ApiSessionUser {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly role: UserRole;
  readonly avatarUrl: string | null;
}

export interface ApiCoachSummary {
  readonly id: string;
  readonly name: string;
  readonly initials: string;
  /** e.g. "Strength coach · 18 clients · Berlin" */
  readonly headline: string;
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

/* ------------------------------------------------------------------ *
 * Coach programs. Deliberately separate from `ApiProgram` above: that
 * shape is the student-detail read (a flat exercise list), while these
 * are the coach's library and editor — days, blocks, and the publish
 * state that decides whether a client has this version yet.
 * ------------------------------------------------------------------ */

export type ProgramStatus = 'published' | 'draft' | 'archived';

/** A routine is a single day; a program has weeks and several days. */
export type BuilderKind = 'routine' | 'program';

export interface ApiProgramBlock {
  readonly id: string;
  readonly name: string;
  /** e.g. "4 × 8" | "3 × 10" */
  readonly scheme: string;
  /** e.g. "RPE 8" — empty when the coach left it unset. */
  readonly rpe: string;
  /** The one cue the client should remember on this lift. */
  readonly note: string | null;
}

export interface ApiProgramDay {
  readonly id: string;
  /** "Day 1" | "Upper A" */
  readonly label: string;
  readonly blocks: readonly ApiProgramBlock[];
}

export interface ApiProgramSummary {
  readonly id: string;
  readonly name: string;
  /** e.g. "Upper/Lower · 12 weeks · 4 days" */
  readonly meta: string;
  readonly status: ProgramStatus;
  /** "Published" | "Draft changes" | "Archived" */
  readonly statusLabel: string;
  /** Roster client ids — the avatars come from the roster, not a student cast. */
  readonly assignedIds: readonly string[];
  /** e.g. "Assigned to 4 clients" */
  readonly assignedLabel: string;
}

export interface ApiProgramDetail extends ApiProgramSummary {
  readonly weeks: number;
  readonly days: readonly ApiProgramDay[];
  /** True while the coach's edits are ahead of what clients hold. */
  readonly hasDraftChanges: boolean;
}

export interface ApiExerciseOption {
  readonly id: string;
  readonly name: string;
  /** e.g. "Barbell · Quads" */
  readonly meta: string;
  /** "Compound" | "Accessory" | "Yours" */
  readonly tag: string;
  /** Picker section: "Recent" | "Chest" | "Back" | "Legs" | "Shoulders" */
  readonly group: string;
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
  readonly user: ApiSessionUser;
}

/* ------------------------------------------------------------------ *
 * Client-side training. Deliberately separate from the coach shapes
 * above — the client app reads pre-composed display strings from the
 * server, where the coach app reads structured roster/program data.
 * ------------------------------------------------------------------ */

export interface ApiMacroTarget {
  readonly consumed: number;
  readonly target: number;
  readonly unit: string;
}

export interface ApiClientPlan {
  readonly id: string;
  /** e.g. "Upper A · Push focus" */
  readonly title: string;
  /** e.g. "5 exercises · ~48 min · last done 4 days ago" */
  readonly meta: string;
  /** Plan-source chip, e.g. "From Sam" or "Your plan". */
  readonly source: string;
  readonly exerciseCount: number;
}

export interface ApiClientDay {
  /** e.g. "MON" */
  readonly day: string;
  readonly title: string;
  readonly meta: string;
  /** "Done" | "Today" | "Planned" | "Missed" | "Rest" */
  readonly tag: string;
}

export interface ApiClientCoachSummary {
  readonly id: string;
  readonly name: string;
  readonly initials: string;
  readonly line1: string;
  readonly line2: string;
  readonly permissionLabel: string;
}

export interface ApiClientToday {
  readonly plan: ApiClientPlan;
  readonly calories: ApiMacroTarget;
  readonly protein: ApiMacroTarget;
  /** `null` = self-training, no coach attached. */
  readonly coach: ApiClientCoachSummary | null;
  readonly week: readonly ApiClientDay[];
}

export interface ApiRoutine {
  readonly id: string;
  readonly name: string;
  readonly meta: string;
  readonly chip: string;
}

export interface ApiProgramProgress {
  readonly title: string;
  /** e.g. "wk 6 / 12" */
  readonly week: string;
  readonly totalWeeks: number;
  readonly currentWeek: number;
  readonly note: string;
}

export interface ApiNextUpPreviewRow {
  readonly name: string;
  /** e.g. "4 × 8" */
  readonly scheme: string;
}

export interface ApiTrainOverview {
  readonly nextUp: ApiClientPlan;
  readonly nextUpPreview: readonly ApiNextUpPreviewRow[];
  readonly routines: readonly ApiRoutine[];
  readonly program: ApiProgramProgress | null;
}

export interface ApiSessionSet {
  readonly n: number;
  readonly weightKg: number;
  readonly reps: number;
  readonly completed: boolean;
  readonly isPr: boolean;
}

export interface ApiSessionExercise {
  readonly id: string;
  readonly name: string;
  /** Cue / scheme line, e.g. "4 × 8 · 2 min rest". */
  readonly note: string;
  readonly sets: readonly ApiSessionSet[];
}

export interface ApiClientSession {
  readonly id: string;
  readonly title: string;
  readonly startedAt: string;
  readonly exercises: readonly ApiSessionExercise[];
}

/* ------------------------------------------------------------------ *
 * Client nutrition. Same convention as the training shapes above: the
 * server hands back pre-composed display strings (`meta`, `source`) so
 * the phone never has to guess at units or pluralisation.
 * ------------------------------------------------------------------ */

export interface ApiFoodMacro {
  readonly label: string;
  readonly consumed: number;
  readonly target: number;
  readonly unit: string;
}

export interface ApiLoggedFood {
  readonly id: string;
  readonly name: string;
  /** e.g. "180 g · lunch" */
  readonly meta: string;
  readonly kcal: number;
  readonly loggedBy: 'you' | 'coach';
}

export interface ApiQuickFood {
  readonly id: string;
  readonly name: string;
  readonly meta: string;
  readonly kcal: number;
}

export interface ApiFoodDay {
  readonly kcalConsumed: number;
  readonly kcalTarget: number;
  /** protein / carbs / fat, in that order. */
  readonly macros: readonly ApiFoodMacro[];
  readonly logged: readonly ApiLoggedFood[];
  readonly quickAdd: readonly ApiQuickFood[];
}

export interface ApiFoodResult {
  readonly id: string;
  readonly name: string;
  readonly meta: string;
  readonly kcal: number;
  /** "Verified" | "Your foods" | "Community" */
  readonly source: string;
}

/* ------------------------------------------------------------------ *
 * Client progress.
 * ------------------------------------------------------------------ */

export interface ApiVolumeBar {
  /** Short axis tick, e.g. "W1". */
  readonly label: string;
  readonly volumeKg: number;
}

export interface ApiPersonalRecord {
  readonly id: string;
  readonly name: string;
  /** e.g. "92.5 kg × 3" */
  readonly value: string;
  readonly when: string;
}

export interface ApiBodyWeightPoint {
  /** Empty string for the points between month ticks. */
  readonly label: string;
  readonly kg: number;
}

export interface ApiMonthlyMini {
  readonly id: string;
  readonly label: string;
  readonly weight: string;
  /** Signed change or "—" when there is no prior month. */
  readonly delta: string;
  readonly by: 'you' | 'coach';
}

export interface ApiClientProgress {
  readonly weeklyVolumeKg: number;
  readonly volumeChangePct: number;
  readonly volumeBars: readonly ApiVolumeBar[];
  readonly personalRecords: readonly ApiPersonalRecord[];
  readonly bodyWeightKg: number;
  readonly bodyWeightSeries: readonly ApiBodyWeightPoint[];
  readonly monthlyChip: string;
  readonly monthly: readonly ApiMonthlyMini[];
  readonly monthlyNote: string;
}

/* ------------------------------------------------------------------ *
 * Client profile
 * ------------------------------------------------------------------ */

export interface ApiProfileStat {
  readonly label: string;
  readonly value: string;
}

/**
 * One tappable line in a settings card. `route` makes it navigate; without one
 * the row is a stub. `danger` is for rows that end something (detach, sign out).
 */
export interface ApiSettingsRow {
  readonly id: string;
  readonly label: string;
  readonly desc: string;
  /** Right-aligned current value, e.g. "kg · cm". */
  readonly value?: string;
  readonly route?: string;
  readonly danger?: boolean;
}

export interface ApiSettingsGroup {
  readonly id: string;
  readonly title: string;
  readonly rows: readonly ApiSettingsRow[];
}

export interface ApiClientProfile {
  readonly name: string;
  readonly email: string;
  readonly memberSince: string;
  readonly stats: readonly ApiProfileStat[];
  /** `null` = self-training, no coach attached. */
  readonly coach: ApiClientCoachSummary | null;
  readonly coachRows: readonly ApiSettingsRow[];
  readonly groups: readonly ApiSettingsGroup[];
  readonly version: string;
}

export interface ApiNotificationToggle {
  readonly id: string;
  readonly label: string;
  readonly desc: string;
  readonly enabled: boolean;
}

export interface ApiNotificationGroup {
  readonly id: string;
  readonly title: string;
  readonly note: string;
  readonly rows: readonly ApiNotificationToggle[];
}

export interface ApiNotificationSettings {
  readonly groups: readonly ApiNotificationGroup[];
  /** Display range, e.g. "22:00 – 07:00". */
  readonly quietHours: string;
}

export interface ApiIntegrationFlow {
  readonly label: string;
  readonly active: boolean;
}

export interface ApiIntegration {
  readonly id: string;
  readonly name: string;
  readonly desc: string;
  /** Two-letter tile mark, e.g. "AH". */
  readonly mark: string;
  readonly connected: boolean;
  readonly status: string;
  readonly flows: readonly ApiIntegrationFlow[];
}

export interface ApiDataCount {
  readonly label: string;
  readonly value: string;
}

export interface ApiImportSource {
  readonly id: string;
  readonly name: string;
  readonly meta: string;
  readonly mark: string;
}

export interface ApiDataAccessRow {
  readonly id: string;
  readonly label: string;
  readonly chip: string;
  readonly tone: 'violet' | 'neutral' | 'danger';
}

export interface ApiClientData {
  readonly counts: readonly ApiDataCount[];
  readonly lastExport: string;
  readonly importSources: readonly ApiImportSource[];
  readonly access: readonly ApiDataAccessRow[];
}

export interface ApiHealthRow {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly chip?: string;
}

export interface ApiHealthSection {
  readonly id: string;
  readonly title: string;
  readonly note: string;
  readonly rows: readonly ApiHealthRow[];
}

export interface ApiClientHealth {
  readonly sharedWithCoach: boolean;
  readonly shareNote: string;
  readonly sections: readonly ApiHealthSection[];
}

/* ------------------------------------------------------------------ *
 * Coach chat. One thread per attachment — there is no group chat and
 * no second coach, so the thread needs no id of its own.
 * ------------------------------------------------------------------ */

export interface ApiChatMessage {
  readonly id: string;
  readonly text: string;
  /** Pre-composed display stamp, e.g. "Mon 09:12". */
  readonly when: string;
  readonly from: 'me' | 'coach';
}

export interface ApiClientChat {
  readonly coachName: string;
  readonly coachInitials: string;
  /** e.g. "Strength coach · replies most days" */
  readonly context: string;
  /** Permission chip, e.g. "Partial access". */
  readonly chipLabel: string;
  /** `true` once the coach is detached: history stays, the composer goes. */
  readonly archived: boolean;
  readonly messages: readonly ApiChatMessage[];
}

/* ------------------------------------------------------------------ *
 * Monthly check-ins. Their own permission, deliberately separate from
 * the coach's other access — see `coachCanEdit`.
 * ------------------------------------------------------------------ */

export interface ApiCheckInCell {
  readonly label: string;
  readonly value: string;
}

export interface ApiCheckIn {
  readonly id: string;
  /** e.g. "August 2026" */
  readonly label: string;
  readonly weightKg: string;
  /** Signed change or "—" when there is no prior month. */
  readonly delta: string;
  /** waist / chest / hips / body fat, in that order. */
  readonly cells: readonly ApiCheckInCell[];
  readonly note: string;
  readonly by: 'you' | 'coach';
  /** e.g. "Logged by you · 3 Aug" */
  readonly byLine: string;
  readonly photos: number;
}

export interface ApiCheckInStat {
  readonly label: string;
  readonly value: string;
}

export interface ApiMonthlyCheckIns {
  readonly stats: readonly ApiCheckInStat[];
  /** Newest month first. */
  readonly entries: readonly ApiCheckIn[];
  /** "Sam can log & edit check-ins" — off still leaves them readable. */
  readonly coachCanEdit: boolean;
  /** Empty when no coach is attached, which hides the toggle entirely. */
  readonly coachName: string;
  readonly note: string;
}

/* ------------------------------------------------------------------ *
 * Coach roster. The coach's own view of everyone attached to them —
 * `access` is what that client granted, never what the coach asked for.
 * ------------------------------------------------------------------ */

/** Why a row wants the coach's eye. `ok` and `quiet` say nothing on the row. */
export type RosterAttention = 'live' | 'review' | 'new' | 'ok' | 'quiet';

/** How much the client shares. Set by the client, read-only to the coach. */
export type RosterAccess = 'full' | 'partial' | 'min' | 'none';

export interface ApiRosterLabel {
  readonly id: string;
  readonly name: string;
  /** A `label-*` token name — see src/theme/labelColors.ts. */
  readonly color: string;
  /** Derived from the roster, never authored. */
  readonly count: number;
}

export interface ApiRosterClient {
  readonly id: string;
  readonly name: string;
  readonly initials: string;
  readonly daysAgo: number;
  /** Pre-composed stamp: "now" | "2h" | "3d" | "2w". */
  readonly when: string;
  /** e.g. "Upper/Lower · wk 6 · workouts, nutrition" */
  readonly meta: string;
  readonly attention: RosterAttention;
  readonly access: RosterAccess;
  readonly labelId: string | null;
}

export interface ApiRosterStat {
  readonly id: string;
  readonly label: string;
  readonly value: string;
}

export interface ApiRoster {
  readonly stats: readonly ApiRosterStat[];
  readonly clients: readonly ApiRosterClient[];
  readonly labels: readonly ApiRosterLabel[];
  readonly inviteCode: string;
}
