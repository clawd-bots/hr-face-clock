-- Bank/payroll account columns for employees.
-- Used by the HR Masterlist importer (070_import_active_employees.sql).

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS payroll_account_number text,
  ADD COLUMN IF NOT EXISTS payroll_bank          text;

-- Optional: enum-like check for known banks. Soft constraint so ad-hoc values still load.
COMMENT ON COLUMN employees.payroll_bank IS 'Receiving bank short code: UB, BDO, BPI, SeaBank, etc.';
