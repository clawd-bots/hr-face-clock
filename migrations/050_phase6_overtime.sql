-- ============================================================================
-- Phase 6: Overtime Filing & Approval
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. overtime_requests — employee OT filing with approval workflow
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS overtime_requests (
    id                  uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id          uuid        NOT NULL REFERENCES companies(id),
    employee_id         uuid        NOT NULL REFERENCES employees(id),
    date                date        NOT NULL,
    start_time          time        NOT NULL,
    end_time            time        NOT NULL,
    ot_hours            numeric(4,2) NOT NULL,
    reason              text,
    status              text        NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    filed_by            uuid        NOT NULL,
    approved_by         uuid,
    approved_at         timestamptz,
    rejection_reason    text,
    created_at          timestamptz DEFAULT now(),
    updated_at          timestamptz DEFAULT now(),
    UNIQUE(company_id, employee_id, date, start_time)
);

CREATE INDEX idx_overtime_requests_company ON overtime_requests(company_id);
CREATE INDEX idx_overtime_requests_employee ON overtime_requests(employee_id);
CREATE INDEX idx_overtime_requests_date ON overtime_requests(company_id, date);
CREATE INDEX idx_overtime_requests_status ON overtime_requests(company_id, status);

ALTER TABLE overtime_requests ENABLE ROW LEVEL SECURITY;

-- All company users can read
CREATE POLICY overtime_requests_select ON overtime_requests FOR SELECT
    USING (company_id = public.get_my_company_id());

-- Employees and admins can create OT requests
CREATE POLICY overtime_requests_insert ON overtime_requests FOR INSERT
    WITH CHECK (company_id = public.get_my_company_id());

-- HR/admin/department_manager can update (approve/reject); employee can cancel own
CREATE POLICY overtime_requests_update ON overtime_requests FOR UPDATE
    USING (company_id = public.get_my_company_id());

-- Only HR+ can delete
CREATE POLICY overtime_requests_delete ON overtime_requests FOR DELETE
    USING (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('super_admin', 'company_admin', 'hr_manager')
    );
