-- ============================================================================
-- Phase 5: Payroll Engine
-- Philippine HRIS — salary records, allowances, loans, payroll runs & items
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. salary_records — base salary per employee with effective dates
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS salary_records (
    id              uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id      uuid        NOT NULL REFERENCES companies(id),
    employee_id     uuid        NOT NULL REFERENCES employees(id),
    basic_salary    numeric(12,2) NOT NULL,
    daily_rate      numeric(10,2) NOT NULL,
    hourly_rate     numeric(10,2) NOT NULL,
    effective_from  date        NOT NULL,
    effective_to    date,
    pay_basis       text        NOT NULL DEFAULT 'monthly' CHECK (pay_basis IN ('monthly', 'daily')),
    days_per_month  integer     NOT NULL DEFAULT 22,
    created_at      timestamptz DEFAULT now(),
    UNIQUE(company_id, employee_id, effective_from)
);

CREATE INDEX idx_salary_records_company ON salary_records(company_id);
CREATE INDEX idx_salary_records_employee ON salary_records(employee_id);
CREATE INDEX idx_salary_records_effective ON salary_records(employee_id, effective_from);

ALTER TABLE salary_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY salary_records_select ON salary_records FOR SELECT
    USING (company_id = public.get_my_company_id());

CREATE POLICY salary_records_insert ON salary_records FOR INSERT
    WITH CHECK (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('super_admin', 'company_admin', 'hr_manager', 'payroll_officer')
    );

CREATE POLICY salary_records_update ON salary_records FOR UPDATE
    USING (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('super_admin', 'company_admin', 'hr_manager', 'payroll_officer')
    );

CREATE POLICY salary_records_delete ON salary_records FOR DELETE
    USING (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('super_admin', 'company_admin', 'hr_manager', 'payroll_officer')
    );

-- --------------------------------------------------------------------------
-- 2. allowance_types — configurable allowance categories per company
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS allowance_types (
    id              uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id      uuid        NOT NULL REFERENCES companies(id),
    name            text        NOT NULL,
    code            text        NOT NULL,
    is_taxable      boolean     DEFAULT false,
    is_de_minimis   boolean     DEFAULT false,
    de_minimis_limit numeric(10,2),
    active          boolean     DEFAULT true,
    created_at      timestamptz DEFAULT now(),
    UNIQUE(company_id, code)
);

CREATE INDEX idx_allowance_types_company ON allowance_types(company_id);

ALTER TABLE allowance_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY allowance_types_select ON allowance_types FOR SELECT
    USING (company_id = public.get_my_company_id());

CREATE POLICY allowance_types_insert ON allowance_types FOR INSERT
    WITH CHECK (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('super_admin', 'company_admin', 'hr_manager', 'payroll_officer')
    );

CREATE POLICY allowance_types_update ON allowance_types FOR UPDATE
    USING (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('super_admin', 'company_admin', 'hr_manager', 'payroll_officer')
    );

CREATE POLICY allowance_types_delete ON allowance_types FOR DELETE
    USING (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('super_admin', 'company_admin', 'hr_manager', 'payroll_officer')
    );

-- --------------------------------------------------------------------------
-- 3. employee_allowances — recurring allowances assigned to employees
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS employee_allowances (
    id                  uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id          uuid        NOT NULL REFERENCES companies(id),
    employee_id         uuid        NOT NULL REFERENCES employees(id),
    allowance_type_id   uuid        NOT NULL REFERENCES allowance_types(id),
    amount              numeric(10,2) NOT NULL,
    frequency           text        NOT NULL DEFAULT 'per_cutoff' CHECK (frequency IN ('per_cutoff', 'monthly')),
    active              boolean     DEFAULT true,
    created_at          timestamptz DEFAULT now(),
    UNIQUE(company_id, employee_id, allowance_type_id)
);

CREATE INDEX idx_employee_allowances_company ON employee_allowances(company_id);
CREATE INDEX idx_employee_allowances_employee ON employee_allowances(employee_id);

ALTER TABLE employee_allowances ENABLE ROW LEVEL SECURITY;

CREATE POLICY employee_allowances_select ON employee_allowances FOR SELECT
    USING (company_id = public.get_my_company_id());

CREATE POLICY employee_allowances_insert ON employee_allowances FOR INSERT
    WITH CHECK (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('super_admin', 'company_admin', 'hr_manager', 'payroll_officer')
    );

CREATE POLICY employee_allowances_update ON employee_allowances FOR UPDATE
    USING (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('super_admin', 'company_admin', 'hr_manager', 'payroll_officer')
    );

CREATE POLICY employee_allowances_delete ON employee_allowances FOR DELETE
    USING (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('super_admin', 'company_admin', 'hr_manager', 'payroll_officer')
    );

-- --------------------------------------------------------------------------
-- 4. loan_types — SSS, Pag-IBIG, company loans
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS loan_types (
    id              uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id      uuid        NOT NULL REFERENCES companies(id),
    name            text        NOT NULL,
    code            text        NOT NULL,
    created_at      timestamptz DEFAULT now(),
    UNIQUE(company_id, code)
);

CREATE INDEX idx_loan_types_company ON loan_types(company_id);

ALTER TABLE loan_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY loan_types_select ON loan_types FOR SELECT
    USING (company_id = public.get_my_company_id());

CREATE POLICY loan_types_insert ON loan_types FOR INSERT
    WITH CHECK (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('super_admin', 'company_admin', 'hr_manager', 'payroll_officer')
    );

CREATE POLICY loan_types_update ON loan_types FOR UPDATE
    USING (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('super_admin', 'company_admin', 'hr_manager', 'payroll_officer')
    );

CREATE POLICY loan_types_delete ON loan_types FOR DELETE
    USING (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('super_admin', 'company_admin', 'hr_manager', 'payroll_officer')
    );

-- --------------------------------------------------------------------------
-- 5. employee_loans — active loan deductions
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS employee_loans (
    id                  uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id          uuid        NOT NULL REFERENCES companies(id),
    employee_id         uuid        NOT NULL REFERENCES employees(id),
    loan_type_id        uuid        NOT NULL REFERENCES loan_types(id),
    total_amount        numeric(12,2) NOT NULL,
    monthly_deduction   numeric(10,2) NOT NULL,
    remaining_balance   numeric(12,2) NOT NULL,
    start_date          date        NOT NULL,
    active              boolean     DEFAULT true,
    created_at          timestamptz DEFAULT now()
);

CREATE INDEX idx_employee_loans_company ON employee_loans(company_id);
CREATE INDEX idx_employee_loans_employee ON employee_loans(employee_id);

ALTER TABLE employee_loans ENABLE ROW LEVEL SECURITY;

CREATE POLICY employee_loans_select ON employee_loans FOR SELECT
    USING (company_id = public.get_my_company_id());

CREATE POLICY employee_loans_insert ON employee_loans FOR INSERT
    WITH CHECK (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('super_admin', 'company_admin', 'hr_manager', 'payroll_officer')
    );

CREATE POLICY employee_loans_update ON employee_loans FOR UPDATE
    USING (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('super_admin', 'company_admin', 'hr_manager', 'payroll_officer')
    );

CREATE POLICY employee_loans_delete ON employee_loans FOR DELETE
    USING (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('super_admin', 'company_admin', 'hr_manager', 'payroll_officer')
    );

-- --------------------------------------------------------------------------
-- 6. payroll_runs — a single payroll batch
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payroll_runs (
    id              uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id      uuid        NOT NULL REFERENCES companies(id),
    period_start    date        NOT NULL,
    period_end      date        NOT NULL,
    pay_date        date        NOT NULL,
    cycle           text        NOT NULL CHECK (cycle IN ('semi_monthly_1', 'semi_monthly_2', 'monthly')),
    status          text        NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'computed', 'approved', 'paid')),
    total_gross     numeric(14,2) DEFAULT 0,
    total_deductions numeric(14,2) DEFAULT 0,
    total_net       numeric(14,2) DEFAULT 0,
    employee_count  integer     DEFAULT 0,
    computed_by     uuid,
    approved_by     uuid,
    approved_at     timestamptz,
    created_at      timestamptz DEFAULT now(),
    UNIQUE(company_id, period_start, period_end, cycle)
);

CREATE INDEX idx_payroll_runs_company ON payroll_runs(company_id);
CREATE INDEX idx_payroll_runs_status ON payroll_runs(company_id, status);

ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY payroll_runs_select ON payroll_runs FOR SELECT
    USING (company_id = public.get_my_company_id());

CREATE POLICY payroll_runs_insert ON payroll_runs FOR INSERT
    WITH CHECK (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('super_admin', 'company_admin', 'payroll_officer')
    );

CREATE POLICY payroll_runs_update ON payroll_runs FOR UPDATE
    USING (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('super_admin', 'company_admin', 'payroll_officer')
    );

CREATE POLICY payroll_runs_delete ON payroll_runs FOR DELETE
    USING (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('super_admin', 'company_admin', 'payroll_officer')
    );

-- --------------------------------------------------------------------------
-- 7. payroll_items — one row per employee per payroll run (the payslip)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payroll_items (
    id                      uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id              uuid        NOT NULL REFERENCES companies(id),
    payroll_run_id          uuid        NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
    employee_id             uuid        NOT NULL REFERENCES employees(id),
    basic_pay               numeric(10,2) DEFAULT 0,
    days_worked             numeric(5,2) DEFAULT 0,
    hours_worked            numeric(6,2) DEFAULT 0,
    regular_pay             numeric(10,2) DEFAULT 0,
    holiday_pay             numeric(10,2) DEFAULT 0,
    rest_day_pay            numeric(10,2) DEFAULT 0,
    night_diff_pay          numeric(10,2) DEFAULT 0,
    overtime_pay            numeric(10,2) DEFAULT 0,
    gross_pay               numeric(12,2) DEFAULT 0,
    sss_employee            numeric(8,2) DEFAULT 0,
    sss_employer            numeric(8,2) DEFAULT 0,
    philhealth_employee     numeric(8,2) DEFAULT 0,
    philhealth_employer     numeric(8,2) DEFAULT 0,
    pagibig_employee        numeric(8,2) DEFAULT 0,
    pagibig_employer        numeric(8,2) DEFAULT 0,
    withholding_tax         numeric(10,2) DEFAULT 0,
    total_allowances        numeric(10,2) DEFAULT 0,
    total_deductions        numeric(10,2) DEFAULT 0,
    loan_deductions         numeric(10,2) DEFAULT 0,
    other_deductions        numeric(10,2) DEFAULT 0,
    late_undertime_deductions numeric(10,2) DEFAULT 0,
    net_pay                 numeric(12,2) DEFAULT 0,
    adjustments             jsonb       DEFAULT '{}',
    breakdown               jsonb       DEFAULT '{}',
    created_at              timestamptz DEFAULT now(),
    UNIQUE(payroll_run_id, employee_id)
);

CREATE INDEX idx_payroll_items_company ON payroll_items(company_id);
CREATE INDEX idx_payroll_items_run ON payroll_items(payroll_run_id);
CREATE INDEX idx_payroll_items_employee ON payroll_items(employee_id);

ALTER TABLE payroll_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY payroll_items_select ON payroll_items FOR SELECT
    USING (company_id = public.get_my_company_id());

CREATE POLICY payroll_items_insert ON payroll_items FOR INSERT
    WITH CHECK (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('super_admin', 'company_admin', 'payroll_officer')
    );

CREATE POLICY payroll_items_update ON payroll_items FOR UPDATE
    USING (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('super_admin', 'company_admin', 'payroll_officer')
    );

CREATE POLICY payroll_items_delete ON payroll_items FOR DELETE
    USING (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('super_admin', 'company_admin', 'payroll_officer')
    );
