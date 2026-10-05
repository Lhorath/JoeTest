-- Supports the production inactivity sweep without scanning every live session row.
CREATE INDEX "live_sessions_status_lastPlaybackActivityAt_idx" ON "live_sessions"("status", "lastPlaybackActivityAt");
