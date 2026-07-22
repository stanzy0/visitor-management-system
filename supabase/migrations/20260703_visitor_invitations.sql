-- Visitor Pre-Registration Portal
CREATE TABLE IF NOT EXISTS public.visitor_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_token TEXT NOT NULL UNIQUE,
  host_employee_id UUID NOT NULL REFERENCES public.employees(id),
  visitor_email TEXT NOT NULL,
  visitor_name TEXT NOT NULL,
  visitor_phone TEXT,
  visitor_organization TEXT,
  purpose TEXT NOT NULL,
  expected_date DATE NOT NULL,
  expected_time TIME,
  vehicle_required BOOLEAN NOT NULL DEFAULT false,
  number_of_visitors INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  appointment_id UUID REFERENCES public.appointments(id),
  badge_id UUID REFERENCES public.visitor_badges(id),
  status TEXT NOT NULL DEFAULT 'Pending',
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days',
  registration_completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.user_roles(user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visitor_invitations_token ON public.visitor_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_visitor_invitations_host ON public.visitor_invitations(host_employee_id);
CREATE INDEX IF NOT EXISTS idx_visitor_invitations_status ON public.visitor_invitations(status);
CREATE INDEX IF NOT EXISTS idx_visitor_invitations_email ON public.visitor_invitations(visitor_email);
CREATE INDEX IF NOT EXISTS idx_visitor_invitations_date ON public.visitor_invitations(expected_date);

CREATE OR REPLACE FUNCTION update_visitor_invitations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_visitor_invitations_updated_at_trigger ON public.visitor_invitations;
CREATE TRIGGER update_visitor_invitations_updated_at_trigger
  BEFORE UPDATE ON public.visitor_invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_visitor_invitations_updated_at();

ALTER TABLE public.visitor_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage invitations"
  ON public.visitor_invitations
  FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM public.user_roles WHERE user_id = (SELECT auth.uid())) = 'Admin'
  )
  WITH CHECK (
    (SELECT role FROM public.user_roles WHERE user_id = (SELECT auth.uid())) = 'Admin'
  );

CREATE POLICY "Host Employee can manage own invitations"
  ON public.visitor_invitations
  FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM public.user_roles WHERE user_id = (SELECT auth.uid())) = 'Host Employee'
    AND host_employee_id = (SELECT id FROM public.employees WHERE user_id = (SELECT auth.uid()))
  )
  WITH CHECK (
    (SELECT role FROM public.user_roles WHERE user_id = (SELECT auth.uid())) = 'Host Employee'
    AND host_employee_id = (SELECT id FROM public.employees WHERE user_id = (SELECT auth.uid()))
  );

CREATE POLICY "Receptionist can view invitations"
  ON public.visitor_invitations
  FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM public.user_roles WHERE user_id = (SELECT auth.uid())) IN ('Receptionist', 'Admin')
  );

CREATE POLICY "Security can view invitations"
  ON public.visitor_invitations
  FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM public.user_roles WHERE user_id = (SELECT auth.uid())) IN ('Security', 'Admin')
  );

ALTER TABLE public.visitor_invitations REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.visitor_invitations;
