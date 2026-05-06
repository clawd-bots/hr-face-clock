-- ============================================================
-- Shadow log for evaluating face-recognition v2 (cluster-aware)
-- against the live v1 matcher in production.
--
-- The kiosk runs BOTH matchers on every clock event but only acts
-- on v1's result. The comparison is logged here so we can measure
-- v2's accuracy before flipping it on as primary.
-- ============================================================

CREATE TABLE IF NOT EXISTS face_match_shadow_log (
    id                    uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id            uuid        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    time_log_id           uuid        REFERENCES time_logs(id) ON DELETE SET NULL,

    -- v1 (live matcher) result
    v1_employee_id        uuid        REFERENCES employees(id),
    v1_distance           numeric(6,4),
    v1_runner_up_distance numeric(6,4),
    v1_margin             numeric(6,4),
    v1_reason             text,        -- 'matched' | 'too_far' | 'ambiguous' | 'no_employees'

    -- v2 (cluster-aware) result
    v2_employee_id        uuid        REFERENCES employees(id),
    v2_score              numeric(6,4), -- Mahalanobis-ish; smaller = closer in std-dev units
    v2_runner_up_score    numeric(6,4),
    v2_margin             numeric(6,4),
    v2_reason             text,

    -- Convenience flag for fast filtering
    agreed                boolean,

    -- Manual review fields (optional)
    reviewed_by           uuid        REFERENCES auth.users(id),
    reviewed_at           timestamptz,
    correct_employee_id   uuid        REFERENCES employees(id),
    review_notes          text,

    created_at            timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fms_company    ON face_match_shadow_log(company_id);
CREATE INDEX IF NOT EXISTS idx_fms_agreed     ON face_match_shadow_log(company_id, agreed);
CREATE INDEX IF NOT EXISTS idx_fms_created    ON face_match_shadow_log(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fms_v1         ON face_match_shadow_log(v1_employee_id);
CREATE INDEX IF NOT EXISTS idx_fms_v2         ON face_match_shadow_log(v2_employee_id);

ALTER TABLE face_match_shadow_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY fms_select ON face_match_shadow_log FOR SELECT
    USING (company_id = public.get_my_company_id());

CREATE POLICY fms_insert ON face_match_shadow_log FOR INSERT
    WITH CHECK (company_id = public.get_my_company_id());

CREATE POLICY fms_update ON face_match_shadow_log FOR UPDATE
    USING (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('super_admin', 'company_admin', 'hr_manager')
    );
