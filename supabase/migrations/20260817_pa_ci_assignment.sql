-- PA-to-CI Assignment Migration (v2 - SQL Editor Safe)
-- Adds user_host_assignments table to assign each PA_TO_CI user to one specific CI/host employee
-- This enables per-CI isolation so PA users only see their assigned CI's visitors

-- =============================================================================
-- Check if table already exists before creating
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_host_assignments') THEN

    CREATE TABLE public.user_host_assignments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      created_by UUID REFERENCES public.user_roles(user_id)
    );

    -- One PA user can only have one active host assignment
    CREATE UNIQUE INDEX idx_user_host_assignments_user_id
      ON public.user_host_assignments(user_id)
      WHERE user_id IS NOT NULL;

    -- Indexes for efficient lookups
    CREATE INDEX idx_user_host_assignments_employee_id
      ON public.user_host_assignments(employee_id);

    CREATE INDEX idx_user_host_assignments_user_employee
      ON public.user_host_assignments(user_id, employee_id);

    -- Enable RLS
    ALTER TABLE public.user_host_assignments ENABLE ROW LEVEL SECURITY;

    RAISE NOTICE 'Table user_host_assignments created';
  ELSE
    RAISE NOTICE 'Table user_host_assignments already exists - skipping creation';
  END IF;
END $$;

-- =============================================================================
-- RLS Policies for user_host_assignments
-- =============================================================================

-- Drop existing policies (if they exist from a prior run)
DROP POLICY IF EXISTS "Admin can manage user_host_assignments" ON public.user_host_assignments;
DROP POLICY IF EXISTS "Authenticated users can view their own assignment" ON public.user_host_assignments;

-- Only Admin can manage host assignments
CREATE POLICY "Admin can manage user_host_assignments"
  ON public.user_host_assignments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'Admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'Admin'
    )
  );

-- Admins can view all assignments; users can view their own assignment
CREATE POLICY "Authenticated users can view their own assignment"
  ON public.user_host_assignments
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'Admin'
    )
  );

-- =============================================================================
-- Enable realtime (safe - only if table exists and publication supports it)
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_host_assignments') THEN
    ALTER TABLE public.user_host_assignments REPLICA IDENTITY FULL;
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.user_host_assignments;
    END IF;
  END IF;
END $$;

-- =============================================================================
-- Drop old hardcoded PA policies (from 20260817_pa_role_rls_policies.sql)
-- =============================================================================

-- Drop old VISITS policies
DROP POLICY IF EXISTS "PA_TO_DIRECTOR can view Director visits" ON public.visits;
DROP POLICY IF EXISTS "PA_TO_CI can view CI visits" ON public.visits;

-- Drop old VISITOR_BADGES policies
DROP POLICY IF EXISTS "PA_TO_DIRECTOR can view Director badges" ON public.visitor_badges;
DROP POLICY IF EXISTS "PA_TO_CI can view CI badges" ON public.visitor_badges;

-- Drop old VISITOR_DOCUMENTS policies
DROP POLICY IF EXISTS "PA_TO_DIRECTOR can view Director visitor documents" ON public.visitor_documents;
DROP POLICY IF EXISTS "PA_TO_CI can view CI visitor documents" ON public.visitor_documents;

-- =============================================================================
-- Per-PA-to-CI Assignment RLS Policies for VISITS
-- =============================================================================

-- PA_TO_CI can view visits for their assigned CI host
CREATE POLICY "PA_TO_CI can view assigned CI visits"
  ON public.visits
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'PA_TO_CI'
    )
    AND employee_id IN (
      SELECT uha.employee_id FROM public.user_host_assignments uha
      WHERE uha.user_id = auth.uid()
    )
  );

-- PA_TO_CI can update visits for their assigned CI host (for check-in/check-out)
CREATE POLICY "PA_TO_CI can update assigned CI visits"
  ON public.visits
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'PA_TO_CI'
    )
    AND employee_id IN (
      SELECT uha.employee_id FROM public.user_host_assignments uha
      WHERE uha.user_id = auth.uid()
    )
  );

-- PA_TO_DIRECTOR can view visits for their assigned host (with fallback to Director employee)
DROP POLICY IF EXISTS "PA_TO_DIRECTOR can view assigned Director visits" ON public.visits;
CREATE POLICY "PA_TO_DIRECTOR can view assigned Director visits"
  ON public.visits
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'PA_TO_DIRECTOR'
    )
    AND (
      employee_id IN (
        SELECT uha.employee_id FROM public.user_host_assignments uha
        WHERE uha.user_id = auth.uid()
      )
      OR (
        NOT EXISTS (
          SELECT 1 FROM public.user_host_assignments uha
          WHERE uha.user_id = auth.uid()
        )
        AND employee_id = (
          SELECT e.id FROM public.employees e
          WHERE e.user_id = (
            SELECT user_id FROM public.user_roles WHERE role = 'Director' LIMIT 1
          )
          LIMIT 1
        )
      )
    )
  );

-- =============================================================================
-- Per-PA-to-CI Assignment RLS Policies for VISITOR_BADGES
-- =============================================================================

-- PA_TO_CI can view badges for their assigned CI's visits
DROP POLICY IF EXISTS "PA_TO_CI can view assigned CI badges" ON public.visitor_badges;
CREATE POLICY "PA_TO_CI can view assigned CI badges"
  ON public.visitor_badges
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'PA_TO_CI'
    )
    AND visit_id IN (
      SELECT v.id FROM public.visits v
      WHERE v.employee_id IN (
        SELECT uha.employee_id FROM public.user_host_assignments uha
        WHERE uha.user_id = auth.uid()
      )
    )
  );

-- PA_TO_DIRECTOR can view badges for their assigned Director's visits
DROP POLICY IF EXISTS "PA_TO_DIRECTOR can view assigned Director badges" ON public.visitor_badges;
CREATE POLICY "PA_TO_DIRECTOR can view assigned Director badges"
  ON public.visitor_badges
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'PA_TO_DIRECTOR'
    )
    AND visit_id IN (
      SELECT v.id FROM public.visits v
      WHERE v.employee_id IN (
        SELECT uha.employee_id FROM public.user_host_assignments uha
        WHERE uha.user_id = auth.uid()
      )
    )
  );

-- =============================================================================
-- Per-PA-to-CI Assignment RLS Policies for VISITOR_DOCUMENTS
-- =============================================================================

-- PA_TO_CI can view documents for their assigned CI's visitors only
DROP POLICY IF EXISTS "PA_TO_CI can view assigned CI visitor documents" ON public.visitor_documents;
CREATE POLICY "PA_TO_CI can view assigned CI visitor documents"
  ON public.visitor_documents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'PA_TO_CI'
    )
    AND visitor_id IN (
      SELECT v.visitor_id FROM public.visits v
      WHERE v.employee_id IN (
        SELECT uha.employee_id FROM public.user_host_assignments uha
        WHERE uha.user_id = auth.uid()
      )
    )
  );

-- PA_TO_DIRECTOR can view documents for their assigned Director's visitors
DROP POLICY IF EXISTS "PA_TO_DIRECTOR can view assigned Director visitor documents" ON public.visitor_documents;
CREATE POLICY "PA_TO_DIRECTOR can view assigned Director visitor documents"
  ON public.visitor_documents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'PA_TO_DIRECTOR'
    )
    AND visitor_id IN (
      SELECT v.visitor_id FROM public.visits v
      WHERE v.employee_id IN (
        SELECT uha.employee_id FROM public.user_host_assignments uha
        WHERE uha.user_id = auth.uid()
      )
    )
  );
