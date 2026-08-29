-- Migration: Add PA approval comment columns
-- Date: 2026-08-28
-- Description: Add columns to track PA to Director and PA to CI approval comments

ALTER TABLE public.visits
  ADD COLUMN IF NOT EXISTS pa_director_approved_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS pa_director_approved_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pa_director_comment TEXT NULL,
  ADD COLUMN IF NOT EXISTS pa_ci_approved_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS pa_ci_approved_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pa_ci_comment TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_visits_pa_director_approved_at ON public.visits(pa_director_approved_at);
CREATE INDEX IF NOT EXISTS idx_visits_pa_ci_approved_at ON public.visits(pa_ci_approved_at);
