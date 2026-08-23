-- PA Role RBAC Policies
-- Restricts PA_TO_DIRECTOR and PA_TO_CI to their assigned host employees

-- ==================================================
-- VISITS
-- ==================================================

-- PA_TO_DIRECTOR can view visits for the Director
CREATE POLICY "PA_TO_DIRECTOR can view Director visits"
  ON public.visits
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'PA_TO_DIRECTOR'
    )
    AND employee_id = (
      SELECT e.id FROM public.employees e
      WHERE e.user_id = (
        SELECT user_id FROM public.user_roles WHERE role = 'Director' LIMIT 1
      )
      LIMIT 1
    )
  );

-- PA_TO_CI can view visits for the CI (Commandant)
CREATE POLICY "PA_TO_CI can view CI visits"
  ON public.visits
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'PA_TO_CI'
    )
    AND employee_id = (
      SELECT e.id FROM public.employees e
      WHERE e.user_id = (
        SELECT user_id FROM public.user_roles WHERE role = 'Commandant' LIMIT 1
      )
      LIMIT 1
    )
  );

-- ==================================================
-- VISITOR BADGES
-- ==================================================

-- PA_TO_DIRECTOR can view badges for Director visits
CREATE POLICY "PA_TO_DIRECTOR can view Director badges"
  ON public.visitor_badges
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'PA_TO_DIRECTOR'
    )
    AND visit_id IN (
      SELECT v.id FROM public.visits v
      WHERE v.employee_id = (
        SELECT e.id FROM public.employees e
        WHERE e.user_id = (
          SELECT user_id FROM public.user_roles WHERE role = 'Director' LIMIT 1
        )
        LIMIT 1
      )
    )
  );

-- PA_TO_CI can view badges for CI visits
CREATE POLICY "PA_TO_CI can view CI badges"
  ON public.visitor_badges
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'PA_TO_CI'
    )
    AND visit_id IN (
      SELECT v.id FROM public.visits v
      WHERE v.employee_id = (
        SELECT e.id FROM public.employees e
        WHERE e.user_id = (
          SELECT user_id FROM public.user_roles WHERE role = 'Commandant' LIMIT 1
        )
        LIMIT 1
      )
    )
  );

-- ==================================================
-- VISITOR DOCUMENTS
-- ==================================================

-- PA_TO_DIRECTOR can view documents for Director visitors
CREATE POLICY "PA_TO_DIRECTOR can view Director visitor documents"
  ON public.visitor_documents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'PA_TO_DIRECTOR'
    )
    AND visitor_id IN (
      SELECT v.visitor_id FROM public.visits v
      WHERE v.employee_id = (
        SELECT e.id FROM public.employees e
        WHERE e.user_id = (
          SELECT user_id FROM public.user_roles WHERE role = 'Director' LIMIT 1
        )
        LIMIT 1
      )
    )
  );

-- PA_TO_CI can view documents for CI visitors
CREATE POLICY "PA_TO_CI can view CI visitor documents"
  ON public.visitor_documents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'PA_TO_CI'
    )
    AND visitor_id IN (
      SELECT v.visitor_id FROM public.visits v
      WHERE v.employee_id = (
        SELECT e.id FROM public.employees e
        WHERE e.user_id = (
          SELECT user_id FROM public.user_roles WHERE role = 'Commandant' LIMIT 1
        )
        LIMIT 1
      )
    )
  );
