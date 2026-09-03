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
 * Chat. The same shape from both seats: a client's one thread with
 * their coach, and a coach's thread with one client.
 * ------------------------------------------------------------------ */

export interface ApiChatMessage {
  readonly id: string;
  readonly text: string;
  /** Pre-composed display stamp, e.g. "Mon 09:12". */
  readonly when: string;
  /**
   * Side-neutral on purpose. One thread is rendered from two seats — what the
   * client calls "the coach" is "me" to the coach — so the sender is named
   * relative to whoever is reading, never by role.
   */
  readonly from: 'me' | 'them';
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

/* ------------------------------------------------------------------ *
 * Coach activity. Everything that happened across the roster, newest
 * first. Four of the eight kinds are access changes — a client giving
 * or taking back what the coach can see — and the feed is where that
 * gets announced, so they are never quietly folded in with a session.
 * ------------------------------------------------------------------ */

export type ActivityKind =
  | 'session-done'
  | 'session-missed'
  | 'message'
  | 'permission-granted'
  | 'permission-revoked'
  | 'attached'
  | 'detached'
  | 'check-in';

export interface ApiActivityItem {
  readonly id: string;
  readonly kind: ActivityKind;
  readonly clientId: string;
  readonly clientName: string;
  readonly initials: string;
  readonly title: string;
  readonly body: string;
  /** Pre-composed stamp: "2h" | "1d" | "1w". */
  readonly when: string;
  readonly unread: boolean;
}

export interface ApiActivityGroup {
  readonly id: string;
  /** Already uppercase — "TODAY" | "EARLIER THIS WEEK". */
  readonly title: string;
  readonly items: readonly ApiActivityItem[];
}

/* ------------------------------------------------------------------ *
 * Coach messages. One conversation per attached client. Messaging is
 * the one channel permissions never close, so an entry here says
 * nothing about what that client shares — `accessLabel` does.
 * ------------------------------------------------------------------ */

export interface ApiInboxEntry {
  readonly clientId: string;
  readonly name: string;
  readonly initials: string;
  /** Last message in the thread, from either side. */
  readonly preview: string;
  readonly when: string;
  readonly unread: boolean;
  /** Derived from the roster's `access` — see `accessLabel` in src/lib/roster.ts. */
  readonly accessLabel: string;
}

export interface ApiCoachThread {
  readonly clientId: string;
  readonly name: string;
  readonly initials: string;
  readonly accessLabel: string;
  /** `true` once the client detaches: the history stays, the composer goes. */
  readonly archived: boolean;
  readonly messages: readonly ApiChatMessage[];
}

/* ------------------------------------------------------------------ *
 * Community — group chats and leaderboards.
 *
 * The rest of the app answers "what can one coach see about one
 * client". Community is the plural case, and the same rule holds: a
 * coach can only invite, and nobody appears anywhere until they say
 * yes on their own screen. Two consequences run through every shape
 * below. Non-participants are absent rather than greyed out, so there
 * is no shape here that can name someone who did not opt in — only
 * `invitedNotOptedIn`, a bare count. And a display identity is chosen
 * per board, never inherited, so `myIdentity` lives on the board and
 * on the group rather than on the client.
 * ------------------------------------------------------------------ */

/** How a client chooses to be named in one group or on one board. */
export type CommunityIdentity = 'real' | 'first' | 'handle';

export type BoardMetric = 'volume' | 'sessions' | 'streak' | 'weight-lifted' | 'bodyweight';

export type BoardWindow = 'week' | 'month' | 'quarter' | 'custom';

export interface ApiCommunityMember {
  readonly clientId: string;
  /** Already resolved through that member's own identity choice. */
  readonly displayName: string;
  readonly initials: string;
  readonly isCoach: boolean;
}

export interface ApiGroupMessage {
  readonly id: string;
  readonly senderId: string;
  readonly senderName: string;
  readonly isCoach: boolean;
  readonly text: string;
  readonly when: string;
  /** Side-neutral, exactly as in `ApiChatMessage` — relative to the reader. */
  readonly from: 'me' | 'them';
}

export interface ApiCommunityGroup {
  readonly id: string;
  readonly name: string;
  readonly coachName: string;
  readonly members: readonly ApiCommunityMember[];
  readonly myIdentity: CommunityIdentity;
  readonly myDisplayName: string;
  readonly messages: readonly ApiGroupMessage[];
}

export interface ApiBoardRow {
  readonly rank: number;
  readonly displayName: string;
  readonly initials: string;
  /** Pre-composed with its unit, e.g. "42,180 kg". */
  readonly value: string;
  readonly sub: string;
  /** Movement since the last update: "+2" | "−1" | "—". */
  readonly delta: string;
  readonly isMe: boolean;
}

export interface ApiBoardStat {
  readonly label: string;
  readonly value: string;
}

export interface ApiCommunityBoard {
  readonly id: string;
  readonly name: string;
  readonly coachName: string;
  /** e.g. "Total volume lifted · 1–30 Sep · updates hourly" */
  readonly metricLabel: string;
  /** Just the window, for the opt-in facts grid: "1–30 Sep". */
  readonly windowLabel: string;
  readonly optedIn: boolean;
  readonly myIdentity: CommunityIdentity;
  readonly stats: readonly ApiBoardStat[];
  readonly rows: readonly ApiBoardRow[];
  /**
   * A count and nothing more. Naming who declined would undo the whole
   * point of the opt-in, so the shape cannot carry it even if a server
   * wanted to send it.
   */
  readonly invitedNotOptedIn: number;
  readonly facts: readonly { readonly label: string; readonly value: string }[];
}

export type CommunityInviteKind = 'group' | 'board';

export interface ApiCommunityInvite {
  readonly id: string;
  readonly kind: CommunityInviteKind;
  readonly targetId: string;
  readonly name: string;
  readonly coachName: string;
  readonly summary: string;
  /** "If you accept, members can see" */
  readonly visible: readonly string[];
  /** "Stays private, always" */
  readonly hidden: readonly string[];
}

/* Display rows. The index lists memberships without loading a thread
 * or a ranking, so these are summaries rather than the full shapes. */

export interface ApiCommunityGroupSummary {
  readonly id: string;
  readonly name: string;
  readonly coachName: string;
  readonly memberCount: number;
  /** Last message in the thread, from any member. */
  readonly preview: string;
  readonly when: string;
}

export interface ApiCommunityBoardSummary {
  readonly id: string;
  readonly name: string;
  readonly coachName: string;
  readonly metricLabel: string;
  readonly optedIn: boolean;
  /** "2nd of 6" while opted in; an invitation to decide when not. */
  readonly standing: string;
}

/** One payload for the client's whole Community screen. */
export interface ApiCommunity {
  readonly invites: readonly ApiCommunityInvite[];
  readonly groups: readonly ApiCommunityGroupSummary[];
  readonly boards: readonly ApiCommunityBoardSummary[];
}

/** One row of the coach's inbox that is a group rather than a client. */
export interface ApiCoachGroupSummary {
  readonly id: string;
  readonly name: string;
  readonly memberCount: number;
  readonly preview: string;
  readonly when: string;
}

export interface ApiIdentityOption {
  readonly id: CommunityIdentity;
  readonly label: string;
  readonly desc: string;
  /** How this choice actually renders for this client — "Maya A.". */
  readonly sample: string;
}

export interface ApiBoardMetricOption {
  readonly id: BoardMetric;
  readonly label: string;
  readonly desc: string;
  /**
   * Body weight is the one metric that can hurt someone to publish, so it
   * is flagged in the data rather than special-cased in a screen.
   */
  readonly sensitive?: boolean;
}

/* ------------------------------------------------------------------ *
 * The coach's review of one client.
 *
 * The shape is the boundary. A coach sees a domain the client granted
 * and nothing else, so an ungranted domain carries no `rows` at all
 * rather than rows the screen is trusted to hide — there is no value
 * in the payload for a rendering mistake to leak. `requested` is a
 * third state on purpose: asking is a thing the coach did, not a
 * thing the client answered, and it must never read as access.
 * ------------------------------------------------------------------ */

export type DomainAccess = 'granted' | 'not-granted' | 'requested';

export interface ApiReviewDomainRow {
  readonly label: string;
  readonly value: string;
}

export interface ApiReviewDomain {
  readonly id: 'nutrition' | 'metrics' | 'health' | 'monthly';
  readonly title: string;
  readonly access: DomainAccess;
  /** Empty unless `access` is `granted`. Never a placeholder. */
  readonly rows: readonly ApiReviewDomainRow[];
  /** What the coach can or cannot see here, and why. */
  readonly note: string;
}

export interface ApiReviewSession {
  readonly id: string;
  readonly name: string;
  readonly meta: string;
  /** "Done" | "Today" | "Missed" — see `sessionTagTone` in src/lib/clientReview.ts. */
  readonly tag: string;
}

export interface ApiClientReview {
  readonly clientId: string;
  readonly name: string;
  readonly initials: string;
  /** e.g. "Upper/Lower · week 6 of 12" */
  readonly programLine: string;
  /** The coach's own filing, not a permission. `null` = unfiled. */
  readonly labelId: string | null;
  /** e.g. "92% adherence" */
  readonly adherence: string;
  readonly adherenceBars: readonly { readonly label: string; readonly value: number }[];
  readonly domains: readonly ApiReviewDomain[];
  readonly sessions: readonly ApiReviewSession[];
  /** Drives the live entry point, and nothing else. */
  readonly isTraining: boolean;
}

/* ------------------------------------------------------------------ *
 * The live session, from the coach's seat. Structurally a sibling of
 * `ApiClientSession` rather than the same type: the client's shape
 * carries `isPr` and is written back to, and this one is a read. A
 * coach watching a set land is not editing it.
 * ------------------------------------------------------------------ */

export interface ApiLiveSet {
  readonly n: number;
  readonly weightKg: number;
  readonly reps: number;
  readonly completed: boolean;
}

export interface ApiLiveExercise {
  readonly id: string;
  readonly name: string;
  /** Cue / scheme line, e.g. "4 × 8 · 2 min rest". */
  readonly note: string;
  /** e.g. "2 of 4" */
  readonly progress: string;
  readonly sets: readonly ApiLiveSet[];
}

export interface ApiLiveSession {
  readonly clientId: string;
  readonly clientName: string;
  /** e.g. "Upper A · Push focus" */
  readonly title: string;
  readonly startedAt: string;
  readonly exercises: readonly ApiLiveExercise[];
  /** Said on the screen itself, so watching can never be mistaken for editing. */
  readonly notice: string;
}

/* ------------------------------------------------------------------ *
 * The coach's own settings.
 * ------------------------------------------------------------------ */

export interface ApiCoachNotification {
  readonly id: string;
  readonly label: string;
  readonly desc: string;
  readonly enabled: boolean;
  /**
   * A locked row cannot be turned off — a permission change decides what the
   * coach is allowed to do, so it is not theirs to mute. The flag lives in the
   * data rather than in a screen's list of special cases, and both the UI and
   * the mutation read it (see `canToggleNotification` in src/lib/coachProfile.ts).
   */
  readonly locked: boolean;
}

export interface ApiCoachProfile {
  readonly name: string;
  readonly initials: string;
  /** Derived from the roster, never authored — e.g. "Strength coach · Berlin · 17 clients". */
  readonly headline: string;
  readonly inviteCode: string;
  readonly notifications: readonly ApiCoachNotification[];
  readonly groups: readonly ApiSettingsGroup[];
}
