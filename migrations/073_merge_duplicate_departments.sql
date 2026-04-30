-- ============================================================
-- Merge case-variant department duplicates.
-- The departments table has UNIQUE(company_id, name) which is
-- case-sensitive in Postgres, so 'Tech' and 'tech' (or trailing
-- spaces) can coexist. Pick a canonical name per case-insensitive
-- group, repoint employees, then delete the duplicates.
-- ============================================================

DO $$
DECLARE
  r RECORD;
  canonical_id uuid;
  canonical_name text;
BEGIN
  -- Walk every (company, lowercase trimmed name) group with > 1 row
  FOR r IN
    SELECT company_id, lower(trim(name)) AS norm_name, count(*) AS n
    FROM departments
    GROUP BY company_id, lower(trim(name))
    HAVING count(*) > 1
  LOOP
    -- Choose the canonical: prefer the one matching Title Case if it
    -- exists, otherwise the most recently created row.
    SELECT id, name INTO canonical_id, canonical_name
    FROM departments
    WHERE company_id = r.company_id
      AND lower(trim(name)) = r.norm_name
    ORDER BY
      (name = initcap(r.norm_name)) DESC,  -- Title-Case first
      created_at DESC
    LIMIT 1;

    -- Repoint employees from any duplicate to the canonical id
    UPDATE employees
    SET department_id = canonical_id
    WHERE company_id = r.company_id
      AND department_id IN (
        SELECT id FROM departments
        WHERE company_id = r.company_id
          AND lower(trim(name)) = r.norm_name
          AND id <> canonical_id
      );

    -- Repoint sub-departments (parent_department_id) too
    UPDATE departments
    SET parent_department_id = canonical_id
    WHERE company_id = r.company_id
      AND parent_department_id IN (
        SELECT id FROM departments
        WHERE company_id = r.company_id
          AND lower(trim(name)) = r.norm_name
          AND id <> canonical_id
      );

    -- Delete the now-orphaned duplicates
    DELETE FROM departments
    WHERE company_id = r.company_id
      AND lower(trim(name)) = r.norm_name
      AND id <> canonical_id;

    -- Trim whitespace and ensure Title Case on the canonical row
    UPDATE departments
    SET name = initcap(r.norm_name)
    WHERE id = canonical_id
      AND name <> initcap(r.norm_name);

    RAISE NOTICE 'Merged % duplicates into "%"', r.n - 1, initcap(r.norm_name);
  END LOOP;

  -- Catch-all: clean trailing whitespace and weird casing on remaining
  -- single rows so the list looks consistent.
  UPDATE departments
  SET name = trim(name)
  WHERE name <> trim(name);

  RAISE NOTICE 'Department merge complete';
END $$;
