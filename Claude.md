@AGENTS.md
# Claude AI – React Native (Expo) Guidelines

## Project

## ligo — Ligo is a coaching companion for gyms, built to help gym coaches run a better day. Coaches build and assign programs, track every student's sessions, log progress, send form cues and feedback, and keep their whole roster on plan — all from their phone, so guiding a student never depends on being in the same room.

## Slogan

Coach. Guide. Progress.

## Stack

Versions below are what is installed — check `package.json` before assuming.

- React Native 0.86 + Expo SDK 57 (managed workflow, EAS Build)
- Expo Router 57 (file-based routing, typed routes, `Stack.Protected` auth gating)
- React 19.2, TypeScript 6 (strict, no `any`)
- NativeWind 4 + **Tailwind CSS 3.4** (NativeWind 4 does not support Tailwind 4 — do not upgrade Tailwind)
- UI primitives hand-rolled in `src/components/ui/` on RN + NativeWind + `class-variance-authority`,
  following the shadcn / react-native-reusables pattern
- API calls: TanStack Query v5 — mutations with optimistic updates for logging sets
- Forms: `react-hook-form` + **Zod 4** (`z.email()`, `z.url()` — not `z.string().email()`)
- State: Zustand 5 (`persist` via `react-native-mmkv` v4)
- Storage: `expo-secure-store` (tokens/session), `react-native-mmkv` (non-sensitive cache)
- Lists: `@shopify/flash-list` v2 (never `FlatList` for long rosters/session logs)
- Animation: `react-native-reanimated` 4 + `react-native-worklets` + `react-native-gesture-handler`
- Icons: `lucide-react-native`; SVG via `react-native-svg`
- Images: `expo-image` (never RN `Image`)
- Charts: `victory-native` 42 (Skia) via `LIChart`
- Bottom sheets / modals: `@gorhom/bottom-sheet` 5
- Notifications: `expo-notifications` (installed + configured; session reminders not wired up yet)
- Networking: axios instance in `src/api/client.ts`
- Tests: `jest-expo` + `@testing-library/react-native` v14 (**`render` is async — always `await` it**)
- Deployed via EAS Build + EAS Update (OTA)

## Structure

```
src/app/            ← routes & layouts (Expo Router: _layout.tsx, (auth)/, (tabs)/, student/[id].tsx)
src/components/     ← LI components (LIText, LIButton, LIInput, LISelect, LIModal, LIToast, LITable, LIChart, LIForm, LIFormItem, LIFormLabel, LIFormMessage, LIFormDescription…)
src/components/ui/  ← Base primitives (LICard, LIAvatar, LIBadge, LISkeleton, LIBottomSheet, LISafeArea…)
src/screens/        ← Screen-level sections (Login, Register, Roster, StudentDetail, ProgramBuilder, SessionLog, Dashboard)
src/api/            ← axios client, endpoints, query keys, query/mutation hooks, mocks/
src/lib/            ← shared utilities, helpers, constants
src/hooks/          ← custom hooks
src/store/          ← Zustand stores, one file per domain
src/theme/          ← colors.js (single source of truth, read by tailwind.config.js), tokens, typography
```

## Commands

- Dev: `npx expo start`
- iOS: `npx expo run:ios`
- Android: `npx expo run:android`
- Lint: `npm run lint`  (alias for `expo lint`)
- Test: `npm test`
- Type check: `npx tsc --noEmit`
- Native health check: `npm run doctor`
- Bundle check: `npm run bundle:check` (full Metro bundle — catches what tsc cannot)
- Build: `eas build --profile preview --platform all`

## Verification

After every change, run in this order:

1. `npx tsc --noEmit` — fix type errors
2. `npm test` — fix failing tests
3. `npm run lint` — fix lint errors
4. `npx expo-doctor` — confirm native deps are aligned
5. `npm run bundle:check` — confirm Metro can actually bundle it

## Dependencies

Before adding any package, check in this order — never install silently:

1. **Expo SDK package** (`expo-*`) — check [expo.dev/packages](https://expo.dev/packages) first. If one exists, use it.
2. **Expo Go / managed-workflow compatible library** — no custom native build step required.
3. **Maintenance check** — reject anything not updated in 12+ months, deprecated, or archived.
4. **Neither fits** — stop and ask before proceeding.

Install Expo SDK packages with `npx expo install <pkg>` (pins the version to the SDK), everything
else with `npm install <pkg>`.

## Environments

Only one environment exists today — `src/lib/env.ts` defaults `apiUrl` to `https://api.ligo.app`
with `EXPO_PUBLIC_USE_MOCKS=true`, and there's no `eas.json` yet. Fill in this table once staging/
production backends and EAS build profiles exist:

| Env | `EXPO_PUBLIC_APP_ENV` | `EXPO_PUBLIC_API_URL` | EAS profile |
|-----|------------------------|------------------------|-------------|
| Development | `development` | mocks (`EXPO_PUBLIC_USE_MOCKS=true`) | — |
| Staging | `staging` | TBD | TBD |
| Production | `production` | TBD | TBD |

Only `EXPO_PUBLIC_*` vars are exposed to the client — never put secrets in them.

## Color Palette & Design Tokens

### Brand Colors

**Violet is the current brand palette — primary and accent.** Navy/Teal/Sky/Midnight/Light Teal/Gray
are legacy tokens (see **Legacy Palette** below); don't reach for them in new work.

| Name            | Hex       | Role                              | CSS Variable               | Tailwind Token   |
|------------------|-----------|------------------------------------|-----------------------------|------------------|
| Violet           | `#8B5CF6` | Primary — headers, icons, primary actions | `--color-violet`     | `violet`         |
| Violet Weak      | `#DFDBF3` | Soft tint — icon badges, chip/badge fill | `--color-violet-weak` | `violet-weak`    |
| Violet Line      | `#CDBFF3` | Border / ring on violet elements   | `--color-violet-line`       | `violet-line`    |
| Ink              | `#0A0A0A` | Heading text                       | `--color-ink`               | `ink`            |
| Dark Gray        | `#333333` | Body text                          | `--color-dark-gray`         | `dark-gray`      |
| Canvas           | `#ECEEF2` | Screen background                  | `--color-canvas`            | `canvas`         |
| White            | `#FFFFFF` | Card / section background          | `--color-white`             | `white`          |
| Field            | `#F0F2F6` | Unselected chip/segment/input fill | `--color-field`             | `field`          |
| Hairline         | `#E7E9EE` | Default border / divider           | `--color-hairline`          | `hairline`       |
| Hairline Strong  | `#D9DCE3` | Emphasized border                  | `--color-hairline-strong`   | `hairline-strong`|

### Color Usage Rules

- **Violet** is the dominant brand color — use for headers, icons, primary actions, and the accent
  moments that used to be Teal (highlights, completed sets, streaks, CTAs).
- **Never** use more than 3 brand colors on a single screen (Violet + a violet tint/border + a
  neutral is the normal shape).
- All colors must be referenced via NativeWind tokens or theme variables — no hardcoded hex values in components, and no raw hex in `StyleSheet`.
- Hex values live in exactly one file: `src/theme/colors.js`. `tailwind.config.js` requires it, and
  TS reads it through `src/theme/tokens.ts` (for Skia charts, navigation theme, icon `color` props).
- `danger` / `success` / `warning` are functional tokens for feedback states only, not brand colors.
- Third-party brand colors (the Google "G", etc.) are fixed by their owners and are the one
  exception — they live in `src/theme/brandLogos.ts`, never inline in a component.
- `LIButton`, `LIBadge`, `LIInput`, and `LIAvatar` all accept an optional `labelClassName` prop for
  overriding their inner text color without touching the shared defaults every other screen relies on.
- `LIText`'s inline link (`link`/`linkValue`/`linkHref`) is styled via a `linkColor` prop (raw hex,
  defaults to `tokens.violet`), **not** `className` — `expo-router`'s `Link` only applies `className`
  on web (confirmed from its source: `useInteropClassName` returns `props.style` unchanged whenever
  `Platform.OS !== 'web'`), so `className` on a `Link` silently no-ops on iOS/Android.

### Semantic Mapping

| Usage                     | Token          |
|---------------------------|----------------|
| Primary button bg         | `violet`       |
| Primary button pressed    | `navy` *(legacy — see below)* |
| Secondary accent bg       | `violet-weak`  |
| Secondary accent border   | `violet-line`  |
| Screen background         | `canvas`       |
| Card / section bg         | `white`        |
| Neutral surface / divider | `hairline`     |
| Unselected control fill   | `field`        |
| Badge / pill fill         | `violet-weak`  |
| Body text                 | `dark-gray`    |
| Heading text              | `ink`          |

### Legacy Palette

`navy` (`#0A3D62`), `teal` (`#48CAE4`), `sky` (`#EBF4FB`), `midnight` (`#0D1B2A`), `light-teal`
(`#E1F5EE`), and `gray` (`#F1EFE8`) remain defined in `src/theme/colors.js` for code not yet migrated
off them (most of the app, as of this palette switch — the dashboard/roster/login/student-detail
screens and the signup/onboarding flow are on Violet; everything else still renders Navy/Teal until
migrated). Don't use legacy tokens in new work, and don't mix a legacy token with a Violet-palette
token on the same screen. `gray` was a single flat neutral, not a scale — `bg-gray-100` never existed.
else.

## Data Fetching Rule (Critical)

**All API calls belong in the screen. Child components receive data as props.**

```tsx
// src/app/(tabs)/roster.tsx — fetch ONCE at the top
export default function RosterScreen() {
  const { data, isPending, isError, refetch } = useStudentsQuery();
  const students = data ?? [];

  if (isPending) return <RosterSkeleton />;
  if (isError) return <LIErrorState onRetry={refetch} />;

  return (
    <LISafeArea>
      <RosterStats students={students} />
      <RosterList students={students} />
    </LISafeArea>
  );
}

// src/screens/roster/RosterStats.tsx — pure display, no fetching
interface RosterStatsProps { readonly students: ApiStudent[]; }
export default function RosterStats({ students }: RosterStatsProps) { ... }
```

- One endpoint → one query hook → props flow down to all components that need it
- Never call a query hook inside a child component if the screen already has the data
- Query hooks live in `src/api/` and are named `use<Thing>Query` / `use<Thing>Mutation`
- Query keys are centralized in `src/api/queryKeys.ts` — never inline string arrays
- Loading state → skeleton rendered by the screen; Error state → `LIErrorState` with retry
- Unrecoverable render errors → every route re-exports one:
  `export { LIRouteError as ErrorBoundary } from '@/components/ui';`
- Set `EXPO_PUBLIC_USE_MOCKS=true` to run against `src/api/mocks/` with no backend. Every endpoint
  module branches on `env.useMocks`; nothing outside `src/api/` knows mocks exist.
- Child components handle only their **empty state** — loading/error belong at the screen level
- Pull-to-refresh wires to `refetch`, never to a manual re-fetch function

## Screen Composition Rule (Critical)

**Route files are dumb composers. All UI lives in components.**

```tsx
// src/app/(tabs)/index.tsx ← only this
export default function DashboardScreen() {
  return (
    <LISafeArea>
      <DashboardHeader />
      <DashboardContent />
      <DashboardFooter />
    </LISafeArea>
  );
}

// src/screens/dashboard/DashboardContent.tsx ← all logic + UI here
```

- Every screen section (header, form, footer, list, card) is its own component
- Components own their own empty states
- Never write inline JSX blocks longer than ~10 lines directly in a route file
- Navigation options belong in `_layout.tsx` via `<Stack.Screen options={...} />`, not scattered in screens

## Skeleton Loading Rule

Use skeleton components **before any data is available.** Every screen that awaits data must show a skeleton — never a spinner alone.

```tsx
import { LISkeleton } from '@/components/ui';

if (isPending) {
  return (
    <View className="gap-2">
      <LISkeleton className="h-5 w-48" />
      <LISkeleton className="h-4 w-full" />
    </View>
  );
}
```

- Skeleton shape must **mirror the real layout** as closely as possible
- `LISkeleton` shimmer runs on Reanimated (UI thread) — never `Animated` from `react-native`
- Each screen manages its own skeleton — one skeleton component per screen, colocated in `src/screens/<screen>/`
- Use `ActivityIndicator` only for inline button-pending states

## Animations

Use Reanimated layout animations for simple cases. For orchestrated sequences use
`withSequence`/`withSpring` directly — `moti` is deliberately not installed.

```tsx
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

<Animated.View entering={FadeIn} exiting={FadeOut} layout={LinearTransition}>
  ...
</Animated.View>
```

**When to animate:**

- Screen/component mount & unmount → `entering` / `exiting`
- List item additions/removals → `layout={LinearTransition}` on the row
- Modals, bottom sheets, toasts → spring transitions (`@gorhom/bottom-sheet` handles its own)
- Set-completion / PR celebration → short spring on the accent element

**Rules:**

- Run animations on the UI thread — Reanimated worklets only, never `setState` in a frame loop
- Never animate with `Animated` from `react-native` — use `react-native-reanimated`
- Gestures go through `react-native-gesture-handler`, never `PanResponder`
- Respect `useReducedMotion()` — skip decorative motion when it's on

## UI Component Rule

All primitives live in `src/components/ui/`, built on React Native + NativeWind +
`class-variance-authority` (the shadcn / react-native-reusables pattern). Don't install a UI
library without discussion — add or extend an `LI*` primitive instead.

| Component                                         | Source                      |
|---------------------------------------------------|-----------------------------|
| LIButton, LIInput, LICard, LIBadge, LIAvatar…     | `src/components/ui/`        |
| LIModal, LISelect, LIForm*, LITable, LIChart      | `src/components/`           |
| LIBrandMark, LIGoogleIcon                         | `src/components/ui/`        |
| Screen sections (DashboardContent, RosterList…)   | `src/screens/<screen>/`     |

`npx @react-native-reusables/cli@latest add <component>` can scaffold new primitives — rename the
result to the `LI` prefix and re-point its colors at our tokens before committing it.

- No hardcoded colors — always use NativeWind tokens or theme variables
- No hardcoded font sizes or spacing — always use the Tailwind scale via `className`
- Prefer `className` over `StyleSheet`; reach for `StyleSheet` only for values NativeWind can't express

## UI Wrapper Rule

Never use raw React Native primitives for text (`<Text>`) or touch (`<TouchableOpacity>`, `<Pressable>`, `<Button>`) directly in route files or feature components. Always use project wrappers from `src/components/ui/`.

| Wrapper    | Replaces                                              |
|------------|-------------------------------------------------------|
| `LIText`   | `<Text>` (all sizes: h1–h5, p, caption)               |
| `LIButton` | `<Button>`, `<TouchableOpacity>`, `<Pressable>` CTAs  |
| `LIInput`  | `<TextInput>`                                         |
| `LIImage`  | `<Image>` (wraps `expo-image`)                        |
| `LIList`   | `<FlatList>` (wraps `FlashList`)                      |
| [add others as built]                                              |

`<View>` is allowed directly for layout.

`LIButton` and any other touchable wrapper is built on `Pressable` internally — never
`TouchableOpacity`, `TouchableHighlight`, or `TouchableNativeFeedback`, even inside `src/components/ui/`.

### LIText — canonical usage

```tsx
<LIText size="h1" text="Hello" color="primary" />
<LIText size="p" text="Body copy" color="danger" />
<LIText size="p" text="With link" link linkValue="Click" linkHref="/path" />
<LIText size="p" text="Editable" handleClick={() => {}} />
```

## State Management — Zustand

**Store in Zustand:**

- ✅ Auth (coach, token, session)
- ✅ App settings (theme, units kg/lb, onboarding status)
- ✅ Data shared across 2+ screens
- ✅ Global UI state (toasts, sheets, banners)
- ✅ Active session draft (in-progress workout being logged offline)

**Do NOT store in Zustand:**

- ❌ Local form/input state → `useState` or `react-hook-form`
- ❌ Single-screen data → `useState` or TanStack Query
- ❌ Frequently invalidated server data → TanStack Query cache

Use `persist` with the MMKV storage adapter only for data that must survive app restarts. Never store tokens in MMKV or `AsyncStorage` — use `expo-secure-store`.

## Conventions

- No Server Components in React Native — every component runs on the client; never add `"use client"`
- All components typed with explicit props interfaces — no `any`, use `unknown` and narrow
- Handle loading, error, and empty states in every data-dependent screen
- `useCallback` for handlers passed as props, `useMemo` for expensive derivations, `React.memo` on FlashList rows
- Navigation via Expo Router `<Link>`, `useRouter()`, and typed routes only — never mutate history manually
- Every screen root wraps in `LISafeArea` (`react-native-safe-area-context`) — never hardcode status bar padding
- Keyboard handling is the screen's job — `LIForm` is only `FormProvider` + a spacing `View`, it does
  **not** wrap a `KeyboardAvoidingView`. Route files wrap forms in `KeyboardAvoidingView` (see
  `(auth)/login.tsx`) or a `ScrollView` with `keyboardShouldPersistTaps="handled"` for long forms.
  Test on both platforms.
- Platform differences via `Platform.select` or `.ios.tsx` / `.android.tsx` files — never untested `Platform.OS` branches in render
- Env vars via `src/lib/env.ts` reading `process.env.EXPO_PUBLIC_*` (public only — secrets never ship in the bundle)
- Always import via the `@/` alias — never relative paths like `../../../`
- Import from the specific module in `src/components/` (`@/components/LIForm`), never a barrel —
  there is deliberately no `src/components/index.ts`, because `LIChart` pulls in Skia + d3 and a
  barrel would drag that into every screen that imports a form
- `@/components/ui` is a barrel and is fine to use — those primitives are all lightweight
- Tabs come from `expo-router/js-tabs` — `Tabs` from `expo-router` is deprecated in SDK 57
- MMKV v4 is a factory: `createMMKV({ id })`, and the delete method is `remove()`, not `delete()`
- `@testing-library/react-native` v14 is async: `await render(...)` (or queries throw
  "`render` function has not been called") **and** `await` every `fireEvent.*` call, or React
  reports overlapping `act()` calls and events land out of order
- `jest/resolver.js` exists so Reanimated 4's worklets module resolves under Jest — don't remove it

## Don't

- Don't use `any` — use `unknown` and narrow the type
- Don't skip error handling — always show user feedback via `LIToast`
- Don't hardcode config values — use environment variables via `src/lib/env.ts`
- Don't use hardcoded hex color values — always reference design tokens
- Don't use `AsyncStorage` for anything sensitive — `expo-secure-store` only
- Don't use `FlatList`/`ScrollView` for long lists — use `LIList` (FlashList)
- Don't fetch in `useEffect` — use TanStack Query
- Don't add native modules without checking Expo compatibility (`npx expo install`, then `expo-doctor`)
