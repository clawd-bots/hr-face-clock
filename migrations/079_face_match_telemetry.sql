-- ============================================================
-- Face-match telemetry on time_logs.
-- Lets us audit any future mis-identification by querying:
--   SELECT clock_in, employee_id, match_distance, match_margin
--   FROM time_logs WHERE match_distance > 0.4 OR match_margin < 0.08;
-- ============================================================

ALTER TABLE time_logs
  ADD COLUMN IF NOT EXISTS match_distance           numeric(6,4),
  ADD COLUMN IF NOT EXISTS match_runner_up_distance numeric(6,4),
  ADD COLUMN IF NOT EXISTS match_margin             numeric(6,4);

COMMENT ON COLUMN time_logs.match_distance           IS 'Euclidean distance to the matched employees descriptors at clock-in (lower = better)';
COMMENT ON COLUMN time_logs.match_runner_up_distance IS 'Distance to the next-closest employee — small gap means ambiguous match';
COMMENT ON COLUMN time_logs.match_margin             IS 'runner_up - matched; rejected if below MIN_MARGIN at clock-in time';
