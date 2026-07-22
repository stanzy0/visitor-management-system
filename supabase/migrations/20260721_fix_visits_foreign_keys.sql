-- Migration: Fix visits table foreign key relationships
-- Purpose: Ensure Supabase relationship aliases return objects instead of arrays
-- Date: 2026-07-21

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.visits'::regclass
    AND conname = 'visits_visitor_id_fkey'
  ) THEN
    ALTER TABLE public.visits
    ADD CONSTRAINT visits_visitor_id_fkey
    FOREIGN KEY (visitor_id) REFERENCES public.visitors(id) ON DELETE CASCADE;
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.visits'::regclass
    AND conname = 'visits_employee_id_fkey'
  ) THEN
    ALTER TABLE public.visits
    ADD CONSTRAINT visits_employee_id_fkey
    FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;
  END IF;
END;
$$;
