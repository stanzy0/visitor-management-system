-- Migration: Add is_pre_arranged to visits table
-- Date: 2026-08-28
-- Description: Add is_pre_arranged boolean column to visits table

ALTER TABLE public.visits
  ADD COLUMN IF NOT EXISTS is_pre_arranged BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_visits_is_pre_arranged ON public.visits(is_pre_arranged);
