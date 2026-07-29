-- Migration: Expand visitors table schema
-- Date: 2026-07-29
-- Description: Add missing columns to visitors table only.
--              Does NOT modify departments, employees, office_locations, or positions.

-- =============================================================================
-- Add missing columns to visitors
-- =============================================================================

ALTER TABLE public.visitors
  ADD COLUMN IF NOT EXISTS visitor_address TEXT NULL,
  ADD COLUMN IF NOT EXISTS nationality TEXT NULL,
  ADD COLUMN IF NOT EXISTS gender TEXT NULL,
  ADD COLUMN IF NOT EXISTS vehicle_plate TEXT NULL,
  ADD COLUMN IF NOT EXISTS vehicle_type TEXT NULL,
  ADD COLUMN IF NOT EXISTS vehicle_make TEXT NULL,
  ADD COLUMN IF NOT EXISTS vehicle_model TEXT NULL,
  ADD COLUMN IF NOT EXISTS vehicle_color TEXT NULL,
  ADD COLUMN IF NOT EXISTS driver_name TEXT NULL,
  ADD COLUMN IF NOT EXISTS driver_phone TEXT NULL,
  ADD COLUMN IF NOT EXISTS parking_slot TEXT NULL,
  ADD COLUMN IF NOT EXISTS emergency_contact TEXT NULL,
  ADD COLUMN IF NOT EXISTS emergency_name TEXT NULL,
  ADD COLUMN IF NOT EXISTS emergency_relationship TEXT NULL,
  ADD COLUMN IF NOT EXISTS host_employee_id UUID NULL,
  ADD COLUMN IF NOT EXISTS purpose TEXT NULL,
  ADD COLUMN IF NOT EXISTS expected_duration INTEGER NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_by UUID NULL,
  ADD COLUMN IF NOT EXISTS visitor_type TEXT NULL DEFAULT 'Visitor',
  ADD COLUMN IF NOT EXISTS id_number TEXT NULL,
  ADD COLUMN IF NOT EXISTS id_verification BOOLEAN NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS doc_type TEXT NULL,
  ADD COLUMN IF NOT EXISTS doc_number TEXT NULL,
  ADD COLUMN IF NOT EXISTS issuing_country TEXT NULL,
  ADD COLUMN IF NOT EXISTS expiry_date TEXT NULL,
  ADD COLUMN IF NOT EXISTS doc_front_url TEXT NULL,
  ADD COLUMN IF NOT EXISTS doc_back_url TEXT NULL,
  ADD COLUMN IF NOT EXISTS doc_notes TEXT NULL,
  ADD COLUMN IF NOT EXISTS notes TEXT NULL;

-- =============================================================================
-- Foreign keys
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.visitors'::regclass
      AND conname = 'visitors_host_employee_id_fkey'
  ) THEN
    ALTER TABLE public.visitors
      ADD CONSTRAINT visitors_host_employee_id_fkey
      FOREIGN KEY (host_employee_id) REFERENCES public.employees(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.visitors'::regclass
      AND conname = 'visitors_created_by_fkey'
  ) THEN
    ALTER TABLE public.visitors
      ADD CONSTRAINT visitors_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- =============================================================================
-- Indexes
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_visitors_host_employee_id ON public.visitors(host_employee_id);
CREATE INDEX IF NOT EXISTS idx_visitors_created_by ON public.visitors(created_by);
CREATE INDEX IF NOT EXISTS idx_visitors_visitor_type ON public.visitors(visitor_type);
CREATE INDEX IF NOT EXISTS idx_visitors_email ON public.visitors(email);
CREATE INDEX IF NOT EXISTS idx_visitors_phone ON public.visitors(phone);
CREATE INDEX IF NOT EXISTS idx_visitors_visitor_organization ON public.visitors(visitor_organization);
CREATE INDEX IF NOT EXISTS idx_visitors_created_at ON public.visitors(created_at);

-- =============================================================================
-- RLS
-- =============================================================================

ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can insert visitors" ON public.visitors;
DROP POLICY IF EXISTS "Public can view own visits" ON public.visitors;
DROP POLICY IF EXISTS "Authenticated users can view visitors" ON public.visitors;
DROP POLICY IF EXISTS "Authenticated users can update visitors" ON public.visitors;
DROP POLICY IF EXISTS "Authenticated users can delete visitors" ON public.visitors;

CREATE POLICY "Public can insert visitors"
  ON public.visitors
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Public can view own visits"
  ON public.visitors
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can view visitors"
  ON public.visitors
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update visitors"
  ON public.visitors
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete visitors"
  ON public.visitors
  FOR DELETE
  TO authenticated
  USING (true);

-- =============================================================================
-- Backfill visitor_type from visits for analytics compatibility
-- =============================================================================

UPDATE public.visitors v
SET visitor_type = COALESCE(
  (SELECT visits.visitor_type FROM public.visits WHERE visits.visitor_id = v.id LIMIT 1),
  'Visitor'
)
WHERE v.visitor_type IS NULL;
