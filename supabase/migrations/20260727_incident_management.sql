-- Incident Management & Command Center
CREATE TABLE IF NOT EXISTS public.incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_number TEXT NOT NULL UNIQUE DEFAULT ('INC-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0')),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'Other',
  severity TEXT NOT NULL DEFAULT 'Medium',
  status TEXT NOT NULL DEFAULT 'Open',
  visitor_id UUID REFERENCES public.visitors(id) ON DELETE SET NULL,
  visit_id UUID REFERENCES public.visits(id) ON DELETE SET NULL,
  employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  reported_by UUID REFERENCES public.user_roles(user_id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES public.user_roles(user_id) ON DELETE SET NULL,
  location TEXT,
  resolved_at TIMESTAMPTZ,
  resolution TEXT,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_incidents_number ON public.incidents(incident_number);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON public.incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON public.incidents(severity);
CREATE INDEX IF NOT EXISTS idx_incidents_category ON public.incidents(category);
CREATE INDEX IF NOT EXISTS idx_incidents_visitor_id ON public.incidents(visitor_id);
CREATE INDEX IF NOT EXISTS idx_incidents_visit_id ON public.incidents(visit_id);
CREATE INDEX IF NOT EXISTS idx_incidents_assigned_to ON public.incidents(assigned_to);
CREATE INDEX IF NOT EXISTS idx_incidents_created_at ON public.incidents(created_at);

CREATE OR REPLACE FUNCTION update_incidents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_incidents_updated_at ON public.incidents;

CREATE TRIGGER trigger_update_incidents_updated_at
  BEFORE UPDATE ON public.incidents
  FOR EACH ROW
  EXECUTE FUNCTION update_incidents_updated_at();

ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and Security can manage incidents"
  ON public.incidents
  FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM public.user_roles WHERE user_id = (SELECT auth.uid())) IN ('Admin', 'Security', 'Operations', 'Commandant')
  )
  WITH CHECK (
    (SELECT role FROM public.user_roles WHERE user_id = (SELECT auth.uid())) IN ('Admin', 'Security', 'Operations', 'Commandant')
  );

CREATE POLICY "Reception can create incidents"
  ON public.incidents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT role FROM public.user_roles WHERE user_id = (SELECT auth.uid())) = 'Receptionist'
  );

ALTER TABLE public.incidents REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.incidents;

-- Incident Timeline
CREATE TABLE IF NOT EXISTS public.incident_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  performed_by UUID REFERENCES public.user_roles(user_id) ON DELETE SET NULL,
  performed_by_name TEXT,
  performed_by_role TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_incident_timeline_incident_id ON public.incident_timeline(incident_id);
CREATE INDEX IF NOT EXISTS idx_incident_timeline_created_at ON public.incident_timeline(created_at);
CREATE INDEX IF NOT EXISTS idx_incident_timeline_action ON public.incident_timeline(action);

ALTER TABLE public.incident_timeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reception can read and insert timeline"
  ON public.incident_timeline
  FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM public.user_roles WHERE user_id = (SELECT auth.uid())) IN ('Admin', 'Security', 'Operations', 'Receptionist', 'Commandant')
  );

CREATE POLICY "Reception can insert timeline"
  ON public.incident_timeline
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT role FROM public.user_roles WHERE user_id = (SELECT auth.uid())) IN ('Admin', 'Security', 'Operations', 'Receptionist')
  );

CREATE POLICY "Security and Operations can update timeline"
  ON public.incident_timeline
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT role FROM public.user_roles WHERE user_id = (SELECT auth.uid())) IN ('Admin', 'Security', 'Operations')
  )
  WITH CHECK (
    (SELECT role FROM public.user_roles WHERE user_id = (SELECT auth.uid())) IN ('Admin', 'Security', 'Operations')
  );

CREATE POLICY "Admin can delete timeline"
  ON public.incident_timeline
  FOR DELETE
  TO authenticated
  USING (
    (SELECT role FROM public.user_roles WHERE user_id = (SELECT auth.uid())) = 'Admin'
  );

CREATE OR REPLACE FUNCTION update_incidents_updated_at_from_timeline()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.incidents
  SET updated_at = NOW()
  WHERE id = NEW.incident_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_incidents_updated_at_from_timeline ON public.incident_timeline;

CREATE TRIGGER trigger_update_incidents_updated_at_from_timeline
  AFTER INSERT ON public.incident_timeline
  FOR EACH ROW
  EXECUTE FUNCTION update_incidents_updated_at_from_timeline();

ALTER TABLE public.incident_timeline REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.incident_timeline;
