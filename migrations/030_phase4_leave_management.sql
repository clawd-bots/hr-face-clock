-- ============================================================================
-- Phase 4: Leave Management
-- Philippine HRIS — configurable leave types, balances, and requests
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. leave_types — configurable leave types per company
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS leave_types (
    id              uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id      uuid        NOT NULL REFERENCES companies(id),
    name            text        NOT NULL,
    code            text        NOT NULL,
    description     text,
    days_per_year   numeric(5,2) NOT NULL,
    is_paid         boolean     DEFAULT true,
    is_convertible  boolean     DEFAULT false,
    requires_attachment boolean DEFAULT false,
    gender_specific text        CHECK (gender_specific IN ('male', 'female')),
    min_service_months integer  DEFAULT 0,
    allow_half_day  boolean     DEFAULT true,
    carry_over_max  numeric(5,2) DEFAULT 0,
    prorate_on_hire boolean     DEFAULT true,
    active          boolean     DEFAULT true,
    created_at      timestamptz DEFAULT now(),
    UNIQUE(company_id, code)
);

-- --------------------------------------------------------------------------
-- 2. leave_balances — per employee per leave type per year
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS leave_balances (
    id              uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id      uuid        NOT NULL REFERENCES companies(id),
    employee_id     uuid        NOT NULL REFERENCES employees(id),
    leave_type_id   uuid        NOT NULL REFERENCES leave_types(id),
    year            integer     NOT NULL,
    entitled_days   numeric(5,2) NOT NULL,
    used_days       numeric(5,2) DEFAULT 0,
    pending_days    numeric(5,2) DEFAULT 0,
    carried_over    numeric(5,2) DEFAULT 0,
    adjusted_days   numeric(5,2) DEFAULT 0,
    created_at      timestamptz DEFAULT now(),
    updated_at      timestamptz DEFAULT now(),
    UNIQUE(company_id, employee_id, leave_type_id, year)
);

-- Note: available_days = entitled_days + carried_over + adjusted_days - used_days - pending_days (computed, not stored)

-- --------------------------------------------------------------------------
-- 3. leave_requests — individual leave applications
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS leave_requests (
    id              uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id      uuid        NOT NULL REFERENCES companies(id),
    employee_id     uuid        NOT NULL REFERENCES employees(id),
    leave_type_id   uuid        NOT NULL REFERENCES leave_types(id),
    start_date      date        NOT NULL,
    end_date        date        NOT NULL,
    total_days      numeric(4,2) NOT NULL,
    is_half_day     boolean     DEFAULT false,
    half_day_period text        CHECK (half_day_period IN ('morning', 'afternoon')),
    reason          text,
    attachment_path text,
    status          text        DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    filed_by        uuid        NOT NULL,
    approved_by     uuid,
    approved_at     timestamptz,
    rejection_reason text,
    created_at      timestamptz DEFAULT now(),
    updated_at      timestamptz DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 4. Indexes
-- --------------------------------------------------------------------------
CREATE INDEX idx_leave_types_company       ON leave_types(company_id);
CREATE INDEX idx_leave_types_company_active ON leave_types(company_id, active);

CREATE INDEX idx_leave_balances_company         ON leave_balances(company_id);
CREATE INDEX idx_leave_balances_employee        ON leave_balances(employee_id);
CREATE INDEX idx_leave_balances_employee_year   ON leave_balances(employee_id, year);
CREATE INDEX idx_leave_balances_type_year       ON leave_balances(leave_type_id, year);

CREATE INDEX idx_leave_requests_company        ON leave_requests(company_id);
CREATE INDEX idx_leave_requests_employee       ON leave_requests(employee_id);
CREATE INDEX idx_leave_requests_status         ON leave_requests(status);
CREATE INDEX idx_leave_requests_employee_dates ON leave_requests(employee_id, start_date, end_date);
CREATE INDEX idx_leave_requests_company_status ON leave_requests(company_id, status);

-- --------------------------------------------------------------------------
-- 5. Row Level Security
-- --------------------------------------------------------------------------

-- leave_types
ALTER TABLE leave_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY leave_types_select ON leave_types
    FOR SELECT USING (company_id = public.get_my_company_id());

CREATE POLICY leave_types_insert ON leave_types
    FOR INSERT WITH CHECK (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('super_admin', 'admin', 'hr_manager', 'employee')
    );

CREATE POLICY leave_types_update ON leave_types
    FOR UPDATE USING (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('super_admin', 'admin', 'hr_manager')
    );

CREATE POLICY leave_types_delete ON leave_types
    FOR DELETE USING (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('super_admin', 'admin', 'hr_manager')
    );

-- leave_balances
ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY leave_balances_select ON leave_balances
    FOR SELECT USING (company_id = public.get_my_company_id());

CREATE POLICY leave_balances_insert ON leave_balances
    FOR INSERT WITH CHECK (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('super_admin', 'admin', 'hr_manager', 'employee')
    );

CREATE POLICY leave_balances_update ON leave_balances
    FOR UPDATE USING (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('super_admin', 'admin', 'hr_manager')
    );

CREATE POLICY leave_balances_delete ON leave_balances
    FOR DELETE USING (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('super_admin', 'admin', 'hr_manager')
    );

-- leave_requests
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY leave_requests_select ON leave_requests
    FOR SELECT USING (company_id = public.get_my_company_id());

CREATE POLICY leave_requests_insert ON leave_requests
    FOR INSERT WITH CHECK (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('super_admin', 'admin', 'hr_manager', 'employee')
    );

CREATE POLICY leave_requests_update ON leave_requests
    FOR UPDATE USING (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('super_admin', 'admin', 'hr_manager')
    );

CREATE POLICY leave_requests_delete ON leave_requests
    FOR DELETE USING (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('super_admin', 'admin', 'hr_manager')
    );

-- --------------------------------------------------------------------------
-- 6. Seed function — standard Philippine leave types
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION seed_ph_leave_types(p_company_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO leave_types (company_id, code, name, description, days_per_year, is_paid, is_convertible, requires_attachment, gender_specific, min_service_months, allow_half_day, carry_over_max, prorate_on_hire)
    VALUES
        -- Vacation Leave (SIL minimum)
        (p_company_id, 'VL',   'Vacation Leave',              'Annual vacation leave (SIL minimum)',                            5,   true,  true,  false, NULL,     0, true,  0, true),
        -- Sick Leave
        (p_company_id, 'SL',   'Sick Leave',                  'Sick leave — medical certificate required if >3 consecutive days', 5,   true,  false, true,  NULL,     0, true,  0, true),
        -- Maternity Leave (RA 11210 — 105 days)
        (p_company_id, 'ML',   'Maternity Leave',             'Expanded Maternity Leave (RA 11210) — 105 days',                105, true,  false, false, 'female', 0, false, 0, false),
        -- Paternity Leave (RA 8187 — 7 days)
        (p_company_id, 'PL',   'Paternity Leave',             'Paternity Leave (RA 8187) — 7 days',                              7,  true,  false, false, 'male',   0, false, 0, false),
        -- Solo Parent Leave (RA 8972 — 7 days)
        (p_company_id, 'SPL',  'Solo Parent Leave',           'Solo Parent Leave (RA 8972) — 7 working days',                    7,  true,  false, false, NULL,     0, true,  0, true),
        -- Service Incentive Leave (DOLE minimum)
        (p_company_id, 'SIL',  'Service Incentive Leave',     'DOLE-mandated Service Incentive Leave — 5 days (often merged with VL)', 5, true, true, false, NULL, 0, true, 0, true),
        -- VAWC Leave (RA 9262 — 10 days)
        (p_company_id, 'VAWC', 'VAWC Leave',                  'Leave for victims of violence against women and children (RA 9262)', 10, true, false, false, 'female', 0, true, 0, false),
        -- Special Leave for Women (RA 9710 — 60 days)
        (p_company_id, 'SLW',  'Special Leave for Women',     'Special Leave for Women (RA 9710) — gynecological surgery',       60,  true,  false, false, 'female', 0, false, 0, false)
    ON CONFLICT DO NOTHING;
END;
$$;
