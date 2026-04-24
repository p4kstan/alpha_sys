-- Add gbraid/wbraid to sessions so google-ads-capi fallback can recover them.
-- Previously only gclid was stored; gbraid (app campaigns) and wbraid (web-to-app)
-- are required for Performance Max and App campaigns attribution.

ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS gbraid TEXT,
  ADD COLUMN IF NOT EXISTS wbraid TEXT;

-- Fix any existing event_queue rows stuck in 'pending' status
-- (caused by event-router bug fixed in commit 975a7c6).
UPDATE event_queue
SET    status        = 'queued',
       next_retry_at = NOW()
WHERE  status = 'pending';

-- Index for fast lookup by session_id (used in google-ads-capi fallback)
CREATE INDEX IF NOT EXISTS sessions_session_id_idx ON sessions (session_id);

-- Index for event_queue polling (process-events hot path)
CREATE INDEX IF NOT EXISTS event_queue_status_retry_idx
  ON event_queue (status, next_retry_at)
  WHERE status IN ('queued', 'retry');
