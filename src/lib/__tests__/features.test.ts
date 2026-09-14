import { FEATURES, featureEnvVar, features, hasFeature } from '@/lib/features';

/**
 * A flag is what stands between a half-built domain and a tab that opens onto
 * an error, so the thing worth pinning is the default: anything not explicitly
 * turned on is off. The other default ships a broken screen the first time
 * somebody forgets a variable.
 */
describe('feature flags', () => {
  it('reads every flag as a boolean, with no room for "maybe"', () => {
    for (const feature of FEATURES) {
      expect(typeof features[feature]).toBe('boolean');
      expect(hasFeature(feature)).toBe(features[feature]);
    }
  });

  it('has training on and the unbuilt domains off', () => {
    // This is the state of the app, and it changes as domains land. A failure
    // here means a flag moved — check that the feature really is finished.
    expect(hasFeature('train')).toBe(true);
    expect(hasFeature('food')).toBe(false);
    expect(hasFeature('progress')).toBe(true);
    expect(hasFeature('messaging')).toBe(false);
    expect(hasFeature('community')).toBe(false);
    expect(hasFeature('checkIns')).toBe(true);
    expect(hasFeature('notifications')).toBe(false);
    expect(hasFeature('integrations')).toBe(false);
  });

  it('names the variable that controls each one, camelCase included', () => {
    expect(featureEnvVar('food')).toBe('EXPO_PUBLIC_FEATURE_FOOD');
    expect(featureEnvVar('checkIns')).toBe('EXPO_PUBLIC_FEATURE_CHECK_INS');
  });
});
