-- ============================================================
-- Remote clock-in.
--
-- Adds:
--   1. employees.remote_clock_in_enabled — opt-in flag set by HR
--   2. time_logs.location_lat / location_lng / location_accuracy /
--      remote — stamped on time_logs created via the remote flow
--
-- Existing columns/data untouched.
-- ============================================================

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS remote_clock_in_enabled boolean NOT NULL DEFAULT false;

ALTER TABLE time_logs
  ADD COLUMN IF NOT EXISTS remote            boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS clock_in_lat      numeric(9,6),
  ADD COLUMN IF NOT EXISTS clock_in_lng      numeric(9,6),
  ADD COLUMN IF NOT EXISTS clock_in_accuracy numeric(8,2),
  ADD COLUMN IF NOT EXISTS clock_out_lat     numeric(9,6),
  ADD COLUMN IF NOT EXISTS clock_out_lng     numeric(9,6),
  ADD COLUMN IF NOT EXISTS clock_out_accuracy numeric(8,2);

CREATE INDEX IF NOT EXISTS idx_time_logs_remote
  ON time_logs(company_id, remote)
  WHERE remote = true;

COMMENT ON COLUMN employees.remote_clock_in_enabled IS 'When true, employee can clock in from /employee/dashboard outside the kiosk. HR-managed.';
COMMENT ON COLUMN time_logs.remote                  IS 'Set to true when this log was created via the remote (employee portal) flow rather than the kiosk.';
COMMENT ON COLUMN time_logs.clock_in_lat            IS 'GPS latitude captured at clock-in (decimal degrees, WGS84). Null if non-remote.';
COMMENT ON COLUMN time_logs.clock_in_lng            IS 'GPS longitude captured at clock-in. Null if non-remote.';
COMMENT ON COLUMN time_logs.clock_in_accuracy       IS 'GPS accuracy radius in metres (1 sigma). Higher = less precise.';
COMMENT ON COLUMN time_logs.clock_out_lat           IS 'GPS latitude at clock-out (only populated for remote sessions that also clocked out remotely).';
COMMENT ON COLUMN time_logs.clock_out_lng           IS 'GPS longitude at clock-out.';
COMMENT ON COLUMN time_logs.clock_out_accuracy      IS 'GPS accuracy radius at clock-out, metres.';
