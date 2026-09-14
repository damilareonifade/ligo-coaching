import { SHARE_DOMAINS } from '@/api/types';
import type { ApiSettingsGroup, ApiSettingsRow, ApiSharePermissions } from '@/api/types';
import { hasFeature } from '@/lib/features';
import { unitsSummary, type LengthUnit, type WeightUnit } from '@/lib/units';

/* ------------------------------------------------------------------ *
 * The client's settings screen.
 *
 * Almost all of this is chrome — labels, descriptions and the routes
 * they open — which was being fetched from the server because the mock
 * happened to serve it. Navigation structure is not data: a round trip
 * for it means the screen cannot render offline, and a copy change
 * becomes a deploy. It is composed here instead, from the handful of
 * values that genuinely come from the database.
 * ------------------------------------------------------------------ */

/** "3 of 5" — how much of themselves the client has shared. */
export function permissionSummary(permissions: ApiSharePermissions): string {
  const granted = SHARE_DOMAINS.filter((domain) => permissions[domain]).length;
  return `${granted} of ${SHARE_DOMAINS.length}`;
}

/**
 * The rows under the coach card. Empty without a coach, and deliberately so:
 * permissions, check-in sharing and "detach" are each about somebody, and
 * there is nobody to point them at.
 */
export function buildCoachRows(
  coachName: string | null,
  permissions: ApiSharePermissions,
): readonly ApiSettingsRow[] {
  if (!coachName) return [];

  const firstName = coachName.split(' ')[0];

  return [
    {
      id: 'permissions',
      label: 'Permissions',
      desc: `What ${firstName} can see and log`,
      value: permissionSummary(permissions),
      // Not `/onboarding/coach-permissions`: that screen reads the onboarding
      // draft and bounces anyone already attached to the "find a coach" step.
      route: '/profile/permissions',
    },
    // A door to a feature that is off is still a door. Gated for the same
    // reason the tab bar is — see src/lib/features.ts.
    ...(hasFeature('checkIns')
      ? [
          {
            id: 'check-ins',
            label: 'Monthly check-ins',
            desc: 'Shared reviews and measurements',
            route: '/check-ins',
          },
        ]
      : []),
    {
      id: 'detach',
      label: 'Detach coach',
      desc: 'Ends access immediately. Your data stays.',
      danger: true,
    },
  ];
}

export interface ProfileGroupInput {
  /**
   * From the settings store, which is where units actually live.
   *
   * Both, because they are chosen separately now — `onboardingUnitFor` paired
   * them ("lb" implied "in"), which was fine when one switch set both and is
   * wrong once the Units screen offers two.
   */
  readonly unit: WeightUnit;
  readonly lengthUnit: LengthUnit;
}

/**
 * The settings cards.
 *
 * A row here either goes somewhere or is not here. The list used to carry
 * stubs — Rest timer, Plates, Targets, Meal reminders — on the reasoning that
 * hiding them would make the profile differ by what had shipped. It does
 * differ by what has shipped; the flags are how that is said honestly. A row
 * that answers a tap with "Not connected yet" spends the one thing a settings
 * screen has, which is that tapping something does what it says.
 *
 * So: a feature that exists but is switched off is gated by its flag and
 * disappears whole. A feature nobody has started has no row at all.
 */
export function buildProfileGroups({
  unit,
  lengthUnit,
}: ProfileGroupInput): readonly ApiSettingsGroup[] {
  const units = unitsSummary(unit, lengthUnit);

  return [
    {
      id: 'training',
      title: 'TRAINING',
      rows: [
        // Rest timer and Plates were here. Neither exists anywhere in the app —
        // there is no timer between sets and no plate calculator — so they were
        // rows for features nobody had started.
        {
          id: 'units',
          label: 'Units',
          desc: 'Weight and measurements',
          value: units,
          route: '/profile/units',
        },
        {
          id: 'appearance',
          label: 'Appearance',
          desc: 'Light, dark, or follow your phone',
          route: '/profile/theme',
        },
      ],
    },
    // Both of these are nutrition, which is off. Gated rather than stubbed, so
    // the section leaves with the feature instead of lingering as two taps that
    // apologise. Meal reminders needs notifications too — a nudge nothing can
    // send is not a setting.
    ...(hasFeature('food')
      ? [
          {
            id: 'nutrition',
            title: 'NUTRITION',
            rows: [
              { id: 'targets', label: 'Targets', desc: 'Calories and macros' },
              ...(hasFeature('notifications')
                ? [{ id: 'meal-reminders', label: 'Meal reminders', desc: 'Nudges to log' }]
                : []),
            ],
          },
        ]
      : []),
    ...(hasFeature('community')
      ? [
          {
            id: 'community',
            title: 'COMMUNITY',
            rows: [
              {
                id: 'community',
                label: 'Groups & leaderboards',
                desc: 'Optional. Nothing is shared until you opt in.',
                route: '/community',
              },
            ],
          },
        ]
      : []),
    {
      id: 'account',
      title: 'ACCOUNT',
      rows: [
        {
          id: 'health',
          label: 'Health profile',
          desc: 'Injuries, conditions, medication',
          route: '/profile/health',
        },
        // "Notifications" is the feed the bell opens; this is the switches
        // that decide which of them reach the phone, which is why it is named
        // apart. Gated because nothing sends one yet — it was the last door
        // left open onto the unbuilt half, while the coach's card and Meal
        // reminders were already behind the same flag.
        ...(hasFeature('notifications')
          ? [
              {
                id: 'notifications',
                label: 'Notification settings',
                desc: 'What buzzes and when',
                route: '/profile/notifications',
              },
            ]
          : []),
        ...(hasFeature('integrations')
          ? [
              {
                id: 'integrations',
                label: 'Integrations',
                desc: 'Connected apps and devices',
                route: '/profile/integrations',
              },
            ]
          : []),
        {
          id: 'data',
          label: 'Data & privacy',
          desc: 'Export, import, delete',
          route: '/profile/data',
        },
      ],
    },
    {
      id: 'support',
      title: 'SUPPORT',
      rows: [
        { id: 'help', label: 'Help centre', desc: 'Guides and answers' },
        { id: 'sign-out', label: 'Sign out', desc: '', danger: true },
      ],
    },
  ];
}

/** "since Mar 2025", from the account's creation date. */
export function memberSinceLabel(createdAt: string): string {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return '';
  return `since ${date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}`;
}
