# Parked migrations

Written, reviewed, not applied — the feature they belong to is flagged off in
`.env` and the tables would sit unused in production.

Nothing here is picked up by `supabase db push`, which only reads
`supabase/migrations/`. To bring one back, move it into that directory, give it
a timestamp later than every migration already applied, and add its checks to
`supabase/verify/01_checks.sql`.

| File | Waiting on |
|---|---|
| `20260913103000_nutrition.sql` | `EXPO_PUBLIC_FEATURE_FOOD` — foods, food logs and daily targets. |
