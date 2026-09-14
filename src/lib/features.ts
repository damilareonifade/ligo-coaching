/**
 * Which features this build actually has.
 *
 * Not entitlement, and not a per-user setting — this is "does this part of the
 * app exist yet". Ligo is being built domain by domain against a real backend,
 * and a tab that opens onto an error is worse than a tab that is not there.
 *
 * A flag being off removes the feature everywhere at once: its tab, and every
 * card on another screen that reads from it. That is the whole point of having
 * one name for it rather than an `if` in each place — Today's macros card and
 * the Food tab are the same feature, and they should never disagree about
 * whether it exists.
 *
 * Set through `EXPO_PUBLIC_FEATURE_*` in .env, so a build can turn one on
 * without a code change and a preview build can differ from production.
 */
export const FEATURES = [
  /** The training loop: routines, workouts, the Train tab. */
  'train',
  /** Food logging, the Food tab, and Today's calories and protein. */
  'food',
  /** Body metrics, volume and PRs — the Progress tab. */
  'progress',
  /** Client ↔ coach threads, and the coach's Messages tab. */
  'messaging',
  /** Groups and leaderboards. */
  'community',
  /** Monthly check-ins. */
  'checkIns',
  /**
   * Push notifications and the preferences that choose them. `expo-
   * notifications` is installed and configured, but nothing sends one — a
   * switch that stores a preference nothing acts on is a switch that lies.
   */
  'notifications',
  /**
   * Apple Health, Garmin, Whoop, Strava. The screen and its shapes are built;
   * no SDK is installed and no OAuth is configured, so there is nothing for a
   * "Connect" to connect to.
   */
  'integrations',
] as const;

export type Feature = (typeof FEATURES)[number];

/** `EXPO_PUBLIC_FEATURE_CHECK_INS` from `checkIns`. */
function envVarName(feature: Feature): string {
  const screaming = feature.replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase();
  return `EXPO_PUBLIC_FEATURE_${screaming}`;
}

/**
 * Read eagerly rather than lazily, because Expo inlines `process.env.EXPO_*`
 * at build time by literal match — `process.env[name]` would not be replaced
 * and would come back undefined on a device. The explicit map below is what
 * makes them real.
 */
const RAW: Readonly<Record<Feature, string | undefined>> = {
  train: process.env.EXPO_PUBLIC_FEATURE_TRAIN,
  food: process.env.EXPO_PUBLIC_FEATURE_FOOD,
  progress: process.env.EXPO_PUBLIC_FEATURE_PROGRESS,
  messaging: process.env.EXPO_PUBLIC_FEATURE_MESSAGING,
  community: process.env.EXPO_PUBLIC_FEATURE_COMMUNITY,
  checkIns: process.env.EXPO_PUBLIC_FEATURE_CHECK_INS,
  notifications: process.env.EXPO_PUBLIC_FEATURE_NOTIFICATIONS,
  integrations: process.env.EXPO_PUBLIC_FEATURE_INTEGRATIONS,
};

/**
 * Off unless explicitly turned on.
 *
 * Defaulting to off is deliberate: a feature nobody has enabled is one nobody
 * has finished, and the failure mode of the other default is shipping a broken
 * screen because a variable was forgotten.
 */
function read(feature: Feature): boolean {
  return RAW[feature] === 'true';
}

export const features: Readonly<Record<Feature, boolean>> = Object.fromEntries(
  FEATURES.map((feature) => [feature, read(feature)]),
) as Record<Feature, boolean>;

/**
 * Whether a feature is available in this build.
 *
 * A plain function, not a hook: nothing about it changes while the app is
 * running, and making it a hook would invite components to re-render on
 * something that is a constant.
 */
export function hasFeature(feature: Feature): boolean {
  return features[feature];
}

/** For error messages and the env-var name in a warning. */
export function featureEnvVar(feature: Feature): string {
  return envVarName(feature);
}
