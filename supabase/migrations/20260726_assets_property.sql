-- Assets & Property Management
CREATE TABLE IF NOT EXISTS public.property_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_number TEXT NOT NULL UNIQUE,
  visit_id UUID REFERENCES public.visits(id) ON DELETE CASCADE,
  visitor_id UUID NOT NULL,
  employee_id UUID NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  brand TEXT,
  model TEXT,
  serial_number TEXT,
  color TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  condition TEXT NOT NULL DEFAULT 'Good',
  photo_url TEXT,
  remarks TEXT,
  status TEXT NOT NULL DEFAULT 'Pending Entry',
  confiscated BOOLEAN NOT NULL DEFAULT FALSE,
  confiscated_at TIMESTAMPTZ,
  confiscated_by UUID REFERENCES public.user_roles(user_id),
  confiscated_reason TEXT,
  expected_release_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ,
  released_by UUID REFERENCES public.user_roles(user_id),
  released_to TEXT,
  signature_url TEXT,
  qr_token TEXT NOT NULL UNIQUE,
  created_by UUID REFERENCES public.user_roles(user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_property_items_visit_id ON public.property_items(visit_id);
CREATE INDEX IF NOT EXISTS idx_property_items_visitor_id ON public.property_items(visitor_id);
CREATE INDEX IF NOT EXISTS idx_property_items_employee_id ON public.property_items(employee_id);
CREATE INDEX IF NOT EXISTS idx_property_items_status ON public.property_items(status);
CREATE INDEX IF NOT EXISTS idx_property_items_qr_token ON public.property_items(qr_token);
CREATE INDEX IF NOT EXISTS idx_property_items_property_number ON public.property_items(property_number);

CREATE TABLE IF NOT EXISTS public.property_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES public.property_items(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  old_status TEXT,
  new_status TEXT,
  performed_by UUID REFERENCES public.user_roles(user_id),
  reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_property_history_property_id ON public.property_history(property_id);
CREATE INDEX IF NOT EXISTS idx_property_history_action ON public.property_history(action);
CREATE INDEX IF NOT EXISTS idx_property_history_created_at ON public.property_history(created_at);

CREATE OR REPLACE FUNCTION update_property_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_property_items_updated_at ON public.property_items;

CREATE TRIGGER trigger_update_property_items_updated_at
  BEFORE UPDATE ON public.property_items
  FOR EACH ROW
  EXECUTE FUNCTION update_property_items_updated_at();

ALTER TABLE public.property_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage property items"
  ON public.property_items
  FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM public.user_roles WHERE user_id = (SELECT auth.uid())) = 'Admin'
  )
  WITH CHECK (
    (SELECT role FROM public.user_roles WHERE user_id = (SELECT auth.uid())) = 'Admin'
  );

CREATE POLICY "Receptionist can manage property items"
  ON public.property_items
  FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM public.user_roles WHERE user_id = (SELECT auth.uid())) IN ('Receptionist', 'Admin')
  )
  WITH CHECK (
    (SELECT role FROM public.user_roles WHERE user_id = (SELECT auth.uid())) IN ('Receptionist', 'Admin')
  );

CREATE POLICY "Security can view and update property items"
  ON public.property_items
  FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM public.user_roles WHERE user_id = (SELECT auth.uid())) IN ('Security', 'Admin')
  );

CREATE POLICY "Security can update property items"
  ON public.property_items
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT role FROM public.user_roles WHERE user_id = (SELECT auth.uid())) IN ('Security', 'Admin')
  );

CREATE POLICY "Host can view own property items"
  ON public.property_items
  FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM public.user_roles WHERE user_id = (SELECT auth.uid())) = 'Host Employee'
    AND employee_id = (SELECT employee_id FROM public.user_roles WHERE user_id = (SELECT auth.uid()))
  );

ALTER TABLE public.property_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view property history"
  ON public.property_history
  FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM public.user_roles WHERE user_id = (SELECT auth.uid())) IN ('Admin', 'Receptionist', 'Security')
  );

CREATE POLICY "System can insert property history"
  ON public.property_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT role FROM public.user_roles WHERE user_id = (SELECT auth.uid())) IN ('Admin', 'Receptionist', 'Security')
  );

ALTER TABLE public.property_items REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.property_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.property_history;
