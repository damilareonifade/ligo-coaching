import { create } from 'zustand';

import { onboardingUnitFor } from '@/lib/onboarding';
import type {
  ApiCoachSummary,
  ApiSharePermissions,
  ShareDomain,
  UserRole,
} from '@/api/types';

interface OnboardingState {
  readonly role: UserRole | null;
  readonly name: string;
  readonly email: string;
  readonly goals: readonly string[];
  readonly experience: string;
  readonly units: string;
  readonly sessionsPerWeek: number;
  readonly inviteCode: string;
  readonly lookedUpCoach: ApiCoachSummary | null;
  readonly permissions: ApiSharePermissions;
  readonly logFor: boolean;
  readonly coachBio: string;
  readonly coachGym: string;
  readonly specialties: readonly string[];

  readonly setRole: (role: UserRole) => void;
  readonly setDetails: (details: { name: string; email: string }) => void;
  readonly toggleGoal: (label: string) => void;
  readonly setExperience: (experience: string) => void;
  readonly setUnits: (units: string) => void;
  readonly setSessionsPerWeek: (sessionsPerWeek: number) => void;
  readonly setInviteCode: (inviteCode: string) => void;
  readonly setLookedUpCoach: (coach: ApiCoachSummary | null) => void;
  readonly togglePermission: (key: ShareDomain) => void;
  readonly toggleLogFor: () => void;
  readonly setCoachProfile: (profile: { bio: string; gym: string }) => void;
  readonly toggleSpecialty: (label: string) => void;
  readonly reset: () => void;
}

function toggleInList(list: readonly string[], label: string): readonly string[] {
  return list.includes(label) ? list.filter((item) => item !== label) : [...list, label];
}

const defaults = {
  role: null as UserRole | null,
  name: '',
  email: '',
  goals: ['Strength', 'Muscle'] as readonly string[],
  experience: '1–3 yrs',
  units: onboardingUnitFor('kg') as string,
  sessionsPerWeek: 4,
  inviteCode: '',
  lookedUpCoach: null as ApiCoachSummary | null,
  // Everything off until the client turns it on, which is what the screen
  // promises in those words.
  permissions: {
    workouts: false,
    nutrition: false,
    metrics: false,
    health: false,
    monthly: false,
  } as ApiSharePermissions,
  logFor: false,
  coachBio: '',
  coachGym: '',
  specialties: ['Strength', 'Hypertrophy'] as readonly string[],
};

/**
 * Transient wizard state for the signup/onboarding flow — spans many screens,
 * so it lives in Zustand per CLAUDE.md's "shared across 2+ screens" rule, but
 * is deliberately NOT persisted: it's a draft, not data that should survive
 * an app restart. Call `reset()` whenever a flow completes or is abandoned.
 */
export const useOnboardingStore = create<OnboardingState>((set) => ({
  ...defaults,

  setRole: (role) => set({ role }),
  setDetails: ({ name, email }) => set({ name, email }),
  toggleGoal: (label) => set((state) => ({ goals: toggleInList(state.goals, label) })),
  setExperience: (experience) => set({ experience }),
  setUnits: (units) => set({ units }),
  setSessionsPerWeek: (sessionsPerWeek) => set({ sessionsPerWeek }),
  setInviteCode: (inviteCode) => set({ inviteCode }),
  setLookedUpCoach: (lookedUpCoach) => set({ lookedUpCoach }),
  togglePermission: (key) =>
    set((state) => ({ permissions: { ...state.permissions, [key]: !state.permissions[key] } })),
  toggleLogFor: () => set((state) => ({ logFor: !state.logFor })),
  setCoachProfile: ({ bio, gym }) => set({ coachBio: bio, coachGym: gym }),
  toggleSpecialty: (label) =>
    set((state) => ({ specialties: toggleInList(state.specialties, label) })),
  reset: () => set({ ...defaults }),
}));
