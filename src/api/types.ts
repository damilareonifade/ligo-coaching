
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

/* ------------------------------------------------------------------ *
 * What a client can choose to share, and the only vocabulary for it.
 *
 * The same five words appear on the client's switches, on the coach's
 * request button, and as the keys of `coach_clients.permissions`. One
 * vocabulary end to end means there is no table of synonyms to keep in
 * step — and no domain a coach can ask for that the client has no
 * screen to answer.
 * ------------------------------------------------------------------ */

export type ShareDomain = 'workouts' | 'nutrition' | 'metrics' | 'health' | 'monthly';

export type ApiSharePermissions = Readonly<Record<ShareDomain, boolean>>;

export const SHARE_DOMAINS: readonly ShareDomain[] = [
  'workouts',
  'nutrition',
  'metrics',
  'health',
  'monthly',
];

/* ------------------------------------------------------------------ *
 * Coach programs. Deliberately separate from `ApiProgram` above: that
 * shape is the student-detail read (a flat exercise list), while these
 * are the coach's library and editor — days, blocks, and the publish
 * state that decides whether a client has this version yet.
 * ------------------------------------------------------------------ */

export type ProgramStatus = 'published' | 'draft' | 'archived';

/** A routine is one session; a program is several routines and a length. */
export type BuilderKind = 'routine' | 'program';

/**
 * How a set of an exercise is counted. Mirrors `exercises.measure`, and is
 * the authority on which of the four numbers below mean anything.
 *
 * `load_reps` is a barbell bench press and is almost everything. `reps` is a
 * pull-up — the load is the body. `duration` is a plank. `distance_duration`
 * is a treadmill. `load_distance` is a farmers walk. See `@/lib/measures` for
 * what each one asks a coach for.
 */
export type SetMeasure =
  | 'load_reps'
  | 'reps'
  | 'duration'
  | 'distance_duration'
  | 'load_distance';

export interface ApiProgramBlock {
  readonly id: string;
  readonly name: string;
  /** e.g. "4 × 8" | "3 × 10" */
  readonly scheme: string;
  /** e.g. "RPE 8" — empty when the coach left it unset. */
  readonly rpe: string;
  /**
   * Target working weight in kg, or `null` for none — a bodyweight movement,
   * or a lift whose load is left to the day. Optional on the type so the many
   * existing block literals stay valid; read it as `block.targetKg ?? null`.
   *
   * A session started from this block opens with its sets at this weight
   * instead of zero, which is the whole point of setting one.
   */
  readonly targetKg?: number | null;
  /**
   * How far, and for how long. Both `null` for the overwhelming majority —
   * they are the prescription for a run, a hold or a loaded carry, and the
   * measure below says which of them the block is actually counted in.
   */
  readonly targetDistanceKm?: number | null;
  readonly targetDurationSeconds?: number | null;
  /**
   * Which catalogue entry this was picked from, or `null` for a name somebody
   * typed. It is what lets the block know how it is measured — and what the
   * preview is looked up by after a coach renames their copy.
   */
  readonly exerciseId?: string | null;
  /**
   * The exercise's measure, carried on the block so the editor and the summary
   * line do not each have to go and ask. Absent means nobody knows yet, which
   * `fieldsFor` reads as load × reps — what almost everything is, and what
   * every block written before any of this existed meant.
   */
  readonly measure?: SetMeasure;
  /** The one cue the client should remember on this lift. */
  readonly note: string | null;
}

/**
 * One session inside a program — Program → Routines → Exercises. What a coach
 * names here is what the client sees on the routine they were handed, so
 * "Routine 2" is only ever a starting point.
 */
export interface ApiProgramRoutine {
  readonly id: string;
  /** e.g. "Upper A". Defaults to "Routine 1" until the coach names it. */
  readonly name: string;
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
  /**
   * What the coach wants said about it as a whole — reaches the client as
   * `ApiRoutine.note` on the Train tab. `null` when they left it blank.
   */
  readonly note: string | null;
  readonly weeks: number;
  /**
   * How often the client should train, not which days. The program is a
   * rotation the client works through at their own pace — this is the target
   * they are measured against, and the only frequency the app knows.
   */
  readonly sessionsPerWeek: number;
  readonly routines: readonly ApiProgramRoutine[];
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
  /**
   * The catalogue's animation. `null` for an exercise somebody typed, and for
   * a catalogue entry that has none — the row draws initials instead of a
   * broken frame.
   */
  readonly gifUrl?: string | null;
  /**
   * How the catalogue says it is counted, so a block added from this row is
   * asked for the right numbers from the moment it lands.
   */
  readonly measure?: SetMeasure;
}

export interface ApiAuthResult {
  readonly token: string;
  readonly user: ApiSessionUser;
}

/**
 * Signing in, with the profile the session was checked against.
 *
 * The profile rides along because two gates are decided by it — whether a role
 * still has to be chosen, and whether onboarding has been finished — and the
 * sign-in already fetched it. Without it the caller would either re-fetch or,
 * as it did, route straight into the app and skip both.
 */
export interface ApiLoginResult {
  readonly session: ApiAuthResult;
  readonly profile: ApiProfile;
}

/**
 * The full profile row from `public.users`. `ApiSessionUser` is the subset the
 * auth store and tab bars need; this adds the fields the signup flow reads.
 */
export interface ApiProfile {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly avatarUrl: string | null;
  readonly role: UserRole;
  /** False until the person picked a side — a Google signup starts here. */
  readonly roleConfirmed: boolean;
  readonly onboardedAt: string | null;
}

/**
 * A signup that needs the email confirmed before a session exists. Supabase
 * returns no session in that case, so the UI has to say so rather than
 * routing into the app.
 */
export type ApiSignupResult =
  | { readonly status: 'signed-in'; readonly session: ApiAuthResult; readonly profile: ApiProfile }
  | { readonly status: 'confirmation-required'; readonly email: string };

/** One device signed in to this account — see `public.sessions`. */
export interface ApiDeviceSession {
  readonly id: string;
  readonly deviceId: string;
  readonly deviceName: string;
  readonly platform: string;
  readonly appVersion: string;
  readonly createdAt: string;
  readonly lastSeenAt: string;
  readonly revokedAt: string | null;
  readonly isCurrentDevice: boolean;
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
  /**
   * e.g. "5 exercises · last done 4 days ago".
   *
   * No duration estimate: nothing in the schema knows how long a routine
   * takes, and "~48 min" was a number the fixtures invented.
   */
  readonly meta: string;
  /** Plan-source chip, e.g. "From Sam" or "Your plan". */
  readonly source: string;
  readonly exerciseCount: number;
}

export interface ApiClientCoachSummary {
  readonly id: string;
  readonly name: string;
  readonly initials: string;
  readonly line1: string;
  readonly line2: string;
  readonly permissionLabel: string;
}

/** Calories and protein for the day. `null` when food logging is off. */
export interface ApiTodayNutrition {
  readonly calories: ApiMacroTarget;
  readonly protein: ApiMacroTarget;
}

export interface ApiClientToday {
  /**
   * What to suggest doing next, or `null` when there is nothing to suggest —
   * which is every client until a coach assigns them a program or they build
   * a routine of their own. Training alone with nothing planned is a state the
   * app supports, not an error, so the card says so rather than the screen
   * failing to load.
   */
  readonly plan: ApiClientPlan | null;
  /**
   * `null` when the `food` feature is off for this build. Absent rather than
   * zeroed: "0 of 0 kcal" is a claim about someone's day, and an empty card is
   * a different statement from a card that does not exist.
   */
  readonly nutrition: ApiTodayNutrition | null;
  /** `null` = self-training, no coach attached. */
  readonly coach: ApiClientCoachSummary | null;
  readonly week: ApiWeeklyProgress;
}

export interface ApiRoutinePreviewRow {
  readonly name: string;
  /** e.g. "4 × 8" */
  readonly scheme: string;
}

export interface ApiRoutine {
  readonly id: string;
  readonly name: string;
  /**
   * Whatever the author wants said about it — a coach's instruction, or the
   * client's own reminder. Replaced a composed "4 days · 8 weeks" line, which
   * meant one thing on a coach's entry and something else on a client's.
   */
  readonly note: string | null;
  /**
   * The plan the coach currently has this client on. Drawn as a ring on the
   * card and nothing else — it deliberately carries no label, because "Active"
   * beside a resume banner reads as "running right now", which is a different
   * thing entirely.
   */
  readonly isCurrent: boolean;
  /**
   * Who made it. A coach's routine is read-only to the client — they can run
   * it, not rewrite it — and only a client's own routine opens in the builder.
   */
  readonly owner: 'coach' | 'you';
  /** Where it came from, e.g. "From Sam" | "Yours". */
  readonly sourceLabel: string;
  /** True once this copy has been changed away from the template it came from. */
  readonly diverged: boolean;
  /** When it was last finished, for the "last done" line. */
  readonly lastCompletedAt: string | null;
  /**
   * A change the coach has published, waiting on this client's answer. The
   * copy does not move until they accept — nobody is updated silently.
   */
  readonly pendingUpdate: ApiRoutineUpdate | null;
  /**
   * The first few lifts, so a routine can be chosen without opening it. The
   * card is the only view of a routine a client sees before starting one.
   */
  readonly preview: readonly ApiRoutinePreviewRow[];
}

/* ------------------------------------------------------------------ *
 * Routine instances. Assigning a coach's routine COPIES it: each
 * client holds their own, which both sides may edit. That is what
 * makes "change it for one client only" expressible, and what lets a
 * client's edit reach their coach without touching anyone else's.
 *
 * A routine the client built themselves is an instance too, with no
 * template behind it — one model, so one editor and one set of
 * endpoints serve both. See the Copy on Assign plan.
 * ------------------------------------------------------------------ */

/** A change the coach has proposed to everyone holding a routine. */
export interface ApiRoutineUpdate {
  readonly templateVersion: number;
  readonly proposedAt: string;
  /** What changed, in words — "Cable fly → Cable lateral raise, 3 × 15". */
  readonly summary: string;
  readonly blocks: readonly ApiProgramBlock[];
}

export interface ApiRoutineInstance {
  readonly id: string;
  /** The coach template this was copied from; `null` for the client's own. */
  readonly templateId: string | null;
  readonly clientId: string;
  readonly name: string;
  readonly note: string | null;
  readonly blocks: readonly ApiProgramBlock[];
  /**
   * The template revision copied. Without it neither `diverged` nor "behind
   * the template" can be computed — only guessed. `null` for a client's own.
   */
  /**
   * Place in the program's rotation. Ordering only — it never means "do this
   * on Tuesday", because nothing here is scheduled to a day.
   */
  readonly orderIndex: number;
  /**
   * When this routine was last finished, or `null` if never. Whichever the
   * client has gone longest without doing is the one suggested next, which is
   * what makes the rotation self-correcting: do them out of order and it still
   * points at what has been neglected.
   */
  readonly lastCompletedAt: string | null;
  readonly baseVersion: number | null;
  /**
   * True once either side edited after assignment. It does **not** decide
   * whether a publish asks — everyone is asked — it tells the coach who has
   * work of their own at stake.
   */
  readonly diverged: boolean;
  /**
   * A coach's proposed update, awaiting this client's decision. Nothing is
   * ever applied silently, so the copy stays as it is until they accept.
   * Always `null` until the publish-as-proposal work lands.
   */
  readonly pendingUpdate: ApiRoutineUpdate | null;
}


/**
 * The Train tab. No "next up": every routine carries the same card and the
 * client picks one, rather than the app promoting one of them and burying the
 * rest in a list. The coach's assignment still leads — see the ordering in
 * `mockTrainOverview` and the `Active` chip.
 */
/** Training done against the target, for the week so far. Never a schedule. */
export interface ApiWeeklyProgress {
  readonly done: number;
  readonly target: number;
}

export interface ApiTrainOverview {
  readonly routines: readonly ApiRoutine[];
  readonly week: ApiWeeklyProgress;
}

export interface ApiSessionSet {
  readonly n: number;
  readonly weightKg: number;
  readonly reps: number;
  readonly completed: boolean;
}

export interface ApiSessionExercise {
  /**
   * Which catalogue entry this came from, for the preview. `null` for an
   * exercise somebody typed, and for anything logged before the link existed
   * — the name is then the only handle there is.
   */
  readonly exerciseId?: string | null;
  readonly id: string;
  readonly name: string;
  /**
   * The coach's cue on this lift. Read-only to the client: it is an
   * instruction from the person coaching them, not a field on their form.
   */
  readonly coachNote: string | null;
  /**
   * The client's own reminder. Theirs to write, edit and clear, and kept
   * apart from `coachNote` so writing one never overwrites the other.
   */
  readonly ownNote: string | null;
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

/**
 * The six switches, as the client's Permissions screen needs them.
 *
 * Read off the live link rather than out of `ApiClientProfile`, which carries
 * a rendered "3 of 5" and the rows of a settings list — presentation, with no
 * way back to the booleans it was built from.
 */
export interface ApiSharePermissionsDetail {
  /** `null` with no coach attached, which is also when the screen has nothing to say. */
  readonly coachName: string | null;
  readonly permissions: ApiSharePermissions;
  /** Whether the coach may write in the client's name. The sixth permission. */
  readonly logFor: boolean;
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

export interface ApiNotificationSettingsRow {
  readonly id: string;
  readonly label: string;
  readonly desc: string;
  readonly enabled: boolean;
}

export interface ApiNotificationSettingsGroup {
  readonly id: string;
  readonly title: string;
  readonly note: string;
  readonly rows: readonly ApiNotificationSettingsRow[];
}

export interface ApiNotificationSettings {
  readonly groups: readonly ApiNotificationSettingsGroup[];
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

export interface ApiRoster {
  readonly clients: readonly ApiRosterClient[];
  readonly labels: readonly ApiRosterLabel[];
}

/* ------------------------------------------------------------------ *
 * The exercise catalogue.
 *
 * Imported from WorkoutX into `public.exercises` and read from there,
 * so the picker answers instantly and answers offline — see the
 * migration for why it is a copy rather than a proxy.
 * ------------------------------------------------------------------ */

/** One chip in the picker's filter rows, with how many exercises it holds. */
export interface ApiExerciseFilterOption {
  readonly kind: 'body_part' | 'equipment';
  readonly value: string;
  readonly label: string;
  readonly count: number;
}

export interface ApiExercisePreview {
  readonly id: string;
  readonly name: string;
  /**
   * The stored animation. `null` until somebody opens this exercise for the
   * first time — WorkoutX serves GIFs from an authenticated endpoint, so one
   * is fetched server-side and kept rather than loaded from the phone.
   */
  readonly gifUrl: string | null;
  /** The catalogue id, when this came from one. `null` means nothing to fetch. */
  readonly externalId: string | null;
  readonly bodyPart: string | null;
  readonly target: string | null;
  readonly equipment: string | null;
  readonly secondaryMuscles: readonly string[];
  /** Step by step. Empty for an exercise somebody invented. */
  readonly instructions: readonly string[];
  readonly difficulty: string | null;
}

/* ------------------------------------------------------------------ *
 * Notifications — one feed, both sides of the app.
 *
 * An activity update *is* a notification: a coach seeing "Maya
 * finished Upper A" and a client seeing "Sam assigned you Upper A"
 * are the same kind of event read from opposite ends. They were two
 * screens with two shapes and two names, which is how a bell ended up
 * opening a settings form.
 *
 * Distinct from `ApiNotificationSettings`, which is the switches that
 * decide which of these also reach the phone.
 * ------------------------------------------------------------------ */

export type NotificationKind =
  // Training. No 'session-missed': nothing in SetTrack is scheduled to a day, so
  // nothing can be missed — the coach's home derives "needs a look" from
  // silence instead, which is a state and not an event.
  | 'session-done'
  | 'routine-assigned'
  | 'routine-updated'
  // Check-ins
  | 'check-in'
  | 'check-in-reply'
  // Talking
  | 'message'
  // Access — the five that change what somebody can see
  | 'access-requested'
  | 'access-granted'
  | 'access-revoked'
  /** Asked, and told no. Nothing was taken away, because nothing was given. */
  | 'access-declined'
  | 'attached'
  | 'detached';

/**
 * Where tapping a notification goes.
 *
 * A union rather than a string, because "open this" has three genuinely
 * different meanings and the device has to know which it is being handed: a
 * screen is pushed, a web page opens inside SetTrack, an external link leaves for
 * the browser or another app. A bare string could only ever be one of them,
 * and the row would have to guess from its shape.
 *
 * It is also what a push notification taps into once push exists, so the
 * banner and the row reach the same place through the same code.
 */
export type ApiNotificationDestination =
  | { readonly kind: 'screen'; readonly route: string }
  /** Opened in-app, via `expo-web-browser`. For a help page or a receipt. */
  | { readonly kind: 'web'; readonly url: string }
  /** Handed to the OS — a calendar invite, a video call, a gym's booking app. */
  | { readonly kind: 'external'; readonly url: string };

/** Who a notification is about: a client for a coach, their coach for a client. */
export interface ApiNotificationPerson {
  readonly id: string;
  readonly name: string;
  readonly initials: string;
}

export interface ApiNotification {
  readonly id: string;
  readonly kind: NotificationKind;
  readonly title: string;
  readonly body: string;
  /** Pre-composed stamp: "2h" | "1d" | "1w". */
  readonly when: string;
  readonly unread: boolean;
  /**
   * The person it concerns, drawn as an avatar. `null` for a notification
   * about nobody — a row with a blank circle in it reads as a bug.
   */
  readonly person: ApiNotificationPerson | null;
  /**
   * Where tapping it goes. `null` for something that happened rather than
   * something to do, and also what a destination the device could not vouch
   * for becomes — see `parseDestination`.
   */
  readonly destination: ApiNotificationDestination | null;
}

export interface ApiNotificationGroup {
  readonly id: string;
  /** Already uppercase — "TODAY" | "EARLIER THIS WEEK". */
  readonly title: string;
  readonly items: readonly ApiNotification[];
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

export type BoardMetric =
  | 'volume'
  | 'sessions'
  | 'streak'
  | 'weight-lifted'
  | 'distance'
  | 'time'
  | 'prs'
  | 'consistency'
  | 'check-ins';

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

/* ------------------------------------------------------------------ *
 * A coach asking to see something.
 *
 * A question and nothing else — the only row that decides what a coach
 * can see is their permissions on the link, and the only person who
 * can move it is the client. See `request_access` in the migrations.
 * ------------------------------------------------------------------ */

export interface ApiAccessRequest {
  readonly id: string;
  readonly coachName: string;
  readonly domain: ShareDomain;
  /** "Nutrition" | "Health profile" — what the client sees on the card. */
  readonly title: string;
  /** What granting it would actually show them. */
  readonly body: string;
  /** Pre-composed stamp: "just now" | "2h" | "3d". */
  readonly when: string;
}

export interface ApiReviewDomainRow {
  readonly label: string;
  readonly value: string;
}

export interface ApiReviewDomain {
  /**
   * Everything shareable except `workouts`, which the review screen shows as
   * the sessions list and adherence bars rather than as a card of its own.
   * Derived from `ShareDomain` so a new domain cannot be added to one screen
   * and forgotten on the other.
   */
  readonly id: Exclude<ShareDomain, 'workouts'>;
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
  /**
   * Whether this client allowed the coach to write on their behalf — the
   * `log_for` switch. Read-only access is per domain; writing is this one
   * answer, so it sits on the review rather than on each card.
   */
  readonly canLogFor: boolean;
}

/* ------------------------------------------------------------------ *
 * The live session, from the coach's seat. Structurally a sibling of
 * `ApiClientSession` rather than the same type: the client's shape
 * carries `isPr` and is written back to, and this one is a read. A
 * coach watching a set land is not editing it.
 * ------------------------------------------------------------------ */

export interface ApiLiveSet {
  /** Needed now that a coach can change one — they have to name which. */
  readonly id: string;
  readonly n: number;
  readonly weightKg: number;
  readonly reps: number;
  readonly completed: boolean;
  /** True when the coach changed this one, so the client can see whose number it is. */
  readonly changedByCoach: boolean;
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
  /**
   * Whether this coach may change the load and reps on sets still to come —
   * the client's `log_for` switch. Known before anything is tapped, so the
   * screen shows what it can do rather than discovering a refusal.
   */
  readonly canEdit: boolean;
  /** Said on the screen itself, so what watching means is never a guess. */
  readonly notice: string;
}

/**
 * The coach's home screen: the gym floor, not a schedule.
 *
 * `needsALook` is deliberately only the exceptions — someone who finished
 * recently or has gone quiet. The full register is the roster, and a home
 * screen that listed everybody would be a second copy of it.
 */
export interface ApiCoachHome {
  readonly training: readonly ApiLiveClient[];
  readonly needsALook: readonly ApiRosterClient[];
  readonly rosterCount: number;
}

/** One client mid-workout, for the coach's home screen. */
export interface ApiLiveClient {
  readonly clientId: string;
  readonly name: string;
  readonly initials: string;
  /** e.g. "Upper A · 18 min in" */
  readonly meta: string;
  /** e.g. "6 of 14 sets" */
  readonly progress: string;
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
  /** Derived from the roster, never authored — e.g. "Strength coach · Berlin · 17 clients". */
  readonly headline: string;
  readonly inviteCode: string;
  readonly notifications: readonly ApiCoachNotification[];
  readonly groups: readonly ApiSettingsGroup[];
}

/**
 * The same profile as the coach edits it.
 *
 * `ApiCoachProfile` above is what the settings screen renders — a headline
 * already written, rows already composed — and none of it can be edited back
 * into the fields it came from. These are those fields.
 */
export interface ApiCoachProfileForm {
  readonly name: string;
  readonly gym: string;
  readonly bio: string;
  readonly specialties: readonly string[];
}
