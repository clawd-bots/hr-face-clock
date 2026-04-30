#!/usr/bin/env python3
"""
Generates migrations/077_clean_departments_flat.sql.

Same outcome as 076 but using plain SQL statements (no DO/DECLARE
block, no dollar-quoted strings). Each statement is self-contained
with company lookup baked in via subquery.
"""

import csv
import sys
from pathlib import Path
from datetime import datetime

CSV_PATH = Path("/Users/wesleyquek/Downloads/HR Masterlist Active.csv")
OUT_PATH = Path(__file__).resolve().parent.parent / "migrations" / "077_clean_departments_flat.sql"


def sql_text(v):
    if v is None:
        return "NULL"
    s = str(v).strip()
    if not s:
        return "NULL"
    return "'" + s.replace("'", "''") + "'"


# Inline subquery used everywhere to find the single company id.
COMPANY = "(SELECT id FROM companies ORDER BY created_at LIMIT 1)"


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
    sql.append("-- Canonicalize departments + relink employees (plain SQL, no DO block).")
    sql.append(f"-- Generated: {datetime.now().isoformat(timespec='seconds')}")
    sql.append("")

    # 1. Trim whitespace on all dept names
    sql.append("-- 1. Trim whitespace on all department names")
    sql.append("UPDATE departments SET name = trim(name) WHERE name <> trim(name);")
    sql.append("")

    # 2. For each canonical CSV name:
    #    a. Insert if no row matches case-insensitively
    #    b. Move employees from any case-variant to the canonical (Title Case) row
    #    c. Force the canonical row's name to the CSV exact spelling
    #    d. Delete the variants
    sql.append("-- 2. For each CSV department, ensure exactly one canonical row")
    for d in depts:
        sql.append(f"")
        sql.append(f"-- {d}")
        # Insert canonical if missing
        sql.append(
            f"INSERT INTO departments (company_id, name) "
            f"SELECT {COMPANY}, {sql_text(d)} "
            f"WHERE NOT EXISTS ("
            f"SELECT 1 FROM departments WHERE company_id = {COMPANY} "
            f"AND lower(trim(name)) = lower({sql_text(d)})"
            f");"
        )
        # Pick canonical id: prefer exact, else most recent. Update employees on case-variants.
        sql.append(
            f"UPDATE employees SET department_id = ("
            f"SELECT id FROM departments WHERE company_id = {COMPANY} "
            f"AND lower(trim(name)) = lower({sql_text(d)}) "
            f"ORDER BY (name = {sql_text(d)}) DESC, created_at DESC LIMIT 1"
            f") "
            f"WHERE company_id = {COMPANY} AND department_id IN ("
            f"SELECT id FROM departments WHERE company_id = {COMPANY} "
            f"AND lower(trim(name)) = lower({sql_text(d)})"
            f");"
        )
        # Move sub-departments
        sql.append(
            f"UPDATE departments SET parent_department_id = ("
            f"SELECT id FROM departments WHERE company_id = {COMPANY} "
            f"AND lower(trim(name)) = lower({sql_text(d)}) "
            f"ORDER BY (name = {sql_text(d)}) DESC, created_at DESC LIMIT 1"
            f") "
            f"WHERE parent_department_id IN ("
            f"SELECT id FROM departments WHERE company_id = {COMPANY} "
            f"AND lower(trim(name)) = lower({sql_text(d)})"
            f");"
        )
        # Delete duplicates (everything case-insensitive matching, except the chosen canonical)
        sql.append(
            f"DELETE FROM departments WHERE company_id = {COMPANY} "
            f"AND lower(trim(name)) = lower({sql_text(d)}) "
            f"AND id <> ("
            f"SELECT id FROM departments WHERE company_id = {COMPANY} "
            f"AND lower(trim(name)) = lower({sql_text(d)}) "
            f"ORDER BY (name = {sql_text(d)}) DESC, created_at DESC LIMIT 1"
            f");"
        )
        # Force canonical row's name to exact CSV spelling
        sql.append(
            f"UPDATE departments SET name = {sql_text(d)} "
            f"WHERE company_id = {COMPANY} "
            f"AND lower(trim(name)) = lower({sql_text(d)}) "
            f"AND name <> {sql_text(d)};"
        )

    # 3. Delete legacy departments not in CSV
    canonical_list = ", ".join(sql_text(d) for d in depts)
    sql.append("")
    sql.append("-- 3. Drop legacy departments not in the CSV")
    sql.append(
        f"UPDATE employees SET department_id = NULL "
        f"WHERE company_id = {COMPANY} "
        f"AND department_id IN (SELECT id FROM departments "
        f"WHERE company_id = {COMPANY} AND name NOT IN ({canonical_list}));"
    )
    sql.append(
        f"DELETE FROM departments "
        f"WHERE company_id = {COMPANY} AND name NOT IN ({canonical_list});"
    )

    # 4. Force-link each employee
    sql.append("")
    sql.append("-- 4. Force-link each employee to the canonical department row")
    for r in valid_rows:
        emp_no = r[1].strip()
        dept = r[8].strip()
        if not dept:
            continue
        sql.append(
            f"UPDATE employees SET "
            f"department_id = (SELECT id FROM departments WHERE company_id = {COMPANY} AND name = {sql_text(dept)} LIMIT 1), "
            f"department = {sql_text(dept)} "
            f"WHERE company_id = {COMPANY} AND employee_number = {sql_text(emp_no)};"
        )

    sql.append("")

    OUT_PATH.write_text("\n".join(sql))
    print(f"Wrote {OUT_PATH}", file=sys.stderr)


if __name__ == "__main__":
    main()
