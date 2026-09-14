import { renderHook } from '@testing-library/react-native';

import { useFinishOnboarding } from '@/hooks/useFinishOnboarding';
import { useAuthStore } from '@/store/authStore';
import { useOnboardingStore } from '@/store/onboardingStore';
import { useSettingsStore } from '@/store/settingsStore';

const mockSaveCoachProfile = jest.fn(async (_input: unknown) => undefined);
const mockSaveClientProfile = jest.fn(async (_input: unknown) => undefined);
const mockMarkOnboarded = jest.fn(async () => undefined);

jest.mock('@/api/onboarding', () => ({
  saveCoachProfile: (input: unknown) => mockSaveCoachProfile(input),
  saveClientProfile: (input: unknown) => mockSaveClientProfile(input),
}));

jest.mock('@/api/users', () => ({
  markOnboarded: () => mockMarkOnboarded(),
}));

beforeEach(() => {
  mockSaveCoachProfile.mockClear();
  mockSaveClientProfile.mockClear();
  mockMarkOnboarded.mockClear();
  useOnboardingStore.getState().reset();
  useSettingsStore.setState({ unit: 'kg' });
  useAuthStore.setState({ needsOnboarding: true });
});

// `renderHook`, like `render`, is async in @testing-library/react-native v14.
async function finish() {
  const { result } = await renderHook(() => useFinishOnboarding());
  result.current();
}

/**
 * Onboarding collected seven answers across five screens and stored none of
 * them: every step wrote to a draft, and this hook called `reset()` on it.
 * These pin the answers surviving the flow, and the gate coming down.
 */
describe('useFinishOnboarding', () => {
  it("saves a coach's profile, which is what clients see before attaching", async () => {
    useOnboardingStore.setState({
      role: 'coach',
      coachGym: 'Ironworks Lagos',
      coachBio: 'Barbell strength.',
      specialties: ['Strength'],
    });

    await finish();

    expect(mockSaveCoachProfile).toHaveBeenCalledWith({
      gym: 'Ironworks Lagos',
      bio: 'Barbell strength.',
      specialties: ['Strength'],
    });
    expect(mockSaveClientProfile).not.toHaveBeenCalled();
  });

  it("saves a client's goals and the frequency they are measured against", async () => {
    useOnboardingStore.setState({
      role: 'client',
      goals: ['Strength', 'Mobility'],
      experience: '3+ yrs',
      sessionsPerWeek: 5,
    });

    await finish();

    expect(mockSaveClientProfile).toHaveBeenCalledWith({
      goals: ['Strength', 'Mobility'],
      experience: '3+ yrs',
      sessionsPerWeek: 5,
    });
    expect(mockSaveCoachProfile).not.toHaveBeenCalled();
  });

  it('sends the unit choice to the store the app actually formats from', async () => {
    useOnboardingStore.setState({ role: 'client', units: 'lb · in' });
    await finish();
    expect(useSettingsStore.getState().unit).toBe('lb');
  });

  it('leaves a coach out of the client-only unit question', async () => {
    useSettingsStore.setState({ unit: 'lb' });
    useOnboardingStore.setState({ role: 'coach', units: 'kg · cm' });
    await finish();
    expect(useSettingsStore.getState().unit).toBe('lb');
  });

  it('lowers the gate, so the tabs stop redirecting back into the flow', async () => {
    useOnboardingStore.setState({ role: 'client' });
    await finish();

    expect(mockMarkOnboarded).toHaveBeenCalled();
    expect(useAuthStore.getState().needsOnboarding).toBe(false);
    expect(useSettingsStore.getState().hasOnboarded).toBe(true);
  });

  it('clears the draft, so a second signup on this device starts empty', async () => {
    useOnboardingStore.setState({ role: 'coach', coachGym: 'Ironworks Lagos' });
    await finish();
    expect(useOnboardingStore.getState().coachGym).toBe('');
    expect(useOnboardingStore.getState().role).toBeNull();
  });
});
