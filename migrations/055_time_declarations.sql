-- ============================================================================
-- Phase 6B: Time Declarations (Manual Clock-In/Out for Field Employees)
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. time_declarations — manual time entry with approval workflow
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS time_declarations (
    id                  uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id          uuid        NOT NULL REFERENCES companies(id),
    employee_id         uuid        NOT NULL REFERENCES employees(id),
    date                date        NOT NULL,
    clock_in            time        NOT NULL,
    clock_out           time        NOT NULL,
    hours_worked        numeric(4,2) NOT NULL,
    location            text,
    reason              text        NOT NULL,
    status              text        NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    filed_by            uuid        NOT NULL,
    approved_by         uuid,
    approved_at         timestamptz,
    rejection_reason    text,
    created_at          timestamptz DEFAULT now(),
    updated_at          timestamptz DEFAULT now(),
    UNIQUE(company_id, employee_id, date)
);

CREATE INDEX idx_time_declarations_company ON time_declarations(company_id);
CREATE INDEX idx_time_declarations_employee ON time_declarations(employee_id);
CREATE INDEX idx_time_declarations_date ON time_declarations(company_id, date);
CREATE INDEX idx_time_declarations_status ON time_declarations(company_id, status);

ALTER TABLE time_declarations ENABLE ROW LEVEL SECURITY;

-- All company users can read
CREATE POLICY time_declarations_select ON time_declarations FOR SELECT
    USING (company_id = public.get_my_company_id());

-- Employees and admins can create declarations
CREATE POLICY time_declarations_insert ON time_declarations FOR INSERT
    WITH CHECK (company_id = public.get_my_company_id());

-- HR/admin/department_manager can update (approve/reject); employee can cancel own
CREATE POLICY time_declarations_update ON time_declarations FOR UPDATE
    USING (company_id = public.get_my_company_id());

-- Only HR+ can delete
CREATE POLICY time_declarations_delete ON time_declarations FOR DELETE
    USING (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('super_admin', 'company_admin', 'hr_manager')
    );
