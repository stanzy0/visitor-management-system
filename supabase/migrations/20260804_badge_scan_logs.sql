-- Migration: Create badge_scan_logs table for QR verification audit trail

CREATE TABLE IF NOT EXISTS badge_scan_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  badge_id UUID NOT NULL REFERENCES visitor_badges(id) ON DELETE CASCADE,
  visit_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  qr_token TEXT NOT NULL,
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  scanned_by UUID,
  scanner_name TEXT,
  device_name TEXT,
  ip_address TEXT,
  user_agent TEXT,
  location TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  verification_result TEXT NOT NULL DEFAULT 'VALID',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_badge_scan_logs_qr_token ON badge_scan_logs(qr_token);
CREATE INDEX IF NOT EXISTS idx_badge_scan_logs_badge_id ON badge_scan_logs(badge_id);
CREATE INDEX IF NOT EXISTS idx_badge_scan_logs_scanned_at ON badge_scan_logs(scanned_at DESC);
