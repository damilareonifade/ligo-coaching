#!/usr/bin/env bash
# Applies supabase/migrations to a throwaway local Postgres and runs the
# behavioural checks in supabase/verify/01_checks.sql.
#
# Why not `supabase db reset`: that needs the Docker daemon. This path needs
# only a running Postgres, so the schema can be checked on any machine.
# It does NOT touch the remote project.
set -euo pipefail

DB="${LIGO_VERIFY_DB:-ligo_verify}"

command -v psql >/dev/null || { echo "psql not found"; exit 1; }

dropdb --if-exists "$DB"
createdb "$DB"

psql -v ON_ERROR_STOP=1 -q -d "$DB" -f supabase/verify/00_stub_supabase.sql

for migration in supabase/migrations/*.sql; do
  printf '%-52s' "$(basename "$migration")"
  psql -v ON_ERROR_STOP=1 -q -d "$DB" -f "$migration" >/dev/null
  echo "applied"
done

echo
echo "--- behavioural checks (errors below marked 'expect ERROR' are the point) ---"
psql -q -d "$DB" -f supabase/verify/01_checks.sql
