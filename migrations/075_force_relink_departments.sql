-- Hardcoded employee-number → department mapping from CSV.
-- Independent of the legacy employees.department text field.
-- Generated: 2026-04-30T14:27:50

DO $$
DECLARE
  v_company_id uuid;
BEGIN
  SELECT id INTO v_company_id FROM companies ORDER BY created_at LIMIT 1;
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'No company found.';
  END IF;

  -- 1. Ensure each department exists (case-insensitive).
  --    If a case-variant already exists, leave it; we'll match it below.
  INSERT INTO departments (company_id, name) SELECT v_company_id, 'Brand' WHERE NOT EXISTS (SELECT 1 FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Brand')));
  INSERT INTO departments (company_id, name) SELECT v_company_id, 'Business Development' WHERE NOT EXISTS (SELECT 1 FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Business Development')));
  INSERT INTO departments (company_id, name) SELECT v_company_id, 'Corporate Services' WHERE NOT EXISTS (SELECT 1 FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Corporate Services')));
  INSERT INTO departments (company_id, name) SELECT v_company_id, 'Executive' WHERE NOT EXISTS (SELECT 1 FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Executive')));
  INSERT INTO departments (company_id, name) SELECT v_company_id, 'Finance' WHERE NOT EXISTS (SELECT 1 FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Finance')));
  INSERT INTO departments (company_id, name) SELECT v_company_id, 'Growth' WHERE NOT EXISTS (SELECT 1 FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Growth')));
  INSERT INTO departments (company_id, name) SELECT v_company_id, 'HR' WHERE NOT EXISTS (SELECT 1 FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('HR')));
  INSERT INTO departments (company_id, name) SELECT v_company_id, 'Marketing' WHERE NOT EXISTS (SELECT 1 FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Marketing')));
  INSERT INTO departments (company_id, name) SELECT v_company_id, 'Medical' WHERE NOT EXISTS (SELECT 1 FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Medical')));
  INSERT INTO departments (company_id, name) SELECT v_company_id, 'Medical Research' WHERE NOT EXISTS (SELECT 1 FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Medical Research')));
  INSERT INTO departments (company_id, name) SELECT v_company_id, 'Operations' WHERE NOT EXISTS (SELECT 1 FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Operations')));
  INSERT INTO departments (company_id, name) SELECT v_company_id, 'Tech' WHERE NOT EXISTS (SELECT 1 FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Tech')));

  -- 2. Force-set department_id on each employee from CSV.
  --    Looks up the department row by case-insensitive name.
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Executive')) LIMIT 1), department = 'Executive' WHERE company_id = v_company_id AND employee_number = '0001';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Executive')) LIMIT 1), department = 'Executive' WHERE company_id = v_company_id AND employee_number = '0002';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Brand')) LIMIT 1), department = 'Brand' WHERE company_id = v_company_id AND employee_number = '0003';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Growth')) LIMIT 1), department = 'Growth' WHERE company_id = v_company_id AND employee_number = '0005';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Operations')) LIMIT 1), department = 'Operations' WHERE company_id = v_company_id AND employee_number = '0016';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Tech')) LIMIT 1), department = 'Tech' WHERE company_id = v_company_id AND employee_number = '0018';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Marketing')) LIMIT 1), department = 'Marketing' WHERE company_id = v_company_id AND employee_number = '0040';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Executive')) LIMIT 1), department = 'Executive' WHERE company_id = v_company_id AND employee_number = '0041';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('HR')) LIMIT 1), department = 'HR' WHERE company_id = v_company_id AND employee_number = '0042';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Corporate Services')) LIMIT 1), department = 'Corporate Services' WHERE company_id = v_company_id AND employee_number = '0043';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Operations')) LIMIT 1), department = 'Operations' WHERE company_id = v_company_id AND employee_number = '0045';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Finance')) LIMIT 1), department = 'Finance' WHERE company_id = v_company_id AND employee_number = '0049';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Marketing')) LIMIT 1), department = 'Marketing' WHERE company_id = v_company_id AND employee_number = '0051';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Operations')) LIMIT 1), department = 'Operations' WHERE company_id = v_company_id AND employee_number = '0056';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Operations')) LIMIT 1), department = 'Operations' WHERE company_id = v_company_id AND employee_number = '0058';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Marketing')) LIMIT 1), department = 'Marketing' WHERE company_id = v_company_id AND employee_number = '0061';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Marketing')) LIMIT 1), department = 'Marketing' WHERE company_id = v_company_id AND employee_number = '0063';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Tech')) LIMIT 1), department = 'Tech' WHERE company_id = v_company_id AND employee_number = '0065';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Tech')) LIMIT 1), department = 'Tech' WHERE company_id = v_company_id AND employee_number = '0066';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Corporate Services')) LIMIT 1), department = 'Corporate Services' WHERE company_id = v_company_id AND employee_number = '0067';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Operations')) LIMIT 1), department = 'Operations' WHERE company_id = v_company_id AND employee_number = '0071';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Marketing')) LIMIT 1), department = 'Marketing' WHERE company_id = v_company_id AND employee_number = '0073';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Executive')) LIMIT 1), department = 'Executive' WHERE company_id = v_company_id AND employee_number = '0074';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Operations')) LIMIT 1), department = 'Operations' WHERE company_id = v_company_id AND employee_number = '0076';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Operations')) LIMIT 1), department = 'Operations' WHERE company_id = v_company_id AND employee_number = '0080';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Tech')) LIMIT 1), department = 'Tech' WHERE company_id = v_company_id AND employee_number = '0081';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Medical')) LIMIT 1), department = 'Medical' WHERE company_id = v_company_id AND employee_number = '0088';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Operations')) LIMIT 1), department = 'Operations' WHERE company_id = v_company_id AND employee_number = '0091';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Operations')) LIMIT 1), department = 'Operations' WHERE company_id = v_company_id AND employee_number = '0092';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Growth')) LIMIT 1), department = 'Growth' WHERE company_id = v_company_id AND employee_number = '0093';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Tech')) LIMIT 1), department = 'Tech' WHERE company_id = v_company_id AND employee_number = '0094';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Business Development')) LIMIT 1), department = 'Business Development' WHERE company_id = v_company_id AND employee_number = '0096';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Growth')) LIMIT 1), department = 'Growth' WHERE company_id = v_company_id AND employee_number = '0102';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Operations')) LIMIT 1), department = 'Operations' WHERE company_id = v_company_id AND employee_number = '0103';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Medical Research')) LIMIT 1), department = 'Medical Research' WHERE company_id = v_company_id AND employee_number = '0104';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Corporate Services')) LIMIT 1), department = 'Corporate Services' WHERE company_id = v_company_id AND employee_number = '0105';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Medical')) LIMIT 1), department = 'Medical' WHERE company_id = v_company_id AND employee_number = 'F001';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Medical')) LIMIT 1), department = 'Medical' WHERE company_id = v_company_id AND employee_number = '0082';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Medical')) LIMIT 1), department = 'Medical' WHERE company_id = v_company_id AND employee_number = '0083';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Medical')) LIMIT 1), department = 'Medical' WHERE company_id = v_company_id AND employee_number = '0084';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Medical')) LIMIT 1), department = 'Medical' WHERE company_id = v_company_id AND employee_number = '0085';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Medical')) LIMIT 1), department = 'Medical' WHERE company_id = v_company_id AND employee_number = '0087';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Medical')) LIMIT 1), department = 'Medical' WHERE company_id = v_company_id AND employee_number = 'F002';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Medical')) LIMIT 1), department = 'Medical' WHERE company_id = v_company_id AND employee_number = '0097';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Medical')) LIMIT 1), department = 'Medical' WHERE company_id = v_company_id AND employee_number = '0098';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Medical')) LIMIT 1), department = 'Medical' WHERE company_id = v_company_id AND employee_number = '0099';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Medical')) LIMIT 1), department = 'Medical' WHERE company_id = v_company_id AND employee_number = '0100';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Medical')) LIMIT 1), department = 'Medical' WHERE company_id = v_company_id AND employee_number = 'F003';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Medical')) LIMIT 1), department = 'Medical' WHERE company_id = v_company_id AND employee_number = 'F004';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Medical')) LIMIT 1), department = 'Medical' WHERE company_id = v_company_id AND employee_number = 'F005';
  UPDATE employees SET department_id = (SELECT id FROM departments WHERE company_id = v_company_id AND lower(trim(name)) = lower(trim('Medical')) LIMIT 1), department = 'Medical' WHERE company_id = v_company_id AND employee_number = 'F006';

  RAISE NOTICE 'Force-relinked % employees to their CSV departments', 51;
END $$;
