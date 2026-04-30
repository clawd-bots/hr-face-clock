-- Fix gender, civil_status, and emergency contacts that
-- did not make it through the main import (070).
-- Generated: 2026-04-30T14:12:43

DO $$
DECLARE
  v_company_id uuid;
BEGIN
  SELECT id INTO v_company_id FROM companies ORDER BY created_at LIMIT 1;
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'No company found.';
  END IF;

  -- 1. Force-update gender + civil_status from CSV (overwrites NULL or stale values)
  UPDATE employees SET civil_status = 'single' WHERE company_id = v_company_id AND employee_number = '0001';
  UPDATE employees SET gender = 'female', civil_status = 'single' WHERE company_id = v_company_id AND employee_number = '0002';
  UPDATE employees SET gender = 'male' WHERE company_id = v_company_id AND employee_number = '0003';
  UPDATE employees SET gender = 'male', civil_status = 'single' WHERE company_id = v_company_id AND employee_number = '0005';
  UPDATE employees SET gender = 'male', civil_status = 'single' WHERE company_id = v_company_id AND employee_number = '0016';
  UPDATE employees SET gender = 'male', civil_status = 'single' WHERE company_id = v_company_id AND employee_number = '0018';
  UPDATE employees SET gender = 'male', civil_status = 'single' WHERE company_id = v_company_id AND employee_number = '0040';
  UPDATE employees SET gender = 'female', civil_status = 'single' WHERE company_id = v_company_id AND employee_number = '0041';
  UPDATE employees SET gender = 'female', civil_status = 'single' WHERE company_id = v_company_id AND employee_number = '0042';
  UPDATE employees SET gender = 'male', civil_status = 'single' WHERE company_id = v_company_id AND employee_number = '0043';
  UPDATE employees SET gender = 'male', civil_status = 'single' WHERE company_id = v_company_id AND employee_number = '0045';
  UPDATE employees SET gender = 'male', civil_status = 'single' WHERE company_id = v_company_id AND employee_number = '0049';
  UPDATE employees SET gender = 'female', civil_status = 'single' WHERE company_id = v_company_id AND employee_number = '0051';
  UPDATE employees SET gender = 'male', civil_status = 'married' WHERE company_id = v_company_id AND employee_number = '0056';
  UPDATE employees SET gender = 'female', civil_status = 'single' WHERE company_id = v_company_id AND employee_number = '0058';
  UPDATE employees SET gender = 'female', civil_status = 'single' WHERE company_id = v_company_id AND employee_number = '0061';
  UPDATE employees SET gender = 'female', civil_status = 'single' WHERE company_id = v_company_id AND employee_number = '0063';
  UPDATE employees SET gender = 'male', civil_status = 'single' WHERE company_id = v_company_id AND employee_number = '0065';
  UPDATE employees SET gender = 'male', civil_status = 'single' WHERE company_id = v_company_id AND employee_number = '0066';
  UPDATE employees SET gender = 'male', civil_status = 'single' WHERE company_id = v_company_id AND employee_number = '0067';
  UPDATE employees SET gender = 'male', civil_status = 'single' WHERE company_id = v_company_id AND employee_number = '0071';
  UPDATE employees SET gender = 'male', civil_status = 'married' WHERE company_id = v_company_id AND employee_number = '0073';
  UPDATE employees SET gender = 'female', civil_status = 'single' WHERE company_id = v_company_id AND employee_number = '0074';
  UPDATE employees SET gender = 'male', civil_status = 'married' WHERE company_id = v_company_id AND employee_number = '0076';
  UPDATE employees SET gender = 'female', civil_status = 'single' WHERE company_id = v_company_id AND employee_number = '0080';
  UPDATE employees SET gender = 'male', civil_status = 'single' WHERE company_id = v_company_id AND employee_number = '0081';
  UPDATE employees SET gender = 'female', civil_status = 'single' WHERE company_id = v_company_id AND employee_number = '0088';
  UPDATE employees SET gender = 'male', civil_status = 'single' WHERE company_id = v_company_id AND employee_number = '0091';
  UPDATE employees SET gender = 'female', civil_status = 'single' WHERE company_id = v_company_id AND employee_number = '0092';
  UPDATE employees SET gender = 'male', civil_status = 'married' WHERE company_id = v_company_id AND employee_number = '0093';
  UPDATE employees SET gender = 'male', civil_status = 'single' WHERE company_id = v_company_id AND employee_number = '0094';
  UPDATE employees SET gender = 'male', civil_status = 'single' WHERE company_id = v_company_id AND employee_number = '0096';
  UPDATE employees SET civil_status = 'single' WHERE company_id = v_company_id AND employee_number = '0102';
  UPDATE employees SET gender = 'female', civil_status = 'single' WHERE company_id = v_company_id AND employee_number = '0103';
  UPDATE employees SET gender = 'male', civil_status = 'single' WHERE company_id = v_company_id AND employee_number = '0104';
  UPDATE employees SET gender = 'female', civil_status = 'single' WHERE company_id = v_company_id AND employee_number = '0105';
  UPDATE employees SET gender = 'female', civil_status = 'single' WHERE company_id = v_company_id AND employee_number = 'F001';
  UPDATE employees SET gender = 'male', civil_status = 'single' WHERE company_id = v_company_id AND employee_number = '0082';
  UPDATE employees SET gender = 'female', civil_status = 'married' WHERE company_id = v_company_id AND employee_number = '0083';
  UPDATE employees SET gender = 'female', civil_status = 'single' WHERE company_id = v_company_id AND employee_number = '0084';
  UPDATE employees SET gender = 'female', civil_status = 'single' WHERE company_id = v_company_id AND employee_number = '0085';
  UPDATE employees SET gender = 'male', civil_status = 'single' WHERE company_id = v_company_id AND employee_number = '0087';
  UPDATE employees SET gender = 'male', civil_status = 'single' WHERE company_id = v_company_id AND employee_number = 'F002';
  UPDATE employees SET gender = 'female', civil_status = 'single' WHERE company_id = v_company_id AND employee_number = '0097';
  UPDATE employees SET gender = 'female', civil_status = 'single' WHERE company_id = v_company_id AND employee_number = '0098';
  UPDATE employees SET gender = 'male', civil_status = 'single' WHERE company_id = v_company_id AND employee_number = '0099';
  UPDATE employees SET gender = 'female', civil_status = 'single' WHERE company_id = v_company_id AND employee_number = '0100';
  UPDATE employees SET gender = 'female', civil_status = 'single' WHERE company_id = v_company_id AND employee_number = 'F003';
  UPDATE employees SET gender = 'female', civil_status = 'single' WHERE company_id = v_company_id AND employee_number = 'F004';
  UPDATE employees SET gender = 'male', civil_status = 'single' WHERE company_id = v_company_id AND employee_number = 'F005';
  UPDATE employees SET gender = 'female', civil_status = 'single' WHERE company_id = v_company_id AND employee_number = 'F006';

  -- 2. Wipe and re-insert primary emergency contacts from CSV
  DELETE FROM employee_emergency_contacts ec USING employees e WHERE ec.employee_id = e.id AND e.company_id = v_company_id AND ec.is_primary = true;
  INSERT INTO employee_emergency_contacts (employee_id, name, relationship, phone, is_primary) SELECT e.id, 'Gianna Sofia A. Señar', 'Not specified', '09171859211', true FROM employees e WHERE e.company_id = v_company_id AND e.employee_number = '0002';
  INSERT INTO employee_emergency_contacts (employee_id, name, relationship, phone, is_primary) SELECT e.id, 'Joshua Jose Dizon', 'Not specified', '09164336812', true FROM employees e WHERE e.company_id = v_company_id AND e.employee_number = '0016';
  INSERT INTO employee_emergency_contacts (employee_id, name, relationship, phone, is_primary) SELECT e.id, 'Scarlet Chen', 'Not specified', '09458091128', true FROM employees e WHERE e.company_id = v_company_id AND e.employee_number = '0018';
  INSERT INTO employee_emergency_contacts (employee_id, name, relationship, phone, is_primary) SELECT e.id, 'Micah Munoz', 'Not specified', '09491330863', true FROM employees e WHERE e.company_id = v_company_id AND e.employee_number = '0040';
  INSERT INTO employee_emergency_contacts (employee_id, name, relationship, phone, is_primary) SELECT e.id, 'Gethsemane De Jesus', 'Not specified', '09088831201', true FROM employees e WHERE e.company_id = v_company_id AND e.employee_number = '0041';
  INSERT INTO employee_emergency_contacts (employee_id, name, relationship, phone, is_primary) SELECT e.id, 'Kristian Aaron Mirasol', 'Not specified', '09271214151', true FROM employees e WHERE e.company_id = v_company_id AND e.employee_number = '0042';
  INSERT INTO employee_emergency_contacts (employee_id, name, relationship, phone, is_primary) SELECT e.id, 'Claude Manusig', 'Not specified', '09560794773', true FROM employees e WHERE e.company_id = v_company_id AND e.employee_number = '0043';
  INSERT INTO employee_emergency_contacts (employee_id, name, relationship, phone, is_primary) SELECT e.id, 'Catherine Joy Flores', 'Not specified', '09561247118', true FROM employees e WHERE e.company_id = v_company_id AND e.employee_number = '0049';
  INSERT INTO employee_emergency_contacts (employee_id, name, relationship, phone, is_primary) SELECT e.id, 'Abigail Amoncio', 'Not specified', '09778311615', true FROM employees e WHERE e.company_id = v_company_id AND e.employee_number = '0051';
  INSERT INTO employee_emergency_contacts (employee_id, name, relationship, phone, is_primary) SELECT e.id, 'Stefanny Navarro', 'Not specified', '09970792763', true FROM employees e WHERE e.company_id = v_company_id AND e.employee_number = '0056';
  INSERT INTO employee_emergency_contacts (employee_id, name, relationship, phone, is_primary) SELECT e.id, 'Valerie Aquilino', 'Not specified', '09178401030', true FROM employees e WHERE e.company_id = v_company_id AND e.employee_number = '0058';
  INSERT INTO employee_emergency_contacts (employee_id, name, relationship, phone, is_primary) SELECT e.id, 'Rosemarie Calma Gagahina', 'Not specified', '09392058271', true FROM employees e WHERE e.company_id = v_company_id AND e.employee_number = '0061';
  INSERT INTO employee_emergency_contacts (employee_id, name, relationship, phone, is_primary) SELECT e.id, 'Shirley Galang', 'Not specified', '09175787632', true FROM employees e WHERE e.company_id = v_company_id AND e.employee_number = '0063';
  INSERT INTO employee_emergency_contacts (employee_id, name, relationship, phone, is_primary) SELECT e.id, 'Roselle R. Morales', 'Not specified', '09568095866', true FROM employees e WHERE e.company_id = v_company_id AND e.employee_number = '0065';
  INSERT INTO employee_emergency_contacts (employee_id, name, relationship, phone, is_primary) SELECT e.id, 'Pinky Mariano', 'Not specified', '09175318697', true FROM employees e WHERE e.company_id = v_company_id AND e.employee_number = '0066';
  INSERT INTO employee_emergency_contacts (employee_id, name, relationship, phone, is_primary) SELECT e.id, 'Berlyn Atim', 'Not specified', '09563972990', true FROM employees e WHERE e.company_id = v_company_id AND e.employee_number = '0067';
  INSERT INTO employee_emergency_contacts (employee_id, name, relationship, phone, is_primary) SELECT e.id, 'Leonida Arceo', 'Not specified', '09150653919', true FROM employees e WHERE e.company_id = v_company_id AND e.employee_number = '0071';
  INSERT INTO employee_emergency_contacts (employee_id, name, relationship, phone, is_primary) SELECT e.id, 'Liezyl Marie Calingacion', 'Not specified', '09774239800', true FROM employees e WHERE e.company_id = v_company_id AND e.employee_number = '0073';
  INSERT INTO employee_emergency_contacts (employee_id, name, relationship, phone, is_primary) SELECT e.id, 'Jenz Songsong', 'Not specified', '09171184292', true FROM employees e WHERE e.company_id = v_company_id AND e.employee_number = '0074';
  INSERT INTO employee_emergency_contacts (employee_id, name, relationship, phone, is_primary) SELECT e.id, 'Erlinda Bumanglag', 'Not specified', '09151956567', true FROM employees e WHERE e.company_id = v_company_id AND e.employee_number = '0076';
  INSERT INTO employee_emergency_contacts (employee_id, name, relationship, phone, is_primary) SELECT e.id, 'Cherry Bernardino', 'Not specified', '09253197709', true FROM employees e WHERE e.company_id = v_company_id AND e.employee_number = '0080';
  INSERT INTO employee_emergency_contacts (employee_id, name, relationship, phone, is_primary) SELECT e.id, 'Pamela Augustin', 'Not specified', '09772853983', true FROM employees e WHERE e.company_id = v_company_id AND e.employee_number = '0081';
  INSERT INTO employee_emergency_contacts (employee_id, name, relationship, phone, is_primary) SELECT e.id, 'Joseph Sonio', 'Not specified', '09266695482', true FROM employees e WHERE e.company_id = v_company_id AND e.employee_number = '0088';
  INSERT INTO employee_emergency_contacts (employee_id, name, relationship, phone, is_primary) SELECT e.id, 'Olive Faustino', 'Not specified', '09623081776', true FROM employees e WHERE e.company_id = v_company_id AND e.employee_number = '0091';
  INSERT INTO employee_emergency_contacts (employee_id, name, relationship, phone, is_primary) SELECT e.id, 'Patrick Jake Valdez', 'Not specified', '09273240166', true FROM employees e WHERE e.company_id = v_company_id AND e.employee_number = '0092';
  INSERT INTO employee_emergency_contacts (employee_id, name, relationship, phone, is_primary) SELECT e.id, 'Louise Allyson Arabiana-Izumi', 'Not specified', '09955052718', true FROM employees e WHERE e.company_id = v_company_id AND e.employee_number = '0093';
  INSERT INTO employee_emergency_contacts (employee_id, name, relationship, phone, is_primary) SELECT e.id, 'Jeffrey Peralta', 'Not specified', '09625135492', true FROM employees e WHERE e.company_id = v_company_id AND e.employee_number = '0094';
  INSERT INTO employee_emergency_contacts (employee_id, name, relationship, phone, is_primary) SELECT e.id, 'David Leechiu', 'Not specified', '09189105158', true FROM employees e WHERE e.company_id = v_company_id AND e.employee_number = '0096';
  INSERT INTO employee_emergency_contacts (employee_id, name, relationship, phone, is_primary) SELECT e.id, 'Sheila Marie Jimenez', 'Not specified', '09499904700', true FROM employees e WHERE e.company_id = v_company_id AND e.employee_number = '0102';
  INSERT INTO employee_emergency_contacts (employee_id, name, relationship, phone, is_primary) SELECT e.id, 'Ann Beatriz B. de Leon', 'Not specified', '09662054807', true FROM employees e WHERE e.company_id = v_company_id AND e.employee_number = '0103';
  INSERT INTO employee_emergency_contacts (employee_id, name, relationship, phone, is_primary) SELECT e.id, 'Arlene Encina', 'Not specified', '09088791268', true FROM employees e WHERE e.company_id = v_company_id AND e.employee_number = '0104';
  INSERT INTO employee_emergency_contacts (employee_id, name, relationship, phone, is_primary) SELECT e.id, 'Anthony Ong', 'Not specified', '09258778588', true FROM employees e WHERE e.company_id = v_company_id AND e.employee_number = '0105';
  INSERT INTO employee_emergency_contacts (employee_id, name, relationship, phone, is_primary) SELECT e.id, 'Pricilla Agbayani', 'Not specified', '09208627239', true FROM employees e WHERE e.company_id = v_company_id AND e.employee_number = 'F001';
  INSERT INTO employee_emergency_contacts (employee_id, name, relationship, phone, is_primary) SELECT e.id, 'Aaliyah Llisel Mollo', 'Not specified', '09274292068', true FROM employees e WHERE e.company_id = v_company_id AND e.employee_number = '0082';
  INSERT INTO employee_emergency_contacts (employee_id, name, relationship, phone, is_primary) SELECT e.id, 'Anton de la Torre', 'Not specified', '09178780564', true FROM employees e WHERE e.company_id = v_company_id AND e.employee_number = '0083';
  INSERT INTO employee_emergency_contacts (employee_id, name, relationship, phone, is_primary) SELECT e.id, 'Lex Paul Gayrama', 'Not specified', '09215683686', true FROM employees e WHERE e.company_id = v_company_id AND e.employee_number = '0084';
  INSERT INTO employee_emergency_contacts (employee_id, name, relationship, phone, is_primary) SELECT e.id, 'Leonora Tejada', 'Not specified', '09178082782', true FROM employees e WHERE e.company_id = v_company_id AND e.employee_number = '0085';
  INSERT INTO employee_emergency_contacts (employee_id, name, relationship, phone, is_primary) SELECT e.id, 'Yvonne Dumbab Garin', 'Not specified', '09209520855', true FROM employees e WHERE e.company_id = v_company_id AND e.employee_number = '0087';
  INSERT INTO employee_emergency_contacts (employee_id, name, relationship, phone, is_primary) SELECT e.id, 'Ma. Salvacion Distor', 'Not specified', '09178294645', true FROM employees e WHERE e.company_id = v_company_id AND e.employee_number = 'F002';
  INSERT INTO employee_emergency_contacts (employee_id, name, relationship, phone, is_primary) SELECT e.id, 'Ditas F. Gomez', 'Not specified', '09497864330', true FROM employees e WHERE e.company_id = v_company_id AND e.employee_number = '0097';
  INSERT INTO employee_emergency_contacts (employee_id, name, relationship, phone, is_primary) SELECT e.id, 'Martin Somo', 'Not specified', '09566807617', true FROM employees e WHERE e.company_id = v_company_id AND e.employee_number = '0098';
  INSERT INTO employee_emergency_contacts (employee_id, name, relationship, phone, is_primary) SELECT e.id, 'Deborah Tanuecoz', 'Not specified', '09088810902', true FROM employees e WHERE e.company_id = v_company_id AND e.employee_number = '0099';
  INSERT INTO employee_emergency_contacts (employee_id, name, relationship, phone, is_primary) SELECT e.id, 'Lorraine Melocoton', 'Not specified', '09056651700', true FROM employees e WHERE e.company_id = v_company_id AND e.employee_number = '0100';
  INSERT INTO employee_emergency_contacts (employee_id, name, relationship, phone, is_primary) SELECT e.id, 'Lorenzo Azriel Santos', 'Not specified', '09614994318 / 09478963549', true FROM employees e WHERE e.company_id = v_company_id AND e.employee_number = 'F003';
  INSERT INTO employee_emergency_contacts (employee_id, name, relationship, phone, is_primary) SELECT e.id, 'Cesar P. Avila', 'Not specified', '09088635039', true FROM employees e WHERE e.company_id = v_company_id AND e.employee_number = 'F004';
  INSERT INTO employee_emergency_contacts (employee_id, name, relationship, phone, is_primary) SELECT e.id, 'Ma. Melita Mataga', 'Not specified', '09175772985', true FROM employees e WHERE e.company_id = v_company_id AND e.employee_number = 'F005';
  INSERT INTO employee_emergency_contacts (employee_id, name, relationship, phone, is_primary) SELECT e.id, 'Lorelei C. Aliling', 'Not specified', '09178722468', true FROM employees e WHERE e.company_id = v_company_id AND e.employee_number = 'F006';

  RAISE NOTICE 'Patched gender/civil_status on % rows', 51;
  RAISE NOTICE 'Inserted % emergency contacts', 47;
END $$;
