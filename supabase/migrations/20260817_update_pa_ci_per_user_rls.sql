-- Per-PA-to-CI Assignment RLS Policies
-- Replaces the old hardcoded 20260817_pa_role_rls_policies.sql with per-user host assignment based access
-- This ensures each PA_TO_CI user only sees their assigned CI's visitors

-- ==================================================
-- Drop old hardcoded policies (from 20260817_pa_role_rls_policies.sql)
-- ==================================================

-- Drop old VISITS policies
DROP POLICY IF EXISTS "PA_TO_DIRECTOR can view Director visits" ON public.visits;
DROP POLICY IF EXISTS "PA_TO_CI can view CI visits" ON public.visits;

-- Drop old VISITOR_BADGES policies
DROP POLICY IF EXISTS "PA_TO_DIRECTOR can view Director badges" ON public.visitor_badges;
DROP POLICY IF EXISTS "PA_TO_CI can view CI badges" ON public.visitor_badges;

-- Drop old VISITOR_DOCUMENTS policies
DROP POLICY IF EXISTS "PA_TO_DIRECTOR can view Director visitor documents" ON public.visitor_documents;
DROP POLICY IF EXISTS "PA_TO_CI can view CI visitor documents" ON public.visitor_documents;

-- ==================================================
-- VISITS: Per-user PA access via user_host_assignments
-- ==================================================

-- PA_TO_DIRECTOR can view visits for their assigned host (fallback: Director employee)
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

-- ==================================================
-- VISITOR_BADGES: Per-user PA access via user_host_assignments
-- ==================================================

-- PA_TO_CI can view badges for their assigned CI's visits
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

-- ==================================================
-- VISITOR_DOCUMENTS: Per-user PA access via user_host_assignments
-- ==================================================

-- PA_TO_CI can view documents for their assigned CI's visitors only
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
