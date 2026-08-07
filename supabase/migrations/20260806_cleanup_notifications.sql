-- Migration: Clean up notifications table
-- Date: 2026-08-06
-- Description: Drop INSERT policy and add composite deduplication index

DROP POLICY IF EXISTS "Authenticated users can create notifications" ON notifications;

CREATE INDEX IF NOT EXISTS idx_notifications_dedup
  ON notifications (title, message, related_type, related_id, user_id, recipient_role, created_at);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_role ON notifications (recipient_role);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications (created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications (is_read);