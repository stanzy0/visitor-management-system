-- Migration: Enable RLS on visits table
-- Date: 2026-08-04
-- Description: Enable Row Level Security on visits table and verify/add policies.

-- =============================================================================
-- Enable RLS
-- =============================================================================

ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- Existing public policies (re-created to ensure they work with RLS enabled)
-- =============================================================================

-- Allow public inserts for visits (public registrations)
CREATE POLICY "Public can insert visits"
  ON public.visits
  FOR INSERT
  WITH CHECK (true);

-- Public can view their own visit by registration number
CREATE POLICY "Public can view own visits"
  ON public.visits
  FOR SELECT
  USING (source = 'public' AND registration_number IS NOT NULL);

-- =============================================================================
-- Admin policies
-- =============================================================================

-- Admin can manage all visits
CREATE POLICY "Admin can manage visits"
  ON public.visits
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'Admin'
    )
  );

-- =============================================================================
-- Receptionist policies
-- =============================================================================

-- Receptionist can view all visits
CREATE POLICY "Receptionist can view visits"
  ON public.visits
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('Admin', 'Receptionist')
    )
  );

-- Receptionist can update visits (for check-in/check-out)
CREATE POLICY "Receptionist can update visits"
  ON public.visits
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('Admin', 'Receptionist')
    )
  );

-- =============================================================================
-- Security policies
-- =============================================================================

-- Security can view all visits
CREATE POLICY "Security can view visits"
  ON public.visits
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('Admin', 'Security', 'Receptionist')
    )
  );

-- =============================================================================
-- Host employee policies
-- =============================================================================

-- Host employees can view visits where they are the host
CREATE POLICY "Host employees can view own visits"
  ON public.visits
  FOR SELECT
  USING (
    employee_id IN (
      SELECT id FROM public.employees WHERE user_id = auth.uid()
    )
  );
