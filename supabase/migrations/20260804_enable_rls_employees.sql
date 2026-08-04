-- Migration: Enable RLS on employees table
-- Date: 2026-08-04
-- Description: Enable Row Level Security on employees table and create role-based policies.

-- =============================================================================
-- Enable RLS
-- =============================================================================

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- Policies
-- =============================================================================

-- Admin can manage all employees
CREATE POLICY "Admin can manage employees"
  ON public.employees
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'Admin'
    )
  );

-- Receptionist can view and update employees (for check-in/check-out)
CREATE POLICY "Receptionist can view and update employees"
  ON public.employees
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('Admin', 'Receptionist')
    )
  );

CREATE POLICY "Receptionist can update employees"
  ON public.employees
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('Admin', 'Receptionist')
    )
  );

-- Security can view employees (for security checks)
CREATE POLICY "Security can view employees"
  ON public.employees
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('Admin', 'Security', 'Receptionist')
    )
  );

-- Host employees can view their own profile
CREATE POLICY "Employees can view own profile"
  ON public.employees
  FOR SELECT
  USING (
    user_id = auth.uid()
  );

-- Service role bypasses RLS (implicit in Supabase)
-- No policy needed for service_role - it bypasses RLS by default
