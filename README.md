# SetTrack

**Coach. Guide. Progress.**

A coaching companion for gyms. Coaches build and assign programs, track every student's
sessions, log sets as they happen, and keep their whole roster on plan from their phone.

Built with Expo SDK 57 / React Native 0.86 / Expo Router. See [Claude.md](./Claude.md) for the
engineering conventions this codebase follows.

## Getting started

```bash
npm install
cp .env.example .env         # already done once
npx expo start               # then press i (iOS) or a (Android)
```

`.env.example` ships `EXPO_PUBLIC_USE_MOCKS=true`, so a fresh checkout runs with no backend
at all — `src/api/mocks/` serves a coach, six students, three programs and today's sessions,
and any email plus an 8-character password signs you in.

**The working `.env` in this repo has it `false`**, and has for some time: the app talks to
Supabase. `.env` is gitignored, so that is a local setting rather than a property of the
checkout — read the file rather than this paragraph if it matters which you are running.

## Commands

| Command                  | What it does                                            |
|--------------------------|---------------------------------------------------------|
| `npm start`              | Expo dev server                                         |
| `npm run ios`            | Dev server, open iOS simulator                          |
| `npm run android`        | Dev server, open Android emulator                       |
| `npm run typecheck`      | `tsc --noEmit`                                          |
| `npm test`               | Jest (jest-expo + React Native Testing Library)         |
| `npm run lint`           | ESLint via `expo lint`                                  |
| `npm run doctor`         | Native dependency health check                          |
| `npm run bundle:check`   | Full Metro bundle — catches what `tsc` cannot           |

Run all five verification steps before calling a change done; the order is in
[Claude.md](./Claude.md#verification).

## Layout

```
src/app/            Routes. Dumb composers — they fetch, then hand data down.
  _layout.tsx       Providers (Query, gesture handler, safe area, sheets) + auth gate
  (auth)/           welcome (the landing), login, register — shown when signed out
  (tabs)/           Today, Roster, Programs, Settings — shown when signed in
  student/[id].tsx  Student detail
src/screens/        All screen UI, one folder per screen, incl. its skeleton
src/components/     LIForm, LISelect, LIModal, LITable, LIChart (import directly, no barrel)
src/components/ui/  LI primitives — the only place RN primitives are imported
src/api/            axios client, query keys, one module per resource, mocks/
src/store/          Zustand: auth, settings, session draft, toasts
src/theme/          colors.js (single source of truth), tokens, typography
src/lib/            env, formatters, cn()
```

### Two rules worth knowing up front

**Screens fetch; components receive props.** A route calls its query hooks once and passes data
down. No child component fetches data the screen already has.

**Never use a raw RN primitive.** `LIText` not `<Text>`, `LIButton` not `<Pressable>`, `LIList`
not `<FlatList>`, `LIImage` not `<Image>`. ESLint enforces this everywhere except
`src/components/ui/`, where the wrappers themselves live.

## Not built yet

The skeleton is complete and runs; these are deliberately left as next steps:

- **Session reminders** — `expo-notifications` is installed and configured, and the settings
  toggle persists, but nothing schedules a notification yet
- **Passkey sign-in** — the button is built and wired to a handler, but no relying party is
  configured, so it surfaces a "not connected yet" toast. Email + password and Google both work.
- **Remote sign-out** — `public.sessions` records devices and `revokeDeviceSession` marks one
  revoked, which stops pushes, but it cannot invalidate that device's Supabase tokens. Only the
  admin API can, which needs an Edge Function.
- **Nutrition** — `src/api/clientNutrition.ts` is one of the two modules still calling
  `EXPO_PUBLIC_API_URL`, which does not resolve. Hidden behind `EXPO_PUBLIC_FEATURE_FOOD`.
- **Some of the client profile** — `src/api/clientProfile.ts` is the other. Its integrations
  half is a fixture: the screen lists Apple Health, Garmin, Whoop and Strava, and the toggle
  flips a boolean in an array. No SDK, no OAuth, no data has ever moved.
- **A group invite picks your identity for you** — accepting one sends `identity: 'first'`
  because that screen has no identity step; only the board opt-in does. The design says the
  choice is per group and not inherited, so that screen owes it.
- **Board movement** — every row's `delta` is "—". The ranking is counted when it is asked
  for rather than snapshotted, so there is nothing for it to have moved since. An arrow needs
  a snapshot table and something to write it on a schedule.
