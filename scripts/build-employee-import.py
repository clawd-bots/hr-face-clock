#!/usr/bin/env python3
"""
Build a SQL import file from HR Masterlist Active.csv.

Generates migrations/070_import_active_employees.sql that:
  1. Resolves company_id (single-tenant assumption: first company)
  2. UPSERTs departments referenced by the CSV
  3. UPSERTs employees on (company_id, employee_number)

Run the resulting SQL in Supabase SQL Editor.
"""

import csv
import re
import sys
from datetime import datetime
from pathlib import Path

CSV_PATH = Path("/Users/wesleyquek/Downloads/HR Masterlist Active.csv")
OUT_PATH = Path(__file__).resolve().parent.parent / "migrations" / "070_import_active_employees.sql"


def sql_str(v):
    """Escape a value for SQL. Returns NULL for empty/None."""
    if v is None or v == "" or v == "FALSE" or v == "TRUE":
        # Treat FALSE/TRUE in EC column as not used; not relevant here
        if v in ("FALSE", "TRUE"):
            return f"'{v}'"
        return "NULL"
    s = str(v).strip()
    if not s:
        return "NULL"
    # Postgres single-quote escape
    return "'" + s.replace("'", "''") + "'"


def sql_text(v):
    """SQL string or NULL for free text."""
    if v is None:
        return "NULL"
    s = str(v).strip()
    if not s:
        return "NULL"
    return "'" + s.replace("'", "''") + "'"


def parse_date(s):
    """Parse '26-Jan-1995' or similar -> '1995-01-26'. Returns None on failure."""
    if not s or not s.strip():
        return None
    s = s.strip()
    for fmt in ("%d-%b-%Y", "%d-%B-%Y", "%Y-%m-%d", "%m/%d/%Y"):
        try:
            return datetime.strptime(s, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return None


def normalize_gender(s):
    s = (s or "").strip().upper()
    if s == "M":
        return "male"
    if s == "F":
        return "female"
    return None


def normalize_employment(s):
    s = (s or "").strip().lower()
    return {
        "regular": "regular",
        "probationary": "probationary",
        "extended proby": "extended_proby",
        "ic": "ic",
    }.get(s, s or None)


def normalize_civil(s):
    s = (s or "").strip().lower()
    return s or None


def parse_money(s):
    """Parse '₱65,000.00' -> 65000.00, '' -> None."""
    if not s:
        return None
    s = re.sub(r"[₱,$\s]", "", str(s).strip())
    if not s:
        return None
    try:
        return float(s)
    except ValueError:
        return None


def round_money(n):
    if n is None:
        return None
    return round(n, 2)


# CSV bank short code -> human readable. Stored as-is; this is a comment for readers.
BANK_CODES = {"UB": "UnionBank", "BDO": "BDO", "BPI": "BPI", "SeaBank": "SeaBank"}


def main():
    with CSV_PATH.open() as f:
        reader = csv.reader(f)
        rows = list(reader)

    valid_rows = [r for r in rows[1:] if r[2]]  # has Last Name
    print(f"Found {len(valid_rows)} valid rows", file=sys.stderr)

    # Track departments referenced
    departments = sorted(set(r[8].strip() for r in valid_rows if r[8].strip()))

    # Generate fallback employee numbers for rows missing one.
    # Use 'F' prefix + sequential to avoid colliding with normal '0001'..'0099' style.
    fallback_counter = 0
    for r in valid_rows:
        if not r[1].strip():
            fallback_counter += 1
            r[1] = f"F{fallback_counter:03d}"

    sql = []
    sql.append("-- ============================================================")
    sql.append("-- Bulk import of active employees from HR Masterlist")
    sql.append(f"-- Generated: {datetime.now().isoformat(timespec='seconds')}")
    sql.append(f"-- Source: HR Masterlist Active.csv ({len(valid_rows)} rows)")
    sql.append("-- ============================================================")
    sql.append("")
    sql.append("-- Ensure (company_id, employee_number) is unique so ON CONFLICT works.")
    sql.append("-- Postgres treats NULLs as distinct in unique indexes by default,")
    sql.append("-- so existing rows with NULL employee_number won't block this.")
    sql.append("CREATE UNIQUE INDEX IF NOT EXISTS uq_employees_company_empno")
    sql.append("  ON employees (company_id, employee_number);")
    sql.append("")
    sql.append("DO $$")
    sql.append("DECLARE")
    sql.append("  v_company_id uuid;")
    sql.append("BEGIN")
    sql.append("  -- Single-tenant: pick the first company. If you have multiple,")
    sql.append("  -- replace with: SELECT id INTO v_company_id FROM companies WHERE slug = 'your-slug';")
    sql.append("  SELECT id INTO v_company_id FROM companies ORDER BY created_at LIMIT 1;")
    sql.append("  IF v_company_id IS NULL THEN")
    sql.append("    RAISE EXCEPTION 'No company found. Run /setup first.';")
    sql.append("  END IF;")
    sql.append("")
    sql.append("  -- 1. Upsert departments referenced in the import")
    for d in departments:
        sql.append(
            f"  INSERT INTO departments (company_id, name) VALUES (v_company_id, {sql_text(d)}) "
            f"ON CONFLICT DO NOTHING;"
        )
    sql.append("")
    sql.append("  -- 2. Upsert allowance types (de minimis + load/plan)")
    sql.append(
        "  INSERT INTO allowance_types (company_id, name, code, is_taxable, is_de_minimis) "
        "VALUES (v_company_id, 'De Minimis', 'DE_MINIMIS', false, true) "
        "ON CONFLICT (company_id, code) DO NOTHING;"
    )
    sql.append(
        "  INSERT INTO allowance_types (company_id, name, code, is_taxable, is_de_minimis) "
        "VALUES (v_company_id, 'Standard Allowance', 'ALLOWANCE', true, false) "
        "ON CONFLICT (company_id, code) DO NOTHING;"
    )
    sql.append(
        "  INSERT INTO allowance_types (company_id, name, code, is_taxable, is_de_minimis) "
        "VALUES (v_company_id, 'Load/Plan Allowance', 'LOAD_PLAN', true, false) "
        "ON CONFLICT (company_id, code) DO NOTHING;"
    )
    sql.append("")
    sql.append("  -- 3. Upsert employees")
    sql.append("  -- Each row uses (company_id, employee_number) as the natural key.")
    sql.append("")

    salary_records = []  # (emp_no, basic, hire_date)
    allowance_records = []  # (emp_no, code, amount)
    emergency_records = []  # (emp_no, name, phone)

    for r in valid_rows:
        emp_no = r[1].strip()
        last_name = r[2].strip()
        first_name = r[3].strip()
        middle_name = r[4].strip()
        position = r[7].strip()
        dept = r[8].strip()
        rank = r[9].strip()  # legacy 'role' field
        emp_type = r[10].strip()
        hire_date = parse_date(r[12]) or parse_date(r[13])
        basic_salary = parse_money(r[15])
        de_minimis = parse_money(r[16])
        allowance = parse_money(r[17])
        load_plan = parse_money(r[18])
        sss = r[20].strip()
        tin = r[21].strip()
        pagibig = r[22].strip()
        philhealth = r[23].strip()
        payroll_account = r[25].strip()
        payroll_bank = r[26].strip()
        gender = r[27].strip()
        citizenship = r[28].strip()
        work_email = r[29].strip()
        address = r[30].strip()
        barangay = r[31].strip()
        city = r[32].strip()
        province = r[33].strip()
        phone = r[34].strip()
        birthdate = parse_date(r[35])
        civil = r[37].strip()
        personal_email = r[38].strip()
        emergency_name = r[39].strip()
        emergency_phone = r[40].strip()

        address_line1 = address or None
        address_line2 = barangay or None

        parts = [first_name]
        if middle_name:
            parts.append(middle_name)
        parts.append(last_name)
        full_name = " ".join(p for p in parts if p)

        sql.append(
            f"  INSERT INTO employees ("
            f"company_id, employee_number, name, first_name, middle_name, last_name, "
            f"position_title, role, department, department_id, "
            f"employment_status, hire_date, "
            f"sss_number, tin_number, pagibig_number, philhealth_number, "
            f"payroll_account_number, payroll_bank, "
            f"gender, nationality, work_email, personal_email, phone, "
            f"address_line1, address_line2, city, province, "
            f"date_of_birth, civil_status, active"
            f") VALUES ("
            f"v_company_id, {sql_text(emp_no)}, {sql_text(full_name)}, "
            f"{sql_text(first_name)}, {sql_text(middle_name)}, {sql_text(last_name)}, "
            f"{sql_text(position)}, {sql_text(rank)}, {sql_text(dept)}, "
            f"(SELECT id FROM departments WHERE company_id = v_company_id AND name = {sql_text(dept)} LIMIT 1), "
            f"{sql_text(normalize_employment(emp_type))}, "
            f"{sql_text(hire_date)}::date, "
            f"{sql_text(sss)}, {sql_text(tin)}, {sql_text(pagibig)}, {sql_text(philhealth)}, "
            f"{sql_text(payroll_account)}, {sql_text(payroll_bank)}, "
            f"{sql_text(normalize_gender(gender))}, {sql_text(citizenship)}, "
            f"{sql_text(work_email)}, {sql_text(personal_email)}, {sql_text(phone)}, "
            f"{sql_text(address_line1)}, {sql_text(address_line2)}, {sql_text(city)}, {sql_text(province)}, "
            f"{sql_text(birthdate)}::date, {sql_text(normalize_civil(civil))}, true"
            f") ON CONFLICT (company_id, employee_number) DO UPDATE SET"
            f" name = EXCLUDED.name,"
            f" first_name = EXCLUDED.first_name,"
            f" middle_name = EXCLUDED.middle_name,"
            f" last_name = EXCLUDED.last_name,"
            f" position_title = EXCLUDED.position_title,"
            f" role = EXCLUDED.role,"
            f" department = EXCLUDED.department,"
            f" department_id = EXCLUDED.department_id,"
            f" employment_status = EXCLUDED.employment_status,"
            f" hire_date = EXCLUDED.hire_date,"
            f" sss_number = COALESCE(EXCLUDED.sss_number, employees.sss_number),"
            f" tin_number = COALESCE(EXCLUDED.tin_number, employees.tin_number),"
            f" pagibig_number = COALESCE(EXCLUDED.pagibig_number, employees.pagibig_number),"
            f" philhealth_number = COALESCE(EXCLUDED.philhealth_number, employees.philhealth_number),"
            f" payroll_account_number = COALESCE(EXCLUDED.payroll_account_number, employees.payroll_account_number),"
            f" payroll_bank = COALESCE(EXCLUDED.payroll_bank, employees.payroll_bank),"
            f" gender = COALESCE(EXCLUDED.gender, employees.gender),"
            f" nationality = COALESCE(EXCLUDED.nationality, employees.nationality),"
            f" work_email = COALESCE(EXCLUDED.work_email, employees.work_email),"
            f" personal_email = COALESCE(EXCLUDED.personal_email, employees.personal_email),"
            f" phone = COALESCE(EXCLUDED.phone, employees.phone),"
            f" address_line1 = COALESCE(EXCLUDED.address_line1, employees.address_line1),"
            f" address_line2 = COALESCE(EXCLUDED.address_line2, employees.address_line2),"
            f" city = COALESCE(EXCLUDED.city, employees.city),"
            f" province = COALESCE(EXCLUDED.province, employees.province),"
            f" date_of_birth = COALESCE(EXCLUDED.date_of_birth, employees.date_of_birth),"
            f" civil_status = COALESCE(EXCLUDED.civil_status, employees.civil_status),"
            f" active = true;"
        )

        # Stage related rows for inserts after employees exist
        if basic_salary and basic_salary > 0:
            salary_records.append((emp_no, basic_salary, hire_date))
        if de_minimis and de_minimis > 0:
            allowance_records.append((emp_no, "DE_MINIMIS", de_minimis))
        if allowance and allowance > 0:
            allowance_records.append((emp_no, "ALLOWANCE", allowance))
        if load_plan and load_plan > 0:
            allowance_records.append((emp_no, "LOAD_PLAN", load_plan))
        if emergency_name:
            emergency_records.append((emp_no, emergency_name, emergency_phone))

    # 4. Salary records
    sql.append("")
    sql.append("  -- 4. Salary records (one per employee, monthly basis)")
    for emp_no, basic, hire_dt in salary_records:
        # daily_rate = basic / 22, hourly_rate = daily / 8
        daily = round_money(basic / 22)
        hourly = round_money(daily / 8) if daily else None
        eff_from = hire_dt or "1900-01-01"
        sql.append(
            f"  INSERT INTO salary_records (company_id, employee_id, basic_salary, daily_rate, hourly_rate, effective_from, pay_basis, days_per_month) "
            f"SELECT v_company_id, e.id, {basic:.2f}, {daily:.2f}, {hourly:.2f}, {sql_text(eff_from)}::date, 'monthly', 22 "
            f"FROM employees e WHERE e.company_id = v_company_id AND e.employee_number = {sql_text(emp_no)} "
            f"ON CONFLICT (company_id, employee_id, effective_from) DO UPDATE SET "
            f"basic_salary = EXCLUDED.basic_salary, daily_rate = EXCLUDED.daily_rate, hourly_rate = EXCLUDED.hourly_rate;"
        )

    # 5. Employee allowances
    sql.append("")
    sql.append("  -- 5. Employee allowances")
    for emp_no, code, amount in allowance_records:
        sql.append(
            f"  INSERT INTO employee_allowances (company_id, employee_id, allowance_type_id, amount, frequency, active) "
            f"SELECT v_company_id, e.id, t.id, {amount:.2f}, 'monthly', true "
            f"FROM employees e, allowance_types t "
            f"WHERE e.company_id = v_company_id AND e.employee_number = {sql_text(emp_no)} "
            f"AND t.company_id = v_company_id AND t.code = {sql_text(code)} "
            f"ON CONFLICT (company_id, employee_id, allowance_type_id) DO UPDATE SET "
            f"amount = EXCLUDED.amount, active = true;"
        )

    # 6. Emergency contacts
    # Replace existing primary contacts so re-running the import doesn't accumulate duplicates.
    sql.append("")
    sql.append("  -- 6. Emergency contacts (delete existing primary, then insert from CSV)")
    sql.append(
        "  DELETE FROM employee_emergency_contacts ec USING employees e "
        "WHERE ec.employee_id = e.id AND e.company_id = v_company_id AND ec.is_primary = true;"
    )
    for emp_no, name, phone in emergency_records:
        sql.append(
            f"  INSERT INTO employee_emergency_contacts (employee_id, name, relationship, phone, is_primary) "
            f"SELECT e.id, {sql_text(name)}, 'Not specified', {sql_text(phone or 'N/A')}, true "
            f"FROM employees e WHERE e.company_id = v_company_id AND e.employee_number = {sql_text(emp_no)};"
        )

    sql.append("")
    sql.append(f"  RAISE NOTICE 'Imported % active employees', {len(valid_rows)};")
    sql.append(f"  RAISE NOTICE 'Imported % salary records', {len(salary_records)};")
    sql.append(f"  RAISE NOTICE 'Imported % allowance assignments', {len(allowance_records)};")
    sql.append(f"  RAISE NOTICE 'Imported % emergency contacts', {len(emergency_records)};")
    sql.append("END $$;")
    sql.append("")

    # Add tenure helper function for derived display
    sql.append("")
    sql.append("-- ============================================================")
    sql.append("-- Tenure helper: completed months between hire_date and today.")
    sql.append("-- Use as: SELECT employee_tenure_months(hire_date) FROM employees;")
    sql.append("-- ============================================================")
    sql.append("CREATE OR REPLACE FUNCTION employee_tenure_months(hire date)")
    sql.append("RETURNS integer LANGUAGE sql IMMUTABLE AS $f$")
    sql.append("  SELECT CASE")
    sql.append("    WHEN hire IS NULL THEN NULL")
    sql.append("    ELSE EXTRACT(YEAR FROM AGE(CURRENT_DATE, hire))::int * 12")
    sql.append("       + EXTRACT(MONTH FROM AGE(CURRENT_DATE, hire))::int")
    sql.append("  END")
    sql.append("$f$;")
    sql.append("")

    OUT_PATH.write_text("\n".join(sql))
    print(f"Wrote {OUT_PATH}", file=sys.stderr)
    print(f"  - {len(departments)} departments", file=sys.stderr)
    print(f"  - {len(valid_rows)} employees", file=sys.stderr)
    print(f"  - {len(salary_records)} salary records", file=sys.stderr)
    print(f"  - {len(allowance_records)} allowances", file=sys.stderr)
    print(f"  - {len(emergency_records)} emergency contacts", file=sys.stderr)


if __name__ == "__main__":
    main()
