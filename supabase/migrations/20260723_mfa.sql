-- Multi-Factor Authentication (MFA) migration
-- Run this in the Supabase SQL Editor

ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS two_factor_secret TEXT,
  ADD COLUMN IF NOT EXISTS two_factor_enabled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS backup_codes JSONB;

CREATE INDEX IF NOT EXISTS idx_user_roles_two_factor_enabled ON public.user_roles(two_factor_enabled);
