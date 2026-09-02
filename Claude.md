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

## Color Palette & Design Tokens

### Brand Colors

| Name        | Hex       | Role             | CSS Variable            | Tailwind Token     |
|-------------|-----------|------------------|-------------------------|--------------------|
| Navy        | `#0A3D62` | Primary          | `--color-navy`          | `navy`             |
| Teal        | `#48CAE4` | Accent           | `--color-teal`          | `teal`             |
| Sky         | `#EBF4FB` | Background       | `--color-sky`           | `sky`              |
| Midnight    | `#0D1B2A` | Dark surface     | `--color-midnight`      | `midnight`         |
| Light Teal  | `#E1F5EE` | Pill / badge fill| `--color-light-teal`    | `light-teal`       |
| Gray        | `#F1EFE8` | Neutral surface  | `--color-gray`          | `gray`             |
| White       | `#FFFFFF` | Screen background| `--color-white`         | `white`            |
| Dark Gray   | `#333333` | Body text        | `--color-dark-gray`     | `dark-gray`        |

### Color Usage Rules

- **Navy** is the dominant brand color — use for headers, icons, and primary actions.
- **Teal** is the accent color — use for highlights, completed sets, streaks, and call-to-action elements.
- **Never** use more than 3 brand colors on a single screen.
- **Navy + Teal** is the primary combination. Never pair Teal with Midnight independently.
- All colors must be referenced via NativeWind tokens or theme variables — no hardcoded hex values in components, and no raw hex in `StyleSheet`.
- Hex values live in exactly one file: `src/theme/colors.js`. `tailwind.config.js` requires it, and
  TS reads it through `src/theme/tokens.ts` (for Skia charts, navigation theme, icon `color` props).
- `gray` is a single flat brand neutral, **not** a scale — `bg-gray-100` does not exist.
- `danger` / `success` / `warning` are functional tokens for feedback states only, not brand colors.

### Semantic Mapping

| Usage                    | Token          |
|--------------------------|----------------|
| Primary button bg        | `navy`         |
| Primary button pressed   | `midnight`     |
| CTA / accent button bg   | `teal`         |
| Screen background        | `white`        |
| Card / section bg        | `sky`          |
| Neutral surface / divider| `gray`         |
| Badge / pill fill        | `light-teal`   |
| Body text                | `dark-gray`    |
| Heading text             | `navy`         |
| Dark mode surface        | `midnight`     |

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
- Keyboard handling via `KeyboardAvoidingView` wrapper in `LIForm`, tested on both platforms
- Platform differences via `Platform.select` or `.ios.tsx` / `.android.tsx` files — never untested `Platform.OS` branches in render
- Env vars via `src/lib/env.ts` reading `process.env.EXPO_PUBLIC_*` (public only — secrets never ship in the bundle)
- Tabs come from `expo-router/js-tabs` — `Tabs` from `expo-router` is deprecated in SDK 57
- MMKV v4 is a factory: `createMMKV({ id })`, and the delete method is `remove()`, not `delete()`
- `@testing-library/react-native` v14 `render` returns a promise — `await render(...)` or queries throw
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
