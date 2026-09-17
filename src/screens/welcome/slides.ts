import type { UserRole } from '@/api/types';

/**
 * The welcome carousel's content.
 *
 * Two tracks, four slides each. The track is the question every visitor to
 * this screen is already answering in their head — am I here to train, or to
 * coach — and the app has two halves, so the pitch does too. It is not a
 * setting: nothing is saved until the person taps Create an account, and all
 * it does before then is decide which four things get said.
 *
 * The four backdrops are shared by both tracks. They are the room; the track
 * is what is said in it.
 */

export type WelcomeTrack = UserRole;

/** A row of the miniature app screen shown on each slide. */
export interface WelcomeMockRow {
  readonly label: string;
  readonly value: string;
  /** `done` is a filled accent dot — a set logged, a client checked in. */
  readonly state: 'done' | 'pending';
}

export interface WelcomeMock {
  readonly title: string;
  readonly chip: string;
  readonly rows: readonly WelcomeMockRow[];
  /** Seven bars, as fractions of the plot height. The tallest is accented. */
  readonly bars: readonly number[];
  /** Three tab labels; the first is the selected one. */
  readonly tabs: readonly [string, string, string];
}

export interface WelcomeSlide {
  readonly kicker: string;
  readonly headline: string;
  readonly body: string;
  readonly mock: WelcomeMock;
}

/**
 * Where a slide's light comes from, in fractions of the field.
 *
 * The design fills these four layers with photography — someone mid-set, a
 * lifter between sets, a group training, a coach cueing — and the slots are
 * still empty in it, so there is nothing to import. Until there is, each
 * slide gets its own geometry rather than its own hue: the glow moves, the
 * palette does not. Four violets would be four brand colours on one screen,
 * which is one of the few things the palette rules forbid outright.
 *
 * It moves sideways only. Every glow hangs at the top of the field, above the
 * wordmark, and the foot of every slide stays unlit — the bottom of this
 * screen is where the account buttons are, and a violet wash behind them
 * competed with the one thing on the screen that is meant to be pressed.
 *
 * Adding the photography later is a `source` on `WelcomeSlideBackdrop` and no
 * other change — the scrim above it is already what makes the type legible.
 */
export interface WelcomeBackdrop {
  /** 0 is the left edge, 1 the right. */
  readonly originX: number;
  /** Kept small: the glow belongs to the top of the field. */
  readonly originY: number;
  readonly radiusX: number;
  readonly radiusY: number;
}

/**
 * Left, middle, right, middle — so no two slides in the run share a position,
 * the wrap from the fourth back to the first included, and the two middles
 * differ in spread rather than repeating.
 */
export const WELCOME_BACKDROPS: readonly WelcomeBackdrop[] = [
  { originX: 0.16, originY: 0.12, radiusX: 0.72, radiusY: 0.34 },
  { originX: 0.5, originY: 0.06, radiusX: 0.88, radiusY: 0.3 },
  { originX: 0.84, originY: 0.12, radiusX: 0.72, radiusY: 0.34 },
  { originX: 0.5, originY: 0.16, radiusX: 0.6, radiusY: 0.38 },
];

const clientSlides: readonly WelcomeSlide[] = [
  {
    kicker: "Today's session",
    headline: 'Every set, where you left it.',
    body: "Open the app and the next lift is already loaded — the weight, the reps, and what you did last week.",
    mock: {
      title: 'Push day A',
      chip: 'Week 3',
      rows: [
        { label: 'Bench press', value: '80 × 5', state: 'done' },
        { label: 'Incline press', value: '30 × 8', state: 'done' },
        { label: 'Cable fly', value: '20 × 12', state: 'pending' },
        { label: 'Triceps rope', value: '25 × 12', state: 'pending' },
      ],
      bars: [0.42, 0.55, 0.48, 0.66, 0.6, 0.78, 1],
      tabs: ['Today', 'Train', 'Progress'],
    },
  },
  {
    kicker: 'Progress',
    headline: "Proof you're getting stronger.",
    body: 'Volume, personal bests and body weight, plotted from the sets you actually logged rather than the ones you remember.',
    mock: {
      title: 'Progress',
      chip: '12 weeks',
      rows: [
        { label: 'Bench press', value: '+12 kg', state: 'done' },
        { label: 'Back squat', value: '+20 kg', state: 'done' },
        { label: 'Weekly volume', value: '18.4 t', state: 'done' },
        { label: 'Body weight', value: '78.2 kg', state: 'pending' },
      ],
      bars: [0.3, 0.44, 0.4, 0.58, 0.72, 0.68, 1],
      tabs: ['Progress', 'Lifts', 'Body'],
    },
  },
  {
    kicker: 'Your coach',
    headline: 'A cue the moment it matters.',
    body: 'Form notes, check-ins and answers land in one thread — so being guided never depends on being in the same room.',
    mock: {
      title: 'Nadia · coach',
      chip: '2 new',
      rows: [
        { label: 'Squat depth cue', value: 'Mon', state: 'done' },
        { label: 'Week 3 check-in', value: 'Wed', state: 'done' },
        { label: 'Deload next week?', value: 'Thu', state: 'pending' },
        { label: 'Video reviewed', value: 'Fri', state: 'pending' },
      ],
      bars: [0.5, 0.36, 0.62, 0.45, 0.8, 0.58, 1],
      tabs: ['Thread', 'Check-ins', 'Plan'],
    },
  },
  {
    kicker: 'On your terms',
    headline: 'No coach required. Ever.',
    body: 'Train on your own for as long as you like. Attach a coach in seconds if you want one, and remove them just as fast.',
    mock: {
      title: 'My routines',
      chip: 'Solo',
      rows: [
        { label: 'Upper / lower', value: '4 days', state: 'done' },
        { label: 'Full body', value: '3 days', state: 'done' },
        { label: 'Coach', value: 'None', state: 'pending' },
        { label: 'Shared with', value: 'Nobody', state: 'pending' },
      ],
      bars: [0.46, 0.6, 0.52, 0.7, 0.64, 0.86, 1],
      tabs: ['Routines', 'Food', 'Profile'],
    },
  },
];

const coachSlides: readonly WelcomeSlide[] = [
  {
    kicker: 'Your roster',
    headline: 'The whole gym, on one screen.',
    body: 'Who trained, who slipped, who needs a message — answered before your first client walks in.',
    mock: {
      title: 'Roster',
      chip: '18 active',
      rows: [
        { label: 'Amara O.', value: 'On plan', state: 'done' },
        { label: 'Tom R.', value: 'On plan', state: 'done' },
        { label: 'Lena K.', value: '3d idle', state: 'pending' },
        { label: 'Sam B.', value: '6d idle', state: 'pending' },
      ],
      bars: [0.55, 0.62, 0.5, 0.74, 0.68, 0.82, 1],
      tabs: ['Roster', 'Programs', 'Messages'],
    },
  },
  {
    kicker: 'Program builder',
    headline: 'Build it once, assign it twenty times.',
    body: "A template becomes each client's own copy, so editing theirs never touches yours — or anyone else's.",
    mock: {
      title: 'Hypertrophy 8wk',
      chip: 'Template',
      rows: [
        { label: 'Week 1 · push', value: '6 lifts', state: 'done' },
        { label: 'Week 1 · pull', value: '6 lifts', state: 'done' },
        { label: 'Week 1 · legs', value: '5 lifts', state: 'pending' },
        { label: 'Assigned to', value: '12', state: 'done' },
      ],
      bars: [0.34, 0.5, 0.46, 0.64, 0.7, 0.76, 1],
      tabs: ['Programs', 'Library', 'Assign'],
    },
  },
  {
    kicker: 'Live sessions',
    headline: 'Watch a set land in real time.',
    body: 'Follow a session as it is logged and send the cue while the bar is still in their hands.',
    mock: {
      title: 'Amara · live',
      chip: '24:08',
      rows: [
        { label: 'Back squat', value: '100 × 5', state: 'done' },
        { label: 'Back squat', value: '100 × 5', state: 'done' },
        { label: 'Back squat', value: '100 × 4', state: 'pending' },
        { label: 'RPE', value: '8.5', state: 'pending' },
      ],
      bars: [0.6, 0.66, 0.58, 0.72, 0.8, 0.88, 1],
      tabs: ['Live', 'History', 'Notes'],
    },
  },
  {
    kicker: 'Check-ins',
    headline: 'Nothing falls through.',
    body: 'Weekly check-ins, photos and notes collected in one place, in an order you can actually get through.',
    mock: {
      title: 'Check-ins',
      chip: 'Week 14',
      rows: [
        { label: 'Amara O.', value: 'Reviewed', state: 'done' },
        { label: 'Tom R.', value: 'Reviewed', state: 'done' },
        { label: 'Lena K.', value: 'Waiting', state: 'pending' },
        { label: 'Sam B.', value: 'Waiting', state: 'pending' },
      ],
      bars: [0.4, 0.52, 0.6, 0.55, 0.74, 0.7, 1],
      tabs: ['Check-ins', 'Roster', 'Inbox'],
    },
  },
];

export const WELCOME_SLIDES: Readonly<Record<WelcomeTrack, readonly WelcomeSlide[]>> = {
  client: clientSlides,
  coach: coachSlides,
};

export interface WelcomeTrackOption {
  readonly value: WelcomeTrack;
  readonly label: string;
}

/** Client first: it is the larger audience and the one that needs nobody else. */
export const WELCOME_TRACKS: readonly WelcomeTrackOption[] = [
  { value: 'client', label: 'I train' },
  { value: 'coach', label: 'I coach' },
];

/**
 * `LISegmented` hands its `onChange` a plain string, because it is a control
 * over arbitrary options and has no way to know this one only ever carries
 * two. Narrowing it here rather than casting at the call site: a cast would
 * still be a lie if a third option were ever added, and this is total.
 */
export function toWelcomeTrack(value: string): WelcomeTrack {
  return value === 'coach' ? 'coach' : 'client';
}

export const WELCOME_SLIDE_COUNT = WELCOME_BACKDROPS.length;

/**
 * What comes after the slide you are on — the same answer however you got
 * there, whether the carousel moved itself on or somebody swiped.
 *
 * It wraps in both directions. The run of slides has no end to arrive at:
 * these are four things worth knowing about the app, not four steps through
 * a form, and somebody who reaches the last one and keeps going is still
 * looking rather than finished.
 */
export function nextSlideIndex(current: number, delta: number): number {
  return (current + delta + WELCOME_SLIDE_COUNT) % WELCOME_SLIDE_COUNT;
}
