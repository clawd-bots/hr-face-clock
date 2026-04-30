#!/usr/bin/env python3
"""
Generates migrations/075_force_relink_departments.sql.

For each row in the CSV, hardcode the (employee_number → department_name)
mapping into SQL. Creates the department row if missing (case-insensitive),
then sets employees.department_id to it. Does not depend on the
employees.department legacy text field, so it works even after the
dedupe migration nuked rows.
"""

import csv
import sys
from pathlib import Path
from datetime import datetime

CSV_PATH = Path("/Users/wesleyquek/Downloads/HR Masterlist Active.csv")
OUT_PATH = Path(__file__).resolve().parent.parent / "migrations" / "075_force_relink_departments.sql"


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

    # Distinct departments
    depts = sorted(set(r[8].strip() for r in valid_rows if r[8].strip()))

    sql = []
    sql.append("-- Hardcoded employee-number → department mapping from CSV.")
    sql.append("-- Independent of the legacy employees.department text field.")
    sql.append(f"-- Generated: {datetime.now().isoformat(timespec='seconds')}")
    sql.append("")
    sql.append("DO $$")
    sql.append("DECLARE")
    sql.append("  v_company_id uuid;")
    sql.append("BEGIN")
    sql.append("  SELECT id INTO v_company_id FROM companies ORDER BY created_at LIMIT 1;")
    sql.append("  IF v_company_id IS NULL THEN")
    sql.append("    RAISE EXCEPTION 'No company found.';")
    sql.append("  END IF;")
    sql.append("")
    sql.append("  -- 1. Ensure each department exists (case-insensitive).")
    sql.append("  --    If a case-variant already exists, leave it; we'll match it below.")
    for d in depts:
        sql.append(
            f"  INSERT INTO departments (company_id, name) "
            f"SELECT v_company_id, {sql_text(d)} "
            f"WHERE NOT EXISTS (SELECT 1 FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim({sql_text(d)})));"
        )
    sql.append("")
    sql.append("  -- 2. Force-set department_id on each employee from CSV.")
    sql.append("  --    Looks up the department row by case-insensitive name.")
    for r in valid_rows:
        emp_no = r[1].strip()
        dept = r[8].strip()
        if not dept:
            continue
        sql.append(
            f"  UPDATE employees SET department_id = "
            f"(SELECT id FROM departments WHERE company_id = v_company_id "
            f"AND lower(trim(name)) = lower(trim({sql_text(dept)})) LIMIT 1), "
            f"department = {sql_text(dept)} "
            f"WHERE company_id = v_company_id AND employee_number = {sql_text(emp_no)};"
        )

    sql.append("")
    sql.append(f"  RAISE NOTICE 'Force-relinked % employees to their CSV departments', {len(valid_rows)};")
    sql.append("END $$;")
    sql.append("")

    OUT_PATH.write_text("\n".join(sql))
    print(f"Wrote {OUT_PATH}", file=sys.stderr)
    print(f"  - {len(depts)} departments ensured", file=sys.stderr)
    print(f"  - {sum(1 for r in valid_rows if r[8].strip())} employees relinked", file=sys.stderr)


if __name__ == "__main__":
    main()
