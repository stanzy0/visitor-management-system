-- Migration: Add department logo to branding settings
-- Date: 2026-08-23
-- Description: Adds department_logo_url to support dual-logo branding for DLW and AFCSC

ALTER TABLE branding_settings
  ADD COLUMN IF NOT EXISTS department_logo_url TEXT;
