#!/usr/bin/env python3
"""
Focused fix for gender/civil_status/emergency contacts that didn't make
it through the main import. Generates migrations/072_fix_missing_fields.sql
"""

import csv
import sys
from pathlib import Path
from datetime import datetime

CSV_PATH = Path("/Users/wesleyquek/Downloads/HR Masterlist Active.csv")
OUT_PATH = Path(__file__).resolve().parent.parent / "migrations" / "072_fix_missing_fields.sql"


def sql_text(v):
    if v is None:
        return "NULL"
    s = str(v).strip()
    if not s:
        return "NULL"
    return "'" + s.replace("'", "''") + "'"


def normalize_gender(s):
    s = (s or "").strip().upper()
    if s == "M":
        return "male"
    if s == "F":
        return "female"
    return None


def normalize_civil(s):
    s = (s or "").strip().lower()
    return s or None


def main():
    with CSV_PATH.open() as f:
        rows = list(csv.reader(f))

    valid_rows = [r for r in rows[1:] if r[2]]

    # Generate fallback emp_nos consistent with the main importer
    fallback = 0
    for r in valid_rows:
        if not r[1].strip():
            fallback += 1
            r[1] = f"F{fallback:03d}"

    sql = []
    sql.append("-- Fix gender, civil_status, and emergency contacts that")
    sql.append("-- did not make it through the main import (070).")
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
    sql.append("  -- 1. Force-update gender + civil_status from CSV (overwrites NULL or stale values)")

    for r in valid_rows:
        emp_no = r[1].strip()
        gender = normalize_gender(r[27])
        civil = normalize_civil(r[37])
        if not gender and not civil:
            continue
        sets = []
        if gender:
            sets.append(f"gender = {sql_text(gender)}")
        if civil:
            sets.append(f"civil_status = {sql_text(civil)}")
        sql.append(
            f"  UPDATE employees SET {', '.join(sets)} "
            f"WHERE company_id = v_company_id AND employee_number = {sql_text(emp_no)};"
        )

    sql.append("")
    sql.append("  -- 2. Wipe and re-insert primary emergency contacts from CSV")
    sql.append(
        "  DELETE FROM employee_emergency_contacts ec USING employees e "
        "WHERE ec.employee_id = e.id AND e.company_id = v_company_id AND ec.is_primary = true;"
    )

    contact_count = 0
    for r in valid_rows:
        emp_no = r[1].strip()
        name = r[39].strip()
        phone = r[40].strip() or "N/A"
        if not name:
            continue
        contact_count += 1
        sql.append(
            f"  INSERT INTO employee_emergency_contacts (employee_id, name, relationship, phone, is_primary) "
            f"SELECT e.id, {sql_text(name)}, 'Not specified', {sql_text(phone)}, true "
            f"FROM employees e WHERE e.company_id = v_company_id AND e.employee_number = {sql_text(emp_no)};"
        )

    sql.append("")
    sql.append(f"  RAISE NOTICE 'Patched gender/civil_status on % rows', {len(valid_rows)};")
    sql.append(f"  RAISE NOTICE 'Inserted % emergency contacts', {contact_count};")
    sql.append("END $$;")
    sql.append("")

    OUT_PATH.write_text("\n".join(sql))
    print(f"Wrote {OUT_PATH}", file=sys.stderr)
    print(f"  - {len(valid_rows)} employee patches", file=sys.stderr)
    print(f"  - {contact_count} emergency contacts", file=sys.stderr)


if __name__ == "__main__":
    main()
