-- Canonicalize departments to match the CSV exactly:
--   1. Ensure each CSV department exists with its exact name (Title Case).
--   2. Merge case-variant duplicates into the canonical row.
--   3. Delete any department NOT in the CSV.
--   4. Re-link employees from CSV mapping.
-- Generated: 2026-04-30T14:33:43

DO $proc$
DECLARE
  v_company_id uuid;
  v_canonical_id uuid;
BEGIN
  SELECT id INTO v_company_id FROM companies ORDER BY created_at LIMIT 1;
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'No company found.';
  END IF;

  -- 1+2. For each CSV department: ensure canonical row, merge case-variants.

  -- Brand
  SELECT id INTO v_canonical_id FROM departments WHERE company_id = v_company_id AND name = 'Brand' LIMIT 1;
  IF v_canonical_id IS NULL THEN
    SELECT id INTO v_canonical_id FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Brand')) ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF v_canonical_id IS NULL THEN
    INSERT INTO departments (company_id, name) VALUES (v_company_id, 'Brand') RETURNING id INTO v_canonical_id;
  ELSE
    -- Force the canonical row's name to match the CSV exactly
    UPDATE departments SET name = 'Brand' WHERE id = v_canonical_id;
  END IF;
  UPDATE employees SET department_id = v_canonical_id WHERE company_id = v_company_id AND department_id IN (SELECT id FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Brand')) AND id <> v_canonical_id);
  UPDATE departments SET parent_department_id = v_canonical_id WHERE parent_department_id IN (SELECT id FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Brand')) AND id <> v_canonical_id);
  DELETE FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Brand')) AND id <> v_canonical_id;

  -- Business Development
  SELECT id INTO v_canonical_id FROM departments WHERE company_id = v_company_id AND name = 'Business Development' LIMIT 1;
  IF v_canonical_id IS NULL THEN
    SELECT id INTO v_canonical_id FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Business Development')) ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF v_canonical_id IS NULL THEN
    INSERT INTO departments (company_id, name) VALUES (v_company_id, 'Business Development') RETURNING id INTO v_canonical_id;
  ELSE
    -- Force the canonical row's name to match the CSV exactly
    UPDATE departments SET name = 'Business Development' WHERE id = v_canonical_id;
  END IF;
  UPDATE employees SET department_id = v_canonical_id WHERE company_id = v_company_id AND department_id IN (SELECT id FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Business Development')) AND id <> v_canonical_id);
  UPDATE departments SET parent_department_id = v_canonical_id WHERE parent_department_id IN (SELECT id FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Business Development')) AND id <> v_canonical_id);
  DELETE FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Business Development')) AND id <> v_canonical_id;

  -- Corporate Services
  SELECT id INTO v_canonical_id FROM departments WHERE company_id = v_company_id AND name = 'Corporate Services' LIMIT 1;
  IF v_canonical_id IS NULL THEN
    SELECT id INTO v_canonical_id FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Corporate Services')) ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF v_canonical_id IS NULL THEN
    INSERT INTO departments (company_id, name) VALUES (v_company_id, 'Corporate Services') RETURNING id INTO v_canonical_id;
  ELSE
    -- Force the canonical row's name to match the CSV exactly
    UPDATE departments SET name = 'Corporate Services' WHERE id = v_canonical_id;
  END IF;
  UPDATE employees SET department_id = v_canonical_id WHERE company_id = v_company_id AND department_id IN (SELECT id FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Corporate Services')) AND id <> v_canonical_id);
  UPDATE departments SET parent_department_id = v_canonical_id WHERE parent_department_id IN (SELECT id FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Corporate Services')) AND id <> v_canonical_id);
  DELETE FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Corporate Services')) AND id <> v_canonical_id;

  -- Executive
  SELECT id INTO v_canonical_id FROM departments WHERE company_id = v_company_id AND name = 'Executive' LIMIT 1;
  IF v_canonical_id IS NULL THEN
    SELECT id INTO v_canonical_id FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Executive')) ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF v_canonical_id IS NULL THEN
    INSERT INTO departments (company_id, name) VALUES (v_company_id, 'Executive') RETURNING id INTO v_canonical_id;
  ELSE
    -- Force the canonical row's name to match the CSV exactly
    UPDATE departments SET name = 'Executive' WHERE id = v_canonical_id;
  END IF;
  UPDATE employees SET department_id = v_canonical_id WHERE company_id = v_company_id AND department_id IN (SELECT id FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Executive')) AND id <> v_canonical_id);
  UPDATE departments SET parent_department_id = v_canonical_id WHERE parent_department_id IN (SELECT id FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Executive')) AND id <> v_canonical_id);
  DELETE FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Executive')) AND id <> v_canonical_id;

  -- Finance
  SELECT id INTO v_canonical_id FROM departments WHERE company_id = v_company_id AND name = 'Finance' LIMIT 1;
  IF v_canonical_id IS NULL THEN
    SELECT id INTO v_canonical_id FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Finance')) ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF v_canonical_id IS NULL THEN
    INSERT INTO departments (company_id, name) VALUES (v_company_id, 'Finance') RETURNING id INTO v_canonical_id;
  ELSE
    -- Force the canonical row's name to match the CSV exactly
    UPDATE departments SET name = 'Finance' WHERE id = v_canonical_id;
  END IF;
  UPDATE employees SET department_id = v_canonical_id WHERE company_id = v_company_id AND department_id IN (SELECT id FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Finance')) AND id <> v_canonical_id);
  UPDATE departments SET parent_department_id = v_canonical_id WHERE parent_department_id IN (SELECT id FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Finance')) AND id <> v_canonical_id);
  DELETE FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Finance')) AND id <> v_canonical_id;

  -- Growth
  SELECT id INTO v_canonical_id FROM departments WHERE company_id = v_company_id AND name = 'Growth' LIMIT 1;
  IF v_canonical_id IS NULL THEN
    SELECT id INTO v_canonical_id FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Growth')) ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF v_canonical_id IS NULL THEN
    INSERT INTO departments (company_id, name) VALUES (v_company_id, 'Growth') RETURNING id INTO v_canonical_id;
  ELSE
    -- Force the canonical row's name to match the CSV exactly
    UPDATE departments SET name = 'Growth' WHERE id = v_canonical_id;
  END IF;
  UPDATE employees SET department_id = v_canonical_id WHERE company_id = v_company_id AND department_id IN (SELECT id FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Growth')) AND id <> v_canonical_id);
  UPDATE departments SET parent_department_id = v_canonical_id WHERE parent_department_id IN (SELECT id FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Growth')) AND id <> v_canonical_id);
  DELETE FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Growth')) AND id <> v_canonical_id;

  -- HR
  SELECT id INTO v_canonical_id FROM departments WHERE company_id = v_company_id AND name = 'HR' LIMIT 1;
  IF v_canonical_id IS NULL THEN
    SELECT id INTO v_canonical_id FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('HR')) ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF v_canonical_id IS NULL THEN
    INSERT INTO departments (company_id, name) VALUES (v_company_id, 'HR') RETURNING id INTO v_canonical_id;
  ELSE
    -- Force the canonical row's name to match the CSV exactly
    UPDATE departments SET name = 'HR' WHERE id = v_canonical_id;
  END IF;
  UPDATE employees SET department_id = v_canonical_id WHERE company_id = v_company_id AND department_id IN (SELECT id FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('HR')) AND id <> v_canonical_id);
  UPDATE departments SET parent_department_id = v_canonical_id WHERE parent_department_id IN (SELECT id FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('HR')) AND id <> v_canonical_id);
  DELETE FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('HR')) AND id <> v_canonical_id;

  -- Marketing
  SELECT id INTO v_canonical_id FROM departments WHERE company_id = v_company_id AND name = 'Marketing' LIMIT 1;
  IF v_canonical_id IS NULL THEN
    SELECT id INTO v_canonical_id FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Marketing')) ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF v_canonical_id IS NULL THEN
    INSERT INTO departments (company_id, name) VALUES (v_company_id, 'Marketing') RETURNING id INTO v_canonical_id;
  ELSE
    -- Force the canonical row's name to match the CSV exactly
    UPDATE departments SET name = 'Marketing' WHERE id = v_canonical_id;
  END IF;
  UPDATE employees SET department_id = v_canonical_id WHERE company_id = v_company_id AND department_id IN (SELECT id FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Marketing')) AND id <> v_canonical_id);
  UPDATE departments SET parent_department_id = v_canonical_id WHERE parent_department_id IN (SELECT id FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Marketing')) AND id <> v_canonical_id);
  DELETE FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Marketing')) AND id <> v_canonical_id;

  -- Medical
  SELECT id INTO v_canonical_id FROM departments WHERE company_id = v_company_id AND name = 'Medical' LIMIT 1;
  IF v_canonical_id IS NULL THEN
    SELECT id INTO v_canonical_id FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Medical')) ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF v_canonical_id IS NULL THEN
    INSERT INTO departments (company_id, name) VALUES (v_company_id, 'Medical') RETURNING id INTO v_canonical_id;
  ELSE
    -- Force the canonical row's name to match the CSV exactly
    UPDATE departments SET name = 'Medical' WHERE id = v_canonical_id;
  END IF;
  UPDATE employees SET department_id = v_canonical_id WHERE company_id = v_company_id AND department_id IN (SELECT id FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Medical')) AND id <> v_canonical_id);
  UPDATE departments SET parent_department_id = v_canonical_id WHERE parent_department_id IN (SELECT id FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Medical')) AND id <> v_canonical_id);
  DELETE FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Medical')) AND id <> v_canonical_id;

  -- Medical Research
  SELECT id INTO v_canonical_id FROM departments WHERE company_id = v_company_id AND name = 'Medical Research' LIMIT 1;
  IF v_canonical_id IS NULL THEN
    SELECT id INTO v_canonical_id FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Medical Research')) ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF v_canonical_id IS NULL THEN
    INSERT INTO departments (company_id, name) VALUES (v_company_id, 'Medical Research') RETURNING id INTO v_canonical_id;
  ELSE
    -- Force the canonical row's name to match the CSV exactly
    UPDATE departments SET name = 'Medical Research' WHERE id = v_canonical_id;
  END IF;
  UPDATE employees SET department_id = v_canonical_id WHERE company_id = v_company_id AND department_id IN (SELECT id FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Medical Research')) AND id <> v_canonical_id);
  UPDATE departments SET parent_department_id = v_canonical_id WHERE parent_department_id IN (SELECT id FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Medical Research')) AND id <> v_canonical_id);
  DELETE FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Medical Research')) AND id <> v_canonical_id;

  -- Operations
  SELECT id INTO v_canonical_id FROM departments WHERE company_id = v_company_id AND name = 'Operations' LIMIT 1;
  IF v_canonical_id IS NULL THEN
    SELECT id INTO v_canonical_id FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Operations')) ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF v_canonical_id IS NULL THEN
    INSERT INTO departments (company_id, name) VALUES (v_company_id, 'Operations') RETURNING id INTO v_canonical_id;
  ELSE
    -- Force the canonical row's name to match the CSV exactly
    UPDATE departments SET name = 'Operations' WHERE id = v_canonical_id;
  END IF;
  UPDATE employees SET department_id = v_canonical_id WHERE company_id = v_company_id AND department_id IN (SELECT id FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Operations')) AND id <> v_canonical_id);
  UPDATE departments SET parent_department_id = v_canonical_id WHERE parent_department_id IN (SELECT id FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Operations')) AND id <> v_canonical_id);
  DELETE FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Operations')) AND id <> v_canonical_id;

  -- Tech
  SELECT id INTO v_canonical_id FROM departments WHERE company_id = v_company_id AND name = 'Tech' LIMIT 1;
  IF v_canonical_id IS NULL THEN
    SELECT id INTO v_canonical_id FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Tech')) ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF v_canonical_id IS NULL THEN
    INSERT INTO departments (company_id, name) VALUES (v_company_id, 'Tech') RETURNING id INTO v_canonical_id;
  ELSE
    -- Force the canonical row's name to match the CSV exactly
    UPDATE departments SET name = 'Tech' WHERE id = v_canonical_id;
  END IF;
  UPDATE employees SET department_id = v_canonical_id WHERE company_id = v_company_id AND department_id IN (SELECT id FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Tech')) AND id <> v_canonical_id);
  UPDATE departments SET parent_department_id = v_canonical_id WHERE parent_department_id IN (SELECT id FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Tech')) AND id <> v_canonical_id);
  DELETE FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Tech')) AND id <> v_canonical_id;

  -- 3. Drop legacy departments not in the CSV.
  --    Null out any employees still pointing at them first;
  --    step 4 below will relink them per the CSV mapping.
  UPDATE employees SET department_id = NULL WHERE company_id = v_company_id AND department_id IN (SELECT id FROM departments WHERE company_id = v_company_id AND name NOT IN ('Brand', 'Business Development', 'Corporate Services', 'Executive', 'Finance', 'Growth', 'HR', 'Marketing', 'Medical', 'Medical Research', 'Operations', 'Tech'));
  DELETE FROM departments WHERE company_id = v_company_id AND name NOT IN ('Brand', 'Business Development', 'Corporate Services', 'Executive', 'Finance', 'Growth', 'HR', 'Marketing', 'Medical', 'Medical Research', 'Operations', 'Tech');

  -- 4. Force-link each employee to the canonical department row.
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND name = 'Executive' LIMIT 1), department = 'Executive' WHERE company_id = v_company_id AND employee_number = '0001';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND name = 'Executive' LIMIT 1), department = 'Executive' WHERE company_id = v_company_id AND employee_number = '0002';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND name = 'Brand' LIMIT 1), department = 'Brand' WHERE company_id = v_company_id AND employee_number = '0003';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND name = 'Growth' LIMIT 1), department = 'Growth' WHERE company_id = v_company_id AND employee_number = '0005';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND name = 'Operations' LIMIT 1), department = 'Operations' WHERE company_id = v_company_id AND employee_number = '0016';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND name = 'Tech' LIMIT 1), department = 'Tech' WHERE company_id = v_company_id AND employee_number = '0018';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND name = 'Marketing' LIMIT 1), department = 'Marketing' WHERE company_id = v_company_id AND employee_number = '0040';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND name = 'Executive' LIMIT 1), department = 'Executive' WHERE company_id = v_company_id AND employee_number = '0041';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND name = 'HR' LIMIT 1), department = 'HR' WHERE company_id = v_company_id AND employee_number = '0042';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND name = 'Corporate Services' LIMIT 1), department = 'Corporate Services' WHERE company_id = v_company_id AND employee_number = '0043';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND name = 'Operations' LIMIT 1), department = 'Operations' WHERE company_id = v_company_id AND employee_number = '0045';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND name = 'Finance' LIMIT 1), department = 'Finance' WHERE company_id = v_company_id AND employee_number = '0049';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND name = 'Marketing' LIMIT 1), department = 'Marketing' WHERE company_id = v_company_id AND employee_number = '0051';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND name = 'Operations' LIMIT 1), department = 'Operations' WHERE company_id = v_company_id AND employee_number = '0056';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND name = 'Operations' LIMIT 1), department = 'Operations' WHERE company_id = v_company_id AND employee_number = '0058';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND name = 'Marketing' LIMIT 1), department = 'Marketing' WHERE company_id = v_company_id AND employee_number = '0061';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND name = 'Marketing' LIMIT 1), department = 'Marketing' WHERE company_id = v_company_id AND employee_number = '0063';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND name = 'Tech' LIMIT 1), department = 'Tech' WHERE company_id = v_company_id AND employee_number = '0065';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND name = 'Tech' LIMIT 1), department = 'Tech' WHERE company_id = v_company_id AND employee_number = '0066';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND name = 'Corporate Services' LIMIT 1), department = 'Corporate Services' WHERE company_id = v_company_id AND employee_number = '0067';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND name = 'Operations' LIMIT 1), department = 'Operations' WHERE company_id = v_company_id AND employee_number = '0071';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND name = 'Marketing' LIMIT 1), department = 'Marketing' WHERE company_id = v_company_id AND employee_number = '0073';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND name = 'Executive' LIMIT 1), department = 'Executive' WHERE company_id = v_company_id AND employee_number = '0074';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND name = 'Operations' LIMIT 1), department = 'Operations' WHERE company_id = v_company_id AND employee_number = '0076';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND name = 'Operations' LIMIT 1), department = 'Operations' WHERE company_id = v_company_id AND employee_number = '0080';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND name = 'Tech' LIMIT 1), department = 'Tech' WHERE company_id = v_company_id AND employee_number = '0081';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND name = 'Medical' LIMIT 1), department = 'Medical' WHERE company_id = v_company_id AND employee_number = '0088';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND name = 'Operations' LIMIT 1), department = 'Operations' WHERE company_id = v_company_id AND employee_number = '0091';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND name = 'Operations' LIMIT 1), department = 'Operations' WHERE company_id = v_company_id AND employee_number = '0092';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND name = 'Growth' LIMIT 1), department = 'Growth' WHERE company_id = v_company_id AND employee_number = '0093';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND name = 'Tech' LIMIT 1), department = 'Tech' WHERE company_id = v_company_id AND employee_number = '0094';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND name = 'Business Development' LIMIT 1), department = 'Business Development' WHERE company_id = v_company_id AND employee_number = '0096';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND name = 'Growth' LIMIT 1), department = 'Growth' WHERE company_id = v_company_id AND employee_number = '0102';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND name = 'Operations' LIMIT 1), department = 'Operations' WHERE company_id = v_company_id AND employee_number = '0103';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND name = 'Medical Research' LIMIT 1), department = 'Medical Research' WHERE company_id = v_company_id AND employee_number = '0104';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND name = 'Corporate Services' LIMIT 1), department = 'Corporate Services' WHERE company_id = v_company_id AND employee_number = '0105';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND name = 'Medical' LIMIT 1), department = 'Medical' WHERE company_id = v_company_id AND employee_number = 'F001';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND name = 'Medical' LIMIT 1), department = 'Medical' WHERE company_id = v_company_id AND employee_number = '0082';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND name = 'Medical' LIMIT 1), department = 'Medical' WHERE company_id = v_company_id AND employee_number = '0083';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND name = 'Medical' LIMIT 1), department = 'Medical' WHERE company_id = v_company_id AND employee_number = '0084';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND name = 'Medical' LIMIT 1), department = 'Medical' WHERE company_id = v_company_id AND employee_number = '0085';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND name = 'Medical' LIMIT 1), department = 'Medical' WHERE company_id = v_company_id AND employee_number = '0087';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND name = 'Medical' LIMIT 1), department = 'Medical' WHERE company_id = v_company_id AND employee_number = 'F002';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND name = 'Medical' LIMIT 1), department = 'Medical' WHERE company_id = v_company_id AND employee_number = '0097';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND name = 'Medical' LIMIT 1), department = 'Medical' WHERE company_id = v_company_id AND employee_number = '0098';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND name = 'Medical' LIMIT 1), department = 'Medical' WHERE company_id = v_company_id AND employee_number = '0099';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND name = 'Medical' LIMIT 1), department = 'Medical' WHERE company_id = v_company_id AND employee_number = '0100';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND name = 'Medical' LIMIT 1), department = 'Medical' WHERE company_id = v_company_id AND employee_number = 'F003';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND name = 'Medical' LIMIT 1), department = 'Medical' WHERE company_id = v_company_id AND employee_number = 'F004';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND name = 'Medical' LIMIT 1), department = 'Medical' WHERE company_id = v_company_id AND employee_number = 'F005';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND name = 'Medical' LIMIT 1), department = 'Medical' WHERE company_id = v_company_id AND employee_number = 'F006';

  RAISE NOTICE 'Department cleanup complete: % canonical departments, % employees re-linked', 12, 51;
END $proc$;
