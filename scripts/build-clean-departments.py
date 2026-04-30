#!/usr/bin/env python3
"""
Generates migrations/076_clean_departments.sql.

For every department named in the CSV:
  1. Ensure exactly one canonical row exists with the CSV's exact name
     (Title Case as written in the CSV).
  2. Repoint any employees on case-variant duplicates to the canonical row.
  3. Delete the case-variant duplicates.
Then:
  4. Delete every leftover department NOT in the CSV (legacy junk).
     Employees still pointing at those get nulled out, but we relink them
     immediately afterward in step 5.
  5. Force-set department_id on each employee from the CSV mapping.
"""

import csv
import sys
from pathlib import Path
from datetime import datetime

CSV_PATH = Path("/Users/wesleyquek/Downloads/HR Masterlist Active.csv")
OUT_PATH = Path(__file__).resolve().parent.parent / "migrations" / "076_clean_departments.sql"


def sql_text(v):
    if v is None:
        return "NULL"
    s = str(v).strip()
    if not s:
        return "NULL"
    return "'" + s.replace("'", "''") + "'"


def main():
    with CSV_PATH.open() as f:
        rows = list(csv.reader(f))

    valid_rows = [r for r in rows[1:] if r[2]]

    fallback = 0
    for r in valid_rows:
        if not r[1].strip():
            fallback += 1
            r[1] = f"F{fallback:03d}"

    depts = sorted(set(r[8].strip() for r in valid_rows if r[8].strip()))

    sql = []
    sql.append("-- Canonicalize departments to match the CSV exactly:")
    sql.append("--   1. Ensure each CSV department exists with its exact name (Title Case).")
    sql.append("--   2. Merge case-variant duplicates into the canonical row.")
    sql.append("--   3. Delete any department NOT in the CSV.")
    sql.append("--   4. Re-link employees from CSV mapping.")
    sql.append(f"-- Generated: {datetime.now().isoformat(timespec='seconds')}")
    sql.append("")
    sql.append("DO $$")
    sql.append("DECLARE")
    sql.append("  v_company_id uuid;")
    sql.append("  v_canonical_id uuid;")
    sql.append("BEGIN")
    sql.append("  SELECT id INTO v_company_id FROM companies ORDER BY created_at LIMIT 1;")
    sql.append("  IF v_company_id IS NULL THEN")
    sql.append("    RAISE EXCEPTION 'No company found.';")
    sql.append("  END IF;")
    sql.append("")

    # 1 + 2: For each canonical CSV name, ensure one row, merge variants
    sql.append("  -- 1+2. For each CSV department: ensure canonical row, merge case-variants.")
    for d in depts:
        sql.append("")
        sql.append(f"  -- {d}")
        # Pick existing canonical id (exact match preferred, else any case-variant)
        sql.append(
            f"  SELECT id INTO v_canonical_id FROM departments "
            f"WHERE company_id = v_company_id AND name = {sql_text(d)} LIMIT 1;"
        )
        sql.append("  IF v_canonical_id IS NULL THEN")
        sql.append(
            f"    SELECT id INTO v_canonical_id FROM departments "
            f"WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim({sql_text(d)})) "
            f"ORDER BY created_at DESC LIMIT 1;"
        )
        sql.append("  END IF;")
        sql.append("  IF v_canonical_id IS NULL THEN")
        sql.append(
            f"    INSERT INTO departments (company_id, name) "
            f"VALUES (v_company_id, {sql_text(d)}) RETURNING id INTO v_canonical_id;"
        )
        sql.append("  ELSE")
        sql.append(
            f"    -- Force the canonical row's name to match the CSV exactly"
        )
        sql.append(
            f"    UPDATE departments SET name = {sql_text(d)} WHERE id = v_canonical_id;"
        )
        sql.append("  END IF;")
        # Merge variants: repoint employees, repoint sub-departments, delete dupes
        sql.append(
            f"  UPDATE employees SET department_id = v_canonical_id "
            f"WHERE company_id = v_company_id "
            f"AND department_id IN (SELECT id FROM departments "
            f"WHERE company_id = v_company_id "
            f"AND lower(trim(name)) = lower(trim({sql_text(d)})) AND id <> v_canonical_id);"
        )
        sql.append(
            f"  UPDATE departments SET parent_department_id = v_canonical_id "
            f"WHERE parent_department_id IN (SELECT id FROM departments "
            f"WHERE company_id = v_company_id "
            f"AND lower(trim(name)) = lower(trim({sql_text(d)})) AND id <> v_canonical_id);"
        )
        sql.append(
            f"  DELETE FROM departments WHERE company_id = v_company_id "
            f"AND lower(trim(name)) = lower(trim({sql_text(d)})) AND id <> v_canonical_id;"
        )

    # 3: Delete all departments NOT in the CSV list
    sql.append("")
    sql.append("  -- 3. Drop legacy departments not in the CSV.")
    sql.append("  --    Null out any employees still pointing at them first;")
    sql.append("  --    step 4 below will relink them per the CSV mapping.")
    canonical_list = ", ".join(sql_text(d) for d in depts)
    sql.append(
        f"  UPDATE employees SET department_id = NULL "
        f"WHERE company_id = v_company_id "
        f"AND department_id IN ("
        f"SELECT id FROM departments "
        f"WHERE company_id = v_company_id "
        f"AND name NOT IN ({canonical_list}));"
    )
    sql.append(
        f"  DELETE FROM departments "
        f"WHERE company_id = v_company_id "
        f"AND name NOT IN ({canonical_list});"
    )

    # 4: Re-link from CSV mapping
    sql.append("")
    sql.append("  -- 4. Force-link each employee to the canonical department row.")
    for r in valid_rows:
        emp_no = r[1].strip()
        dept = r[8].strip()
        if not dept:
            continue
        sql.append(
            f"  UPDATE employees SET "
            f"department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND name = {sql_text(dept)} LIMIT 1), "
            f"department = {sql_text(dept)} "
            f"WHERE company_id = v_company_id AND employee_number = {sql_text(emp_no)};"
        )

    sql.append("")
    sql.append(f"  RAISE NOTICE 'Department cleanup complete: % canonical departments, % employees re-linked', {len(depts)}, {len(valid_rows)};")
    sql.append("END $$;")
    sql.append("")

    OUT_PATH.write_text("\n".join(sql))
    print(f"Wrote {OUT_PATH}", file=sys.stderr)
    print(f"  - {len(depts)} canonical departments", file=sys.stderr)
    print(f"  - {sum(1 for r in valid_rows if r[8].strip())} employees relinked", file=sys.stderr)


if __name__ == "__main__":
    main()
