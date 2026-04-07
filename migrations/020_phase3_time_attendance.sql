-- Migration: Phase 3 - Time & Attendance
-- Tables: work_schedules, employee_schedules, daily_time_records, holidays
-- Function: seed_holidays_2026(p_company_id uuid)

-- ============================================================================
-- 1. WORK SCHEDULES (shift templates)
-- ============================================================================

CREATE TABLE IF NOT EXISTS work_schedules (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id uuid NOT NULL REFERENCES companies(id),
    name text NOT NULL,
    start_time time NOT NULL,
    end_time time NOT NULL,
    break_minutes integer DEFAULT 60,
    is_flexible boolean DEFAULT false,
    grace_period_minutes integer DEFAULT 0,
    work_days integer[] DEFAULT '{1,2,3,4,5}',
    is_night_diff boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    active boolean DEFAULT true,
    UNIQUE(company_id, name)
);

CREATE INDEX idx_work_schedules_company ON work_schedules(company_id);
CREATE INDEX idx_work_schedules_active ON work_schedules(company_id, active);

ALTER TABLE work_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY work_schedules_select ON work_schedules
    FOR SELECT USING (company_id = public.get_my_company_id());

CREATE POLICY work_schedules_insert ON work_schedules
    FOR INSERT WITH CHECK (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('super_admin', 'admin', 'hr_manager')
    );

CREATE POLICY work_schedules_update ON work_schedules
    FOR UPDATE USING (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('super_admin', 'admin', 'hr_manager')
    );

CREATE POLICY work_schedules_delete ON work_schedules
    FOR DELETE USING (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('super_admin', 'admin', 'hr_manager')
    );

-- ============================================================================
-- 2. EMPLOYEE SCHEDULES (assign schedule to employee)
-- ============================================================================

CREATE TABLE IF NOT EXISTS employee_schedules (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id uuid NOT NULL REFERENCES companies(id),
    employee_id uuid NOT NULL REFERENCES employees(id),
    schedule_id uuid NOT NULL REFERENCES work_schedules(id),
    effective_from date NOT NULL,
    effective_to date,
    created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_employee_schedules_company ON employee_schedules(company_id);
CREATE INDEX idx_employee_schedules_employee ON employee_schedules(employee_id);
CREATE INDEX idx_employee_schedules_schedule ON employee_schedules(schedule_id);
CREATE INDEX idx_employee_schedules_effective ON employee_schedules(employee_id, effective_from, effective_to);

ALTER TABLE employee_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY employee_schedules_select ON employee_schedules
    FOR SELECT USING (company_id = public.get_my_company_id());

CREATE POLICY employee_schedules_insert ON employee_schedules
    FOR INSERT WITH CHECK (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('super_admin', 'admin', 'hr_manager')
    );

CREATE POLICY employee_schedules_update ON employee_schedules
    FOR UPDATE USING (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('super_admin', 'admin', 'hr_manager')
    );

CREATE POLICY employee_schedules_delete ON employee_schedules
    FOR DELETE USING (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('super_admin', 'admin', 'hr_manager')
    );

-- ============================================================================
-- 3. DAILY TIME RECORDS (computed DTR per employee per day)
-- ============================================================================

CREATE TABLE IF NOT EXISTS daily_time_records (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id uuid NOT NULL REFERENCES companies(id),
    employee_id uuid NOT NULL REFERENCES employees(id),
    date date NOT NULL,
    schedule_id uuid REFERENCES work_schedules(id),
    first_in timestamptz,
    last_out timestamptz,
    total_hours_worked numeric(6,2),
    regular_hours numeric(6,2),
    night_diff_hours numeric(6,2),
    late_minutes integer DEFAULT 0,
    undertime_minutes integer DEFAULT 0,
    is_rest_day boolean DEFAULT false,
    is_holiday boolean DEFAULT false,
    holiday_type text,
    status text DEFAULT 'computed' CHECK (status IN ('computed', 'adjusted', 'approved')),
    remarks text,
    computed_at timestamptz DEFAULT now(),
    approved_by uuid,
    approved_at timestamptz,
    UNIQUE(company_id, employee_id, date)
);

CREATE INDEX idx_dtr_company ON daily_time_records(company_id);
CREATE INDEX idx_dtr_employee ON daily_time_records(employee_id);
CREATE INDEX idx_dtr_date ON daily_time_records(company_id, date);
CREATE INDEX idx_dtr_employee_date ON daily_time_records(employee_id, date);
CREATE INDEX idx_dtr_status ON daily_time_records(company_id, status);

ALTER TABLE daily_time_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY dtr_select ON daily_time_records
    FOR SELECT USING (company_id = public.get_my_company_id());

CREATE POLICY dtr_insert ON daily_time_records
    FOR INSERT WITH CHECK (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('super_admin', 'admin', 'hr_manager')
    );

CREATE POLICY dtr_update ON daily_time_records
    FOR UPDATE USING (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('super_admin', 'admin', 'hr_manager')
    );

CREATE POLICY dtr_delete ON daily_time_records
    FOR DELETE USING (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('super_admin', 'admin', 'hr_manager')
    );

-- ============================================================================
-- 4. HOLIDAYS (Philippine holiday calendar)
-- ============================================================================

CREATE TABLE IF NOT EXISTS holidays (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id uuid NOT NULL REFERENCES companies(id),
    date date NOT NULL,
    name text NOT NULL,
    type text NOT NULL CHECK (type IN ('regular', 'special_non_working', 'special_working')),
    created_at timestamptz DEFAULT now(),
    UNIQUE(company_id, date)
);

CREATE INDEX idx_holidays_company ON holidays(company_id);
CREATE INDEX idx_holidays_date ON holidays(company_id, date);
CREATE INDEX idx_holidays_type ON holidays(company_id, type);

ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;

CREATE POLICY holidays_select ON holidays
    FOR SELECT USING (company_id = public.get_my_company_id());

CREATE POLICY holidays_insert ON holidays
    FOR INSERT WITH CHECK (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('super_admin', 'admin', 'hr_manager')
    );

CREATE POLICY holidays_update ON holidays
    FOR UPDATE USING (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('super_admin', 'admin', 'hr_manager')
    );

CREATE POLICY holidays_delete ON holidays
    FOR DELETE USING (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('super_admin', 'admin', 'hr_manager')
    );

-- ============================================================================
-- 5. SEED FUNCTION: 2026 Philippine Holidays (DOLE)
-- ============================================================================

CREATE OR REPLACE FUNCTION seed_holidays_2026(p_company_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    -- Regular Holidays (per DOLE)
    INSERT INTO holidays (company_id, date, name, type) VALUES
        (p_company_id, '2026-01-01', 'New Year''s Day', 'regular'),
        (p_company_id, '2026-04-02', 'Maundy Thursday', 'regular'),
        (p_company_id, '2026-04-03', 'Good Friday', 'regular'),
        (p_company_id, '2026-04-09', 'Araw ng Kagitingan (Day of Valor)', 'regular'),
        (p_company_id, '2026-05-01', 'Labor Day', 'regular'),
        (p_company_id, '2026-06-12', 'Independence Day', 'regular'),
        (p_company_id, '2026-08-31', 'National Heroes Day', 'regular'),
        (p_company_id, '2026-11-30', 'Bonifacio Day', 'regular'),
        (p_company_id, '2026-12-25', 'Christmas Day', 'regular'),
        (p_company_id, '2026-12-30', 'Rizal Day', 'regular'),
        -- Eid'l Fitr (estimated — moves annually based on Islamic calendar)
        (p_company_id, '2026-03-20', 'Eid''l Fitr (Feast of Ramadan)', 'regular'),
        -- Eid'l Adha (estimated — moves annually based on Islamic calendar)
        (p_company_id, '2026-05-27', 'Eid''l Adha (Feast of Sacrifice)', 'regular')
    ON CONFLICT (company_id, date) DO NOTHING;

    -- Special Non-Working Holidays
    INSERT INTO holidays (company_id, date, name, type) VALUES
        (p_company_id, '2026-02-01', 'Chinese New Year', 'special_non_working'),
        (p_company_id, '2026-02-25', 'EDSA People Power Revolution Anniversary', 'special_non_working'),
        (p_company_id, '2026-04-04', 'Black Saturday', 'special_non_working'),
        (p_company_id, '2026-08-21', 'Ninoy Aquino Day', 'special_non_working'),
        (p_company_id, '2026-11-01', 'All Saints'' Day', 'special_non_working'),
        (p_company_id, '2026-11-02', 'All Souls'' Day', 'special_non_working'),
        (p_company_id, '2026-12-08', 'Feast of the Immaculate Conception of Mary', 'special_non_working'),
        (p_company_id, '2026-12-24', 'Christmas Eve', 'special_non_working'),
        (p_company_id, '2026-12-31', 'Last Day of the Year', 'special_non_working')
    ON CONFLICT (company_id, date) DO NOTHING;
END;
$$;
