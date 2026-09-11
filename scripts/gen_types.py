"""Emits src/api/database.types.ts from a Postgres holding the migrations.

Called by scripts/gen-types.sh. Covers exactly what Ligo's schema uses; if a
migration introduces a type this does not map, it fails loudly rather than
emitting `any` — that is the point of having types at all.
"""

import json
import subprocess
import sys

CATALOG_QUERY = """
select json_build_object(
  'tables', (
    select json_agg(t order by t->>'name') from (
      select json_build_object(
        'name', c.relname,
        'columns', (
          select json_agg(json_build_object(
            'name', a.attname,
            'type', format_type(a.atttypid, a.atttypmod),
            'notnull', a.attnotnull,
            'hasdefault', (a.atthasdef or a.attidentity <> '')
          ) order by a.attnum)
          from pg_attribute a
          where a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
        )
      ) as t
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r'
    ) s
  ),
  'enums', (
    select json_agg(json_build_object('name', t.typname, 'values', (
      select json_agg(e.enumlabel order by e.enumsortorder)
      from pg_enum e where e.enumtypid = t.oid
    )) order by t.typname)
    from pg_type t join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typtype = 'e'
  ),
  'functions', (
    select json_agg(json_build_object(
      'name', p.proname,
      'args', pg_get_function_arguments(p.oid),
      'returns', pg_get_function_result(p.oid)
    ) order by p.proname)
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      -- Trigger functions are not callable over the API.
      and pg_get_function_result(p.oid) <> 'trigger'
  )
)
"""

SCALARS = {
    "uuid": "string",
    "text": "string",
    "boolean": "boolean",
    "jsonb": "Json",
    "json": "Json",
    "bigint": "number",
    "integer": "number",
    "timestamp with time zone": "string",
    "inet": "string",
}

ARG_TYPES = {"text": "string", "uuid": "string", "boolean": "boolean"}
RETURNS = {"void": "undefined", "boolean": "boolean", "bigint": "number", "integer": "number"}


def ts_type(pg: str, enums: set[str]) -> str:
    if pg in SCALARS:
        return SCALARS[pg]
    if pg in enums:
        return f'Database["public"]["Enums"]["{pg}"]'
    raise SystemExit(f"gen_types: unmapped Postgres type {pg!r} — add it to SCALARS")


def parse_args(signature: str) -> str:
    if signature.strip() == "":
        return "Record<string, never>"
    fields = []
    for arg in signature.split(","):
        name, _, pg = arg.strip().partition(" ")
        if pg not in ARG_TYPES:
            raise SystemExit(f"gen_types: unmapped argument type {pg!r}")
        fields.append(f"{name}: {ARG_TYPES[pg]}")
    return "{ " + "; ".join(fields) + " }"


def main() -> None:
    database = sys.argv[1] if len(sys.argv) > 1 else "ligo_types"
    raw = subprocess.run(
        ["psql", "-Atq", "-d", database, "-c", CATALOG_QUERY],
        capture_output=True,
        text=True,
        check=True,
    ).stdout
    catalog = json.loads(raw)

    enum_names = {e["name"] for e in catalog["enums"]}
    out: list[str] = []
    out.append(
        """/**
 * Generated from supabase/migrations — do not edit by hand.
 *
 * Regenerate with `./scripts/gen-types.sh`, or the canonical
 *   npx supabase gen types typescript --project-id <ref> > src/api/database.types.ts
 * once the Docker daemon is available.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {"""
    )

    for table in catalog["tables"]:
        out.append(f'      {table["name"]}: {{')
        for section in ("Row", "Insert", "Update"):
            out.append(f"        {section}: {{")
            for column in table["columns"]:
                ts = ts_type(column["type"], enum_names)
                nullable = "" if column["notnull"] else " | null"
                if section == "Row":
                    mark = ""
                elif section == "Insert":
                    mark = "?" if (not column["notnull"] or column["hasdefault"]) else ""
                else:
                    mark = "?"
                out.append(f'          {column["name"]}{mark}: {ts}{nullable};')
            out.append("        };")
        out.append("        Relationships: [];")
        out.append("      };")

    out.append("    };")
    out.append("    Views: Record<string, never>;")
    out.append("    Functions: {")
    for fn in catalog["functions"] or []:
        returns = RETURNS.get(fn["returns"])
        if returns is None:
            raise SystemExit(f'gen_types: unmapped return type {fn["returns"]!r}')
        out.append(f'      {fn["name"]}: {{')
        out.append(f'        Args: {parse_args(fn["args"])};')
        out.append(f"        Returns: {returns};")
        out.append("      };")
    out.append("    };")
    out.append("    Enums: {")
    for enum in catalog["enums"]:
        values = " | ".join(f'"{v}"' for v in enum["values"])
        out.append(f'      {enum["name"]}: {values};')
    out.append("    };")
    out.append("    CompositeTypes: Record<string, never>;")
    out.append("  };")
    out.append("};")
    out.append("")

    print("\n".join(out))


if __name__ == "__main__":
    main()
