# Ligo

**Coach. Guide. Progress.**

A coaching companion for gyms. Coaches build and assign programs, track every student's
sessions, log sets as they happen, and keep their whole roster on plan from their phone.

Built with Expo SDK 57 / React Native 0.86 / Expo Router. See [Claude.md](./Claude.md) for the
engineering conventions this codebase follows.

## Getting started

```bash
npm install
cp .env.example .env.local   # already done once; EXPO_PUBLIC_USE_MOCKS=true by default
npx expo start               # then press i (iOS) or a (Android)
```

The app ships with `EXPO_PUBLIC_USE_MOCKS=true`, so it runs fully without a backend —
`src/api/mocks/` serves a coach, six students, three programs and today's sessions. Point
`EXPO_PUBLIC_API_URL` at a real API and set `EXPO_PUBLIC_USE_MOCKS=false` to go live.

Any email plus an 8-character password signs you in while mocks are on.

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
  (auth)/           login, register — shown when signed out
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

- **Program builder** — programs are read-only; there's no create/edit flow
- **Session logging UI** — "Log a set" posts a placeholder set (8 reps, 0kg) to prove the
  optimistic-update path. A real set-entry sheet is the next piece.
- **Session reminders** — `expo-notifications` is installed and configured, and the settings
  toggle persists, but nothing schedules a notification yet
- **Student messaging / form cues** — cues exist on exercises but aren't sendable
- **Google / passkey sign-in** — both buttons are built and wired to handlers, but no OAuth client
  ID or passkey relying party is configured, so they surface a "not connected yet" toast. Email +
  password is the working path.
