-- ============================================================
-- Re-link every employee's department_id from the legacy
-- 'department' text field. If a matching department row doesn't
-- exist, create it. Idempotent — safe to re-run.
-- ============================================================

DO $$
DECLARE
  v_company_id uuid;
  emp RECORD;
  dept_id uuid;
BEGIN
  SELECT id INTO v_company_id FROM companies ORDER BY created_at LIMIT 1;
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'No company found.';
  END IF;

  -- Make sure the canonical Tech row exists (and any other dept names
  -- referenced by employees but missing from departments).
  INSERT INTO departments (company_id, name)
  SELECT DISTINCT v_company_id, trim(e.department)
  FROM employees e
  WHERE e.company_id = v_company_id
    AND e.department IS NOT NULL
    AND trim(e.department) <> ''
    AND NOT EXISTS (
      SELECT 1 FROM departments d
      WHERE d.company_id = v_company_id
        AND lower(trim(d.name)) = lower(trim(e.department))
    );

  -- Repoint each employee to the matching department by case-insensitive name
  FOR emp IN
    SELECT id, department FROM employees
    WHERE company_id = v_company_id
      AND department IS NOT NULL
      AND trim(department) <> ''
  LOOP
    SELECT id INTO dept_id FROM departments
    WHERE company_id = v_company_id
      AND lower(trim(name)) = lower(trim(emp.department))
    LIMIT 1;

    IF dept_id IS NOT NULL THEN
      UPDATE employees
      SET department_id = dept_id
      WHERE id = emp.id
        AND (department_id IS DISTINCT FROM dept_id);
    END IF;
  END LOOP;

  RAISE NOTICE 'Department re-link complete';
END $$;
