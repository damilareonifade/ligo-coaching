"""Emits src/api/database.types.ts from a Postgres holding the migrations.

Called by scripts/gen-types.sh. Covers exactly what Ligo's schema uses; if a
migration introduces a type this does not map, it fails loudly rather than
emitting `any` — that is the point of having types at all.
"""

import re
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
      -- 'v' as well as 'r': a view the app selects from needs a row type
      -- exactly as a table does, and omitting it is how a derived column
      -- silently becomes untyped at the call site.
      where n.nspname = 'public' and c.relkind in ('r', 'v')
    ) s
  ),
  -- Foreign keys, which is how supabase-js knows a nested select is legal:
  -- `.select('*, routine_blocks(*)')` only typechecks when a relationship
  -- between the two relations is declared here. Without them every embed in
  -- the app resolves to a SelectQueryError instead of rows.
  'foreign_keys', (
    select json_agg(fk order by fk->>'name') from (
      select json_build_object(
        'name', con.conname,
        'source', src.relname,
        'columns', (
          select json_agg(a.attname order by k.ord)
            from unnest(con.conkey) with ordinality as k(attnum, ord)
            join pg_attribute a on a.attrelid = con.conrelid and a.attnum = k.attnum
        ),
        'referenced', ref.relname,
        'referenced_columns', (
          select json_agg(a.attname order by k.ord)
            from unnest(con.confkey) with ordinality as k(attnum, ord)
            join pg_attribute a on a.attrelid = con.confrelid and a.attnum = k.attnum
        ),
        -- PostgREST embeds a one-to-one as an object and everything else as an
        -- array, and that is exactly the difference between `row.child.name`
        -- and `row.child[0].name` at the call site. It is one-to-one only when
        -- the referencing columns are themselves unique.
        'one_to_one', exists (
          select 1 from pg_index ix
           where ix.indrelid = con.conrelid
             and ix.indisunique
             and ix.indpred is null
             and (select array_agg(c order by c)
                    from unnest(string_to_array(ix.indkey::text, ' ')::int2[]) c)
               = (select array_agg(c order by c) from unnest(con.conkey) c)
        )
      ) as fk
      from pg_constraint con
      join pg_class src on src.oid = con.conrelid
      join pg_class ref on ref.oid = con.confrelid
      join pg_namespace n on n.oid = src.relnamespace
      where con.contype = 'f' and n.nspname = 'public'
    ) s
  ),
  -- Which tables each view is built from, and what it exposes. PostgREST can
  -- embed through a view whose columns trace back to a base table's, so the
  -- generated types have to say so too — see `view_relationships`.
  'views', (
    select json_agg(v order by v->>'name') from (
      select json_build_object(
        'name', vw.relname,
        'sources', coalesce((
          select json_agg(distinct base.relname)
            from pg_depend d
            join pg_rewrite rw on rw.oid = d.objid and rw.ev_class = vw.oid
            join pg_class base on base.oid = d.refobjid
           where d.classid = 'pg_rewrite'::regclass
             and d.refclassid = 'pg_class'::regclass
             and base.relkind = 'r'
             and base.oid <> vw.oid
        ), '[]'::json),
        'columns', (
          select json_agg(a.attname)
            from pg_attribute a
           where a.attrelid = vw.oid and a.attnum > 0 and not a.attisdropped
        )
      ) as v
      from pg_class vw join pg_namespace n on n.oid = vw.relnamespace
      where n.nspname = 'public' and vw.relkind = 'v'
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
    "numeric": "number",
    "text[]": "string[]",
}

ARG_TYPES = {
    "text": "string",
    "uuid": "string",
    "boolean": "boolean",
    "uuid[]": "string[]",
    "jsonb": "Json",
    "integer": "number",
    "numeric": "number",
}
RETURNS = {
    "void": "undefined",
    "boolean": "boolean",
    "bigint": "number",
    "integer": "number",
    "uuid": "string",
    "text": "string",
}

# `numeric(6, 2)` is the same TypeScript type as `numeric` — the precision is
# a storage detail, so the declared width is stripped before the lookup rather
# than enumerating every width the schema happens to use.
PRECISION = re.compile(r"\(\s*\d+\s*(?:,\s*\d+\s*)?\)$")


def ts_type(pg: str, enums: set[str]) -> str:
    pg = PRECISION.sub("", pg).strip()
    if pg in SCALARS:
        return SCALARS[pg]
    if pg in enums:
        return f'Database["public"]["Enums"]["{pg}"]'
    raise SystemExit(f"gen_types: unmapped Postgres type {pg!r} — add it to SCALARS")


TABLE_RETURN = re.compile(r"^TABLE\((.*)\)$", re.S)


def ts_return(pg: str) -> str:
    """`TABLE(done integer, target integer)` is an array of row objects.

    Postgres reports a set-returning function's shape this way; PostgREST
    hands it back as rows, so the TypeScript side is an array rather than the
    scalar the plain RETURNS map covers.
    """
    match = TABLE_RETURN.match(pg.strip())
    if not match:
        if pg not in RETURNS:
            raise SystemExit(f"gen_types: unmapped return type {pg!r}")
        return RETURNS[pg]

    fields = []
    for column in match.group(1).split(","):
        name, _, column_type = column.strip().partition(" ")
        column_type = PRECISION.sub("", column_type).strip()
        if column_type not in ARG_TYPES and column_type not in SCALARS:
            raise SystemExit(f"gen_types: unmapped return column type {column_type!r}")
        fields.append(f"{name}: {SCALARS.get(column_type, ARG_TYPES.get(column_type))}")

    return "{ " + "; ".join(fields) + " }[]"


def parse_args(signature: str) -> str:
    """Postgres prints defaults into the signature: `p_title text DEFAULT 'x'`.

    An argument carrying one is optional at the call site, so it is emitted
    with `?` rather than forcing every caller to pass a value the database
    already has an answer for.

    It is emitted nullable as well. Postgres accepts NULL for any argument,
    and for the ones that default to it that is the whole point — `p_note`
    taking null is how the app clears a note, and a type that refused it would
    push every caller into `?? undefined`, which only means the same thing by
    coincidence.
    """
    if signature.strip() == "":
        return "Record<string, never>"

    fields = []
    for arg in signature.split(","):
        arg = arg.strip()
        # Split off the default before anything else — it can contain spaces,
        # casts and quotes, none of which are part of the type.
        declared, _, _default = arg.partition(" DEFAULT ")
        optional = "?" if _default else ""

        name, _, pg = declared.strip().partition(" ")
        pg = PRECISION.sub("", pg).strip()
        if pg not in ARG_TYPES:
            raise SystemExit(f"gen_types: unmapped argument type {pg!r}")
        nullable = " | null" if _default else ""
        fields.append(f"{name}{optional}: {ARG_TYPES[pg]}{nullable}")

    return "{ " + "; ".join(fields) + " }"


def render_relationship(fk: dict, referenced: str) -> list[str]:
    columns = ", ".join(f'"{c}"' for c in fk["columns"])
    referenced_columns = ", ".join(f'"{c}"' for c in fk["referenced_columns"])
    return [
        "          {",
        f'            foreignKeyName: "{fk["name"]}";',
        f"            columns: [{columns}];",
        f'            isOneToOne: {"true" if fk["one_to_one"] else "false"};',
        f'            referencedRelation: "{referenced}";',
        f"            referencedColumns: [{referenced_columns}];",
        "          },",
    ]


def relationships_by_relation(catalog: dict) -> dict[str, list[dict]]:
    """Every relation's foreign keys, including the ones it inherits as a view.

    PostgREST can embed through a view whose columns trace back to a base
    table's, in both directions, so each foreign key is repeated for every view
    that stands in for one of its ends.

    "Stands in for" has to be decided by column names, because Postgres records
    which tables a view reads but not which view column came from which base
    column. Sharing one column name is not enough — `routine_instance_progress`
    reads workout_sessions for a max() and happens to expose a `client_id` of
    its own — so the test is that the view carries *every* column of the base
    table. That is exactly true of a `select t.*` view, which is the only kind
    this schema has, and a view that drops a column simply gets no
    relationships rather than a wrong one.
    """
    views = catalog.get("views") or []
    table_columns = {
        table["name"]: {column["name"] for column in table["columns"]}
        for table in catalog["tables"]
    }

    def stands_in_for(view: dict, table: str) -> bool:
        if table not in (view["sources"] or []):
            return False
        return table_columns.get(table, set()) <= set(view["columns"] or [])

    by_relation: dict[str, list[dict]] = {}

    for fk in catalog.get("foreign_keys") or []:
        entries = by_relation.setdefault(fk["source"], [])
        entries.append({"fk": fk, "referenced": fk["referenced"]})

        for view in views:
            # The view stands in for the table being pointed at, so a child of
            # that table can be embedded from it.
            if stands_in_for(view, fk["referenced"]):
                entries.append({"fk": fk, "referenced": view["name"]})

            # The view stands in for the table holding the key, so it can embed
            # whatever that table points at.
            if stands_in_for(view, fk["source"]):
                by_relation.setdefault(view["name"], []).append(
                    {"fk": fk, "referenced": fk["referenced"]}
                )

    return by_relation


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
    relationships = relationships_by_relation(catalog)
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
        entries = relationships.get(table["name"], [])
        if not entries:
            out.append("        Relationships: [];")
        else:
            out.append("        Relationships: [")
            for entry in entries:
                out.extend(render_relationship(entry["fk"], entry["referenced"]))
            out.append("        ];")
        out.append("      };")

    out.append("    };")
    out.append("    Views: Record<string, never>;")
    out.append("    Functions: {")
    for fn in catalog["functions"] or []:
        returns = ts_return(fn["returns"])
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
