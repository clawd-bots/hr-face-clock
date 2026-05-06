-- ============================================================
-- PINs + face-match correction tracking.
--
-- Adds:
--   1. employees.pin_hash — sha256 of (pin + per-employee salt)
--   2. employees.pin_set_at — timestamp; null = no PIN configured
--   3. employees.needs_face_reenroll — flag for HR-visible re-enrollment
--      recommendation
--   4. face_match_corrections — log of every "Not Me" event from the kiosk
--      so we can audit mis-identifications and feed v2 evaluation
-- ============================================================

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS pin_hash               text,
  ADD COLUMN IF NOT EXISTS pin_set_at             timestamptz,
  ADD COLUMN IF NOT EXISTS needs_face_reenroll    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS face_reenroll_reason   text;

COMMENT ON COLUMN employees.pin_hash             IS 'SHA-256 hash of "pin:" || pin || ":" || id. Used to verify identity in the Not Me kiosk flow.';
COMMENT ON COLUMN employees.needs_face_reenroll  IS 'Flagged when the system detects degrading match quality or a confirmed mis-identification. Surfaced in admin.';

-- --------------------------------------------------------------------------
-- Mis-identification log
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS face_match_corrections (
    id                       uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id               uuid        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    -- The time_log the system originally created (with the wrong employee_id)
    original_time_log_id     uuid        REFERENCES time_logs(id) ON DELETE SET NULL,
    -- The employee the matcher picked (wrong)
    matcher_employee_id      uuid        REFERENCES employees(id) ON DELETE SET NULL,
    -- The employee who actually clocked in (verified by PIN)
    correct_employee_id      uuid        NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    -- Match telemetry copied from the original event for analysis
    matcher_distance         numeric(6,4),
    matcher_runner_up        numeric(6,4),
    matcher_margin           numeric(6,4),
    -- The corrected time_log we inserted (or updated) under the right employee
    corrected_time_log_id    uuid        REFERENCES time_logs(id) ON DELETE SET NULL,
    created_at               timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fmc_company  ON face_match_corrections(company_id);
CREATE INDEX IF NOT EXISTS idx_fmc_matcher  ON face_match_corrections(matcher_employee_id);
CREATE INDEX IF NOT EXISTS idx_fmc_correct  ON face_match_corrections(correct_employee_id);
CREATE INDEX IF NOT EXISTS idx_fmc_created  ON face_match_corrections(company_id, created_at DESC);

ALTER TABLE face_match_corrections ENABLE ROW LEVEL SECURITY;

CREATE POLICY fmc_select ON face_match_corrections FOR SELECT
    USING (company_id = public.get_my_company_id());

CREATE POLICY fmc_insert ON face_match_corrections FOR INSERT
    WITH CHECK (company_id = public.get_my_company_id());
