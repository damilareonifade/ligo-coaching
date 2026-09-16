#!/usr/bin/env bash
# Regenerates src/api/database.types.ts from supabase/migrations.
#
# The canonical command is:
#   npx supabase gen types typescript --project-id <ref> > src/api/database.types.ts
# but it runs pg-meta in Docker. This script introspects a local Postgres
# instead, so types can be regenerated without the daemon running.
set -euo pipefail

DB="${SETTRACK_VERIFY_DB:-settrack_types}"

dropdb --if-exists "$DB"
createdb "$DB"
psql -v ON_ERROR_STOP=1 -q -d "$DB" -f supabase/verify/00_stub_supabase.sql
for migration in supabase/migrations/*.sql; do
  psql -v ON_ERROR_STOP=1 -q -d "$DB" -f "$migration" >/dev/null
done

python3 scripts/gen_types.py "$DB" > src/api/database.types.ts
npx prettier --write src/api/database.types.ts >/dev/null
echo "wrote src/api/database.types.ts"
