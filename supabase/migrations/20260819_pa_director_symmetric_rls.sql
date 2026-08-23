-- Make PA_TO_DIRECTOR RLS symmetric with PA_TO_CI.
-- Both PA roles must rely solely on user_host_assignments (no position/role
-- fallback). This matches the server-side authorization in getAssignedHostEmployeeForPA
-- and the shared PA approval workflow.
--
-- Currently PA_TO_DIRECTOR has a SELECT policy that falls back to a hardcoded
-- "Director" user_role, and is missing an UPDATE policy entirely. This migration
-- replaces the SELECT policy with a pure assignment-based one and adds the
-- UPDATE policy so both PA roles have identical, assignment-scoped access.

-- Drop the current PA_TO_DIRECTOR SELECT policy (which used a Director-role fallback)
DROP POLICY IF EXISTS "PA_TO_DIRECTOR can view assigned Director visits" ON public.visits;

-- PA_TO_DIRECTOR can view visits for their assigned Director host (pure assignment)
CREATE POLICY "PA_TO_DIRECTOR can view assigned Director visits"
  ON public.visits
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'PA_TO_DIRECTOR'
    )
    AND employee_id IN (
      SELECT uha.employee_id FROM public.user_host_assignments uha
      WHERE uha.user_id = auth.uid()
    )
  );

-- PA_TO_DIRECTOR can update visits for their assigned Director host (mirror of PA_TO_CI)
DROP POLICY IF EXISTS "PA_TO_DIRECTOR can update assigned Director visits" ON public.visits;
CREATE POLICY "PA_TO_DIRECTOR can update assigned Director visits"
  ON public.visits
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'PA_TO_DIRECTOR'
    )
    AND employee_id IN (
      SELECT uha.employee_id FROM public.user_host_assignments uha
      WHERE uha.user_id = auth.uid()
    )
  );
